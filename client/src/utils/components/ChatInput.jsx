import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Globe, ChevronDown } from 'lucide-react';

const ChatInput = () => {
  const [message, setMessage] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  return (
    <>
        
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
            rows={1}
            style={{ maxHeight: '200px', overflowY: 'auto' }}
            />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-end justify-between pt-1 px-1">
          
          {/* Left Side: Model Selector, Search, Attachment */}
          <div className="flex items-center gap-2">
            
            {/* TODO: Model Selector Dropdown */}

            {/* TODO: Search Toggle Pill */}
            <button 
              onClick={() => setIsSearchEnabled(!isSearchEnabled)}
              className={`bg-[#2A2A3C] flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                ${isSearchEnabled ? 'text-blue-400' : 'text-white'}` // Fixed typo here
              }
            >
              {/* You can actually remove the conditional class on the icon if the parent button handles the color */}
              <Globe className="w-3.5 h-3.5" /> 
              <span>Search</span>
            </button>
            
             {/* Divider */}
             <div className="h-6 w-0.5 bg-black/60 mx-1"></div>

            {/* Attachment Button */}
            <button className="p-2 text-[#58585A] bg-[#3A3A3D] transition-all duration-200 hover:text-blue-400 rounded-lg">
              <Paperclip className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Right Side: Send Button */}
          <button 
            disabled={!message.trim()}
            className={`w-9 h-9 bg-[#3A3A3D] rounded-lg transition-all duration-200 hover:shadow-[0_0_0_4px_rgba(0,0,0,0.2)] flex items-center justify-center mb-0.5
              ${message.trim() 
                ? 'text-white cursor-pointer' 
                : 'text-[#58585A] cursor-not-allowed'
              }`}
          >
            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
          </button>

        </div>
      </div>
      
    </>
  );
};

export default ChatInput;