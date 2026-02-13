import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Globe, Square } from 'lucide-react';

const ChatInput = ({ threadId, onMessageSent, loading, onStop }) => {
  const [message, setMessage] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || loading || !threadId) return;

    const userMessage = message.trim();
    setMessage('');
    setError(null);

    onMessageSent?.(userMessage);
  };


  const handleKeyDown = (e) => {
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
      <div className="w-full max-w-4xl bg-[#18181b]/50 backdrop-blur-xl rounded-2xl p-4 border border-white/5 relative flex flex-col min-h-32 transition-all duration-200 z-10 group focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.8)]">
        
        {/* Text Input Area */}
        <div className="grow mb-2">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-[#fafafa] text-[16px] leading-relaxed placeholder-[#52525b] resize-none outline-none overflow-hidden min-h-14 px-2 py-1 font-normal font-sans"
            placeholder="Send a message to Sidekick..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-end justify-between pt-2 px-1 border-t border-white/5 mt-2">
          
          {/* Left Side: Model Selector, Search, Attachment */}
          <div className="flex items-center gap-2">
            
            {/* TODO: Model Selector Dropdown */}

            {/* Search Toggle Pill */}
            <button 
              onClick={() => setIsSearchEnabled(!isSearchEnabled)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border border-transparent
                ${isSearchEnabled 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                  : 'bg-white/5 text-[#a1a1aa] hover:bg-white/10 hover:text-[#fafafa]'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Globe className="w-3.5 h-3.5" /> 
              <span>Search</span>
            </button>
            
            {/* Divider */}
            <div className="h-6 w-0.25 bg-white/40 mx-1"></div>

            {/* Attachment Button */}
            <button 
              disabled={loading}
              className="p-1.5 text-[#52525b] hover:text-[#fafafa] transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Right Side: Send/Stop Button */}
          <button 
            onClick={loading ? onStop : handleSendMessage}
            disabled={!loading && !message.trim()}
            className={`w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center
              ${(loading || message.trim())
                ? 'bg-[#fafafa] text-[#18181b] hover:bg-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
                : 'bg-white/10 text-[#52525b] cursor-not-allowed'
              }`}
          >
            {loading ? (
              <Square className="w-3 h-3 fill-current" />
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