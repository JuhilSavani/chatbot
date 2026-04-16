import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Square, X, FileText, Loader2, ChevronDown, Check } from 'lucide-react';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { uploadPdfToCloudinary } from '../actions/upload.actions';

const MAX_PDFS = 5;
const MAX_TOKENS = 32768;
const MODEL_OPTIONS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o-mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
];
const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;

const ChatInput = ({ threadId, onMessageSent, loading, onStop, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const isInputLocked = disabled || isSending;
  
  // Each entry: { id, file, text, status: 'verifying' | 'done' | 'error', tokenCount, error }
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const modelSelectorRef = useRef(null);
  const inputContainerRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Reset isSending once the parent's loading (streaming) kicks in
  useEffect(() => {
    if (loading) setIsSending(false);
  }, [loading]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!modelSelectorRef.current?.contains(event.target)) {
        setIsModelMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isInputLocked) return;

    setIsModelMenuOpen(false);
    setIsDragging(false);

    const activeElement = document.activeElement;
    if (
      inputContainerRef.current &&
      activeElement instanceof HTMLElement &&
      inputContainerRef.current.contains(activeElement)
    ) {
      activeElement.blur();
    }
  }, [isInputLocked]);

  const updateAttachment = (id, updates) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const processSinglePdf = async (file, id) => {
    try {
      // 1. Extract text
      const fileBuffer = await file.arrayBuffer();
      console.log(`[ChatInput] Processing "${file.name}" (${fileBuffer.byteLength} bytes)`);

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
      const pdfDocument = await loadingTask.promise;
      console.log(`[ChatInput] "${file.name}" loaded. Pages: ${pdfDocument.numPages}`);

      let fullText = '';
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      console.log(`[ChatInput] "${file.name}" text extracted. Length: ${fullText.length}`);

      // 2. Count tokens in web worker

      const tokenCount = await new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/countTokensWorker.js', import.meta.url),
          { type: 'module' }
        );
        worker.onerror = (err) => {
          worker.terminate();
          reject(new Error('Token counting worker failed.'));
        };
        worker.onmessage = (e) => {
          worker.terminate();
          if (e.data.success) {
            resolve(e.data.tokenCount);
          } else {
            reject(new Error(e.data.error || 'Token counting failed'));
          }
        };
        worker.postMessage({ text: fullText });
      });

      console.log(`[ChatInput] "${file.name}" token count: ${tokenCount}`);

      // 3. Check token limit
      if (tokenCount > MAX_TOKENS) {
        console.error(`Rejected "${file.name}" due to token limit`);
        setAttachments(prev => prev.filter(a => a.id !== id));
        setError(`"${file.name}" exceeds the token limit (${tokenCount.toLocaleString()} / ${MAX_TOKENS.toLocaleString()} tokens).`);
      } else {
        console.log(`"${file.name}" done`);
        updateAttachment(id, { status: 'done', text: fullText, tokenCount });
      }
    } catch (err) {
      console.error(`[ChatInput] Error processing "${file.name}":`, err);
      updateAttachment(id, { status: 'error', error: err.message });
    }
  };

  const processPdfFiles = (files) => {
    if (isInputLocked) return;

    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      setError('Only PDF files are supported.');
      return;
    }

    const remainingSlots = MAX_PDFS - attachments.length;
    if (remainingSlots <= 0) {
      setError(`Maximum of ${MAX_PDFS} PDFs allowed per message.`);
      return;
    }

    const filesToProcess = pdfFiles.slice(0, remainingSlots);
    if (pdfFiles.length > remainingSlots) {
      setError(`Only ${remainingSlots} more PDF(s) can be added. ${pdfFiles.length - remainingSlots} file(s) were skipped.`);
    } else {
      setError(null);
    }

    // Create entries for all files
    const newEntries = filesToProcess.map(file => ({
      id: crypto.randomUUID(),
      file,
      text: '',
      status: 'verifying',
      tokenCount: 0,
      error: null,
    }));

    setAttachments(prev => [...prev, ...newEntries]);

    // Process all concurrently
    newEntries.forEach(entry => {
      processSinglePdf(entry.file, entry.id);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isInputLocked) return;

    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (isInputLocked) return;

    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isInputLocked) return;

    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processPdfFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e) => {
    if (isInputLocked) return;

    if (e.target.files && e.target.files.length > 0) {
      processPdfFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const clearAllAttachments = () => {
    setAttachments([]);
  };

  const doneAttachments = attachments.filter(a => a.status === 'done');
  const isBusy = attachments.some(a => a.status === 'verifying');
  const selectedModel = MODEL_OPTIONS.find(option => option.id === selectedModelId) || MODEL_OPTIONS[0];

  const handleSendMessage = async () => {
    if (!message.trim() || loading || isInputLocked || !threadId) return;

    const userMessage = message.trim();
    setError(null);
    setIsSending(true);

    // If there are attachments, upload them to Cloudinary first
    if (doneAttachments.length > 0) {
      try {

        const uploadResults = await Promise.all(
          doneAttachments.map(async (att) => {
            console.log(`[ChatInput] Uploading "${att.file.name}" to Cloudinary...`);
            const result = await uploadPdfToCloudinary(att.file);
            console.log(`[ChatInput] Upload complete for "${att.file.name}"`);
            return result;
          })
        );
        console.log('[ChatInput] All uploads complete');

        const attachmentUrls = uploadResults.map((r, i) => ({
          public_id: r.public_id,
          name: r.original_filename,
          tokenCount: doneAttachments[i].tokenCount || 0,
        }));

        setMessage('');
        onMessageSent({
          message: userMessage,
          selectedModel: selectedModelId,
          attachments: attachmentUrls,
        });
        clearAllAttachments();
        return;
      } catch (err) {
        console.error('[ChatInput] Failed to process PDFs:', err);
        setError('Failed to process PDF: ' + err.message);
        setIsSending(false);
        return;
      }
    }

    setMessage('');
    onMessageSent({ 
      message: userMessage, 
      selectedModel: selectedModelId,
    });
    
    clearAllAttachments();
  };

  const handleKeyDown = (e) => {
    if (isInputLocked) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {error && (
        <div className="mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {/* Main Input Container */}
      <div 
        ref={inputContainerRef}
        className={`w-full max-w-4xl bg-[#18181b]/50 backdrop-blur-xl rounded-2xl p-3 md:p-4 border relative flex flex-col min-h-32 transition-all duration-200 z-10 group focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.8)] ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/5'} ${disabled ? 'opacity-60' : ''}`}
        aria-disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {disabled && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-20 rounded-2xl cursor-not-allowed bg-transparent"
          />
        )}

        {/* Hidden File Input */}
        <input
          type="file"
          accept="application/pdf"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Attachments UI */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map(att => (
              <div 
                key={att.id}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${
                  att.status === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-white/10 border-white/10 text-white'
                }`}
              >
                {att.status === 'verifying' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-[#a1a1aa] truncate max-w-[80px]">
                      Verifying... {att.file.name}
                    </span>
                  </>
                ) : att.status === 'error' ? (
                  <>
                    <FileText className="w-4 h-4 text-red-400" />
                    <span className="truncate max-w-[80px]" title={att.error}>{att.file.name}</span>
                    <button 
                      onClick={() => removeAttachment(att.id)}
                      className="p-0.5 hover:bg-white/20 rounded-full transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                    </button>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="truncate max-w-[80px]">{att.file.name}</span>
                    <button 
                      onClick={() => removeAttachment(att.id)}
                      className="p-0.5 hover:bg-white/20 rounded-full transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <div className="grow mb-2">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-[#fafafa] text-[16px] leading-relaxed placeholder-[#52525b] resize-none outline-none overflow-hidden min-h-10 md:min-h-14 px-2 py-1 font-normal font-sans"
            placeholder="Send a message to Sidekick..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputLocked}
            rows={1}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-end justify-between pt-2 px-1 border-t border-white/5 mt-2">
          
          {/* Left Side: Model Selector, Search, Attachment */}
          <div className="flex items-center gap-2">
            
            {/* Model Selector */}
            <div className="relative" ref={modelSelectorRef}>
              <button
                type="button"
                onClick={() => setIsModelMenuOpen(prev => !prev)}
                disabled={isInputLocked}
                className={`flex items-center rounded-md border border-white/10 bg-white/5 p-1 transition-all duration-200 hover:bg-white/10`}
              >
                <span className="px-2 text-[10px] font-semibold tracking-[0.18em] text-[#a1a1aa]">MODEL</span>
                <span className="flex items-center gap-1.5 rounded-md bg-[#09090b] px-2.5 py-1 text-xs text-[#fafafa] min-w-[120px] justify-between">
                  <span>{selectedModel.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {isModelMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 z-30 min-w-[190px] rounded-xl border border-white/20 bg-[#18181b]/95 p-1.5 shadow-[0_15px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  {MODEL_OPTIONS.map(option => {
                    const isSelected = option.id === selectedModelId;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedModelId(option.id);
                          setIsModelMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-1 mb-1.25 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'text-[#d4d4d8] hover:bg-white/5'}`}
                      >
                        <span className="w-4 flex justify-center">
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-0.25 bg-white/40 mx-1"></div>

            {/* Attachment Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isInputLocked || isBusy || attachments.length >= MAX_PDFS}
              className="border border-white/10 text-[#a1a1aa] hover:text-[#fafafa]  bg-white/5 hover:bg-white/10 p-1.5 transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Right Side: Send/Stop Button */}
          <button 
            onClick={loading ? onStop : handleSendMessage}
            disabled={isInputLocked || (!loading && !message.trim())}
            className={`w-8 h-8 rounded-md transition-all duration-200 flex items-center justify-center
              ${(loading || (!isInputLocked && message.trim()))
                ? 'bg-[#fafafa] text-[#18181b] hover:bg-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                : 'border border-white/10 text-[#a1a1aa] bg-white/5 cursor-not-allowed'
              }`}
          >
            {loading ? (
              <Square className="w-3 h-3 fill-current" />
            ) : isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" strokeWidth={3} />
            )}
          </button>

        </div>
      </div>
      
    </>
  );
};

export default ChatInput;
