import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TbWorld } from "react-icons/tb";

const ChatSearchBar = ({
  message = "",
  setMessage,
  onSend,
  disabled,
  isBotTyping,
  onTranscript,
  VoiceSearchButton,
  editingIndex,
  cancelEdit,
  isChatBlocked,
  searchBarType,
  inputType,
  handleSendWebSearch,
  showStatusMessage = true
}) => {

  const textareaRef = useRef(null);
  const MIN_HEIGHT = 48;
  const MAX_HEIGHT = 250;

  const [webSearchSelected, setWebSearchSelected] = useState(false);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset to auto to measure scrollHeight
      textarea.style.height = 'auto';

      // Calculate new height (min MIN_HEIGHT, capped at MAX_HEIGHT)
      const newHeight = Math.max(Math.min(textarea.scrollHeight, MAX_HEIGHT), MIN_HEIGHT);
      textarea.style.height = `${newHeight}px`;

      // Show scrollbar when content exceeds max height
      textarea.style.overflowY = newHeight >= MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [message]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isBotTyping) {
        e.preventDefault(); // Prevent submission while processing
        return;
      }

      if (!disabled && message?.trim()) {
        e.preventDefault();
        if (webSearchSelected && typeof handleSendWebSearch === 'function') {
          handleSendWebSearch();
          setWebSearchSelected(false);
        } else {
          onSend();
        }
      }
    }
  };

  const getVoiceSearchDisabled = () => {
    if (inputType === 'chat-view') return false;
    if (searchBarType === 'general-chat') {
      return isBotTyping;
    } else {
      return isChatBlocked || isBotTyping;
    }
  };

  const handleSendButtonClick = () => {
    if (!message?.trim() || isChatBlocked || isBotTyping) return;
    if (webSearchSelected && typeof handleSendWebSearch === 'function') {
      handleSendWebSearch();
      setWebSearchSelected(false);
    } else {
      onSend();
    }
  };

  const handleWebSearchToggle = () => {
    const next = !webSearchSelected;
    setWebSearchSelected(next);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const showWebSearchIcon = inputType === 'chat-view';
  const voiceRightClass = showWebSearchIcon ? 'right-12' : 'right-3';
  const voiceContainerClass = `absolute ${voiceRightClass} top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-md p-1 shadow-sm`;
  const webSearchRightClass = 'right-3';

  return (
    <div>
      {/* Scoped fallback for webkit scrollbar (keeps UI neat if no Tailwind scrollbar plugin) */}
      <style>{`
        /* Scoped to only affect the textarea with the chat-textarea class */
        .chat-textarea::-webkit-scrollbar { width: 10px; }
        .chat-textarea::-webkit-scrollbar-track { background: transparent; }
        .chat-textarea::-webkit-scrollbar-thumb {
          background: rgba(93,63,211,0.35);
          border-radius: 6px;
          border: 2px solid rgba(0,0,0,0);
          background-clip: padding-box;
        }
      `}</style>

      {editingIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 shadow-xs"
        >
          <div className="flex items-center">
            {/* Edit icon */}
            <svg className="mr-2 text-blue-500" width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 17.25V21h3.75l11.07-11.07-3.75-3.75L3 17.25zm17.71-10.04l-2.92-2.92a1.003 1.003 0 00-1.42 0l-1.34 1.34 3.75 3.75 1.34-1.34c.39-.39.39-1.03 0-1.42z" />
            </svg>
            <span>Editing message</span>
          </div>
          <button
            onClick={cancelEdit}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
          >
            Cancel Edit
          </button>
        </motion.div>
      )}

      <div className="flex items-center space-x-2 w-full">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            placeholder={
              searchBarType === 'database-chat' ?
                isChatBlocked
                  ? "Please select a database to chat."
                  : editingIndex !== null
                    ? "Edit your message..."
                    : "Ask about your data..."
                : searchBarType === 'general-chat' ?
                  isChatBlocked
                    ? "Please get session id to continue the chat"
                    : editingIndex !== null
                      ? "Edit your message..."
                      : "Ask the question to Qchat..."
                  :
                  isChatBlocked
                    ? "Please select a Topic to chat."
                    : editingIndex !== null
                      ? "Edit your message..."
                      : "Ask about your Documents..."
            }
            value={message || ""}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isChatBlocked}
            rows={1}
            aria-label="Chat input"
            className={
              "chat-textarea w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent bg-white shadow-xs resize-none " +
              "break-words break-all whitespace-pre-wrap transition-all duration-200 pr-20 " +
              "min-h-[48px] max-h-[250px] " +
              "scrollbar-thin scrollbar-thumb-[#5D3FD3]/40 scrollbar-track-transparent"
            }
          />

          <div className={voiceContainerClass}>
            <VoiceSearchButton
              onTranscript={onTranscript}
              disabled={getVoiceSearchDisabled()}
            />
          </div>

          {showWebSearchIcon && (
            <button
              title={webSearchSelected ? 'Web search selected' : 'Select web search'}
              onClick={handleWebSearchToggle}
              disabled={isBotTyping || !message?.trim()}
              className={
                (isBotTyping || !message?.trim() ? "cursor-not-allowed " : "cursor-pointer ") +
                `absolute ${webSearchRightClass} top-1/2 transform -translate-y-1/2 z-10 p-1 shadow-sm border-[1.5px] rounded-full transition-colors duration-200 ` +
                (webSearchSelected
                  ? "bg-[#5D3FD3] text-white border-[#5D3FD3]"
                  : "bg-white text-quantchat text-gray-600 border-gray-200 hover:bg-[#5D3FD3] hover:text-white hover:border-[#5D3FD3]")
              }
            >
              <TbWorld className='w-5 h-5' />
            </button>
          )}
        </div>

        <motion.button
          onClick={handleSendButtonClick}
          className="p-3 rounded-lg bg-[#5D3FD3] text-white hover:bg-[#6d4fe4] transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex-shrink-0 bottom-[3px] relative"
          disabled={!message?.trim() || isChatBlocked || isBotTyping}
          whileHover={{ scale: !message?.trim() || isChatBlocked || isBotTyping ? 1 : 1.05 }}
          whileTap={{ scale: !message?.trim() || isChatBlocked || isBotTyping ? 1 : 0.95 }}
        >
          {isBotTyping ? (
            <motion.div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          ) : (
            <svg className="text-lg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Conditionally render status message based on showStatusMessage prop */}
      {showStatusMessage && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {isChatBlocked
            ? searchBarType === 'document-chat' ? "Please select a Topic to chat." : "Please select a database to chat."
            : isBotTyping
              ? "Processing your request... Please wait"
              : webSearchSelected
                ? "Web search selected — pressing Enter or Send will perform a web search"
                : "Press Enter to send, Shift+Enter for new line"}
        </p>
      )}
    </div>
  );
};

export default ChatSearchBar;