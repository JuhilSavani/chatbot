import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Square, X, FileText, Loader2, ChevronDown, Check } from 'lucide-react';
import { uploadFileToCloudinary } from '../actions/upload.actions';
import { devLog } from '@/lib/utils';

const MAX_FILES = 5;
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_TOKENS = 32768;
const MODEL_OPTIONS = [
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS-20B' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS-120B' },
];
const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;

const ChatInput = ({ threadId, onMessageSent, loading, onStop, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isPersonalizationEnabled, setIsPersonalizationEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const isInputLocked = disabled || isSending;
  
  // Each entry: { id, file, text, status: 'processing' | 'done' | 'error', tokenCount, error }
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

  const processSingleFile = async (file, id, worker, workerName) => {
    try {
      const fileBuffer = await file.arrayBuffer();
      devLog(`[ChatInput] Phase 1 — extracting "${file.name}"...`);

      // ── Phase 1: Extraction ──────────────────────────────────────────────────
      const markdown = await new Promise((resolve, reject) => {
        worker.onerror = (e) => {
          worker.terminate();
          console.error('[ChatInput] Worker instantiation error:', e.message, e.filename, e.lineno);
          reject(new Error(`Extraction worker failed to load: ${e.message || 'Unknown network/bundling error'}`));
        };
        worker.onmessage = ({ data }) => {
          if (data?.workerName !== workerName) return;

          if (data.status === 'PROGRESS') {
            devLog(`[ChatInput] "${file.name}" — page ${data.page}/${data.total}`);
            return;
          }

          worker.terminate();
          if (data.status === 'SUCCESS') {
            resolve(data.markdown);
          } else {
            reject(new Error(data.message || 'Extraction failed'));
          }
        };
        worker.postMessage({ status: 'PROCESS', buffer: fileBuffer, filename: file.name }, [fileBuffer]);
      });

      devLog(`[ChatInput] Phase 2 — counting tokens for "${file.name}"...`);

      // ── Phase 2: Token counting ──────────────────────────────────────────────
      const tokenCount = await new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/tokenWorker.js', import.meta.url),
          { type: 'module' }
        );
        worker.onerror = () => {
          worker.terminate();
          reject(new Error('Token counting worker failed.'));
        };
        worker.onmessage = ({ data }) => {
          if (data?.workerName !== 'TokenWorker') return;

          worker.terminate();
          if (data.status === 'DONE') {
            resolve(data.tokenCount);
          } else {
            reject(new Error(data.message || 'Token counting failed'));
          }
        };
        worker.postMessage({ status: 'COUNT', text: markdown });
      });

      devLog(`[ChatInput] "${file.name}" token count: ${tokenCount}`);

      // ── Token limit check ────────────────────────────────────────────────────
      if (tokenCount > MAX_TOKENS) {
        console.error(`Rejected "${file.name}" due to token limit`);
        setAttachments(prev => prev.filter(a => a.id !== id));
        setError(`"${file.name}" exceeds the token limit (${tokenCount.toLocaleString()} / ${MAX_TOKENS.toLocaleString()} tokens).`);
      } else {
        devLog(`"${file.name}" done`);
        updateAttachment(id, { status: 'done', text: markdown, tokenCount });
      }
    } catch (err) {
      console.error(`[ChatInput] Error processing "${file.name}":`, err);
      updateAttachment(id, { status: 'error', error: err.message });
    }
  };

  const processFiles = (files) => {
    if (isInputLocked) return;

    const validFiles = Array.from(files).filter(f => ALLOWED_TYPES.includes(f.type));

    if (validFiles.length === 0) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }

    const remainingSlots = MAX_FILES - attachments.length;
    if (remainingSlots <= 0) {
      setError(`Maximum of ${MAX_FILES} files allowed per message.`);
      return;
    }

    const filesToProcess = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      setError(`Only ${remainingSlots} more file(s) can be added. ${validFiles.length - remainingSlots} file(s) were skipped.`);
    } else {
      setError(null);
    }

    // Create entries for all files
    const newEntries = filesToProcess.map(file => ({
      id: crypto.randomUUID(),
      file,
      text: '',
      status: 'processing',
      tokenCount: 0,
      error: null,
    }));

    setAttachments(prev => [...prev, ...newEntries]);

    // Process all concurrently, routing by MIME type
    newEntries.forEach(entry => {
      if (entry.file.type === 'application/pdf') {
        const pdfWorker = new Worker(
          new URL('../workers/pdfWorker.js', import.meta.url),
          { type: 'module' }
        );
        processSingleFile(
          entry.file,
          entry.id,
          pdfWorker,
          'PdfWorker'
        );
      } else {
        const docxWorker = new Worker(
          new URL('../workers/docxWorker.js', import.meta.url),
          { type: 'module' }
        );
        processSingleFile(
          entry.file,
          entry.id,
          docxWorker,
          'DocxWorker'
        );
      }
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
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e) => {
    if (isInputLocked) return;

    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
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
  const isBusy = attachments.some(a => a.status === 'processing');
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
            devLog(`[ChatInput] Uploading "${att.file.name}" to Cloudinary...`);
            const result = await uploadFileToCloudinary(att.file);
            devLog(`[ChatInput] Upload complete for "${att.file.name}"`);
            return result;
          })
        );
        devLog('[ChatInput] All uploads complete');

        const attachmentUrls = uploadResults.map((r, i) => ({
          public_id: r.public_id,
          secure_url: r.secure_url,
          resource_type: r.resource_type,
          name: doneAttachments[i].file.name,
          text: doneAttachments[i].text || '',
        }));

        setMessage('');
        onMessageSent({
          message: userMessage,
          selectedModel: selectedModelId,
          attachments: attachmentUrls,
          personalizationEnabled: isPersonalizationEnabled,
        });
        clearAllAttachments();
        return;
      } catch (err) {
        console.error('[ChatInput] Failed to process file:', err);
        setError('Failed to process file: ' + err.message);
        setIsSending(false);
        return;
      }
    }

    setMessage('');
    onMessageSent({
      message: userMessage,
      selectedModel: selectedModelId,
      personalizationEnabled: isPersonalizationEnabled,
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
        <div className="mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex justify-between items-start gap-2">
          <span className="flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="p-0.5 text-red-400/50 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10 shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Main Input Container */}
      <div 
        ref={inputContainerRef}
        className={`w-full max-w-4xl bg-[#18181b]/50 backdrop-blur-xl rounded-2xl p-3 md:p-4 border relative flex flex-col min-h-32 transition-all duration-200 z-10 group focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.8)] ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'} ${disabled ? 'opacity-60' : ''}`}
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
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                {att.status === 'processing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-[#a1a1aa] truncate max-w-[100px]">
                      Processing... {att.file.name}
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
        <div className="flex items-end justify-between pt-2 px-1 border-t border-white/10 mt-2">
          
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
                <span className="hidden sm:inline-block px-2 text-[10px] font-semibold tracking-[0.18em] text-[#a1a1aa]">MODEL</span>
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

            {/* Personalization Toggle Pill */}
            <button
              type="button"
              onClick={() => setIsPersonalizationEnabled(prev => !prev)}
              disabled={isInputLocked}
              title={isPersonalizationEnabled ? 'Personalization on' : 'Personalization off'}
              className={`rounded-md border px-2.5 py-1.75 text-[11px] font-medium tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isPersonalizationEnabled
                  ? 'border-blue-500/30 bg-blue-500/15 text-blue-400'
                  : 'border-white/10 bg-white/5 text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/10'
              }`}
            >
              Personalize
            </button>

            {/* Divider */}
            <div className="h-6 w-0.25 bg-white/40 mx-1"></div>

            {/* Attachment Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isInputLocked || isBusy || attachments.length >= MAX_FILES}
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
