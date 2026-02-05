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

    onMessageSent?.({ role: 'user', content: userMessage });
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
        <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      
      {/* Main Input Container */}
      <div className="w-full max-w-2xl bg-white/40 backdrop-blur-xxl rounded-lg p-4 shadow-[0_0_0_8px_rgba(0,0,0,0.1)] border border-white/20 relative flex flex-col min-h-40 transition-all duration-300 z-10 hover:border-white/25">
        
        {/* Text Input Area */}
        <div className="grow mb-2">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-black text-[16px] leading-relaxed placeholder-[#7A7A7E] resize-none outline-none overflow-hidden min-h-20 px-2 py-1 font-normal"
            placeholder="Send a message to Kimi"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
          />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-end justify-between pt-1 px-1">
          
          {/* Left Side: Model Selector, Search, Attachment */}
          <div className="flex items-center gap-2">
            
            {/* TODO: Model Selector Dropdown */}

            {/* Search Toggle Pill */}
            <button 
              onClick={() => setIsSearchEnabled(!isSearchEnabled)}
              disabled={loading}
              className={`bg-zinc-900 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isSearchEnabled ? 'text-blue-400' : 'text-white'}
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800'}`}
            >
              <Globe className="w-3.5 h-3.5" /> 
              <span>Search</span>
            </button>
            
            {/* Divider */}
            <div className="h-6 w-0.5 bg-black/60 mx-1"></div>

            {/* Attachment Button */}
            <button 
              disabled={loading}
              className="p-2 text-[#58585A] bg-zinc-900 transition-all duration-200 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Right Side: Send/Stop Button */}
          <button 
            onClick={loading ? onStop : handleSendMessage}
            disabled={!loading && !message.trim()}
            className={`w-9 h-9 bg-zinc-900 rounded-lg transition-all duration-200 hover:shadow-[0_0_0_4px_rgba(0,0,0,0.2)] flex items-center justify-center mb-0.5
              ${(loading || message.trim())
                ? 'text-white cursor-pointer' 
                : 'text-[#58585A] cursor-not-allowed'
              }`}
          >
            {loading ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            )}
          </button>

        </div>
      </div>
      
    </>
  );
};

export default ChatInput;