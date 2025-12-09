import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from 'lucide-react';
import { BiSolidMessageAltError } from "react-icons/bi";
import TextToSpeechControls from "./TextToSpeechControls";
import { FiCopy, FiCheck } from "react-icons/fi";

// Error Message generator
const ErrorMessageGenerate = (code) => {
  let currentError = null;
  switch (code) {
    case 'ISE':
      currentError = "The server encountered an internal error or misconfiguration and was unable to complete your request";
      break;
    case 'SI':
      currentError = "Your session has expired. Please connect again";
      break;
    case 'SNF':
      currentError = "This action requires an active session. Please connect again for this action";
      break;
    default:
      currentError = "Something went wrong on our end. Please try again later.";
      break;
  }
  return currentError;
};

// Converts markdown-like bold text to normal text
const convertNormalText = (summary) => {
  return summary && summary.includes("**") ? summary.replace(/\*\*/g, " ") : (summary || "");
};

const GenerateSummary = ({
  chat,
  activeSpeechChatId,
  handleSpeechStop,
}) => {
  // Local state to handle copy feedback
  const [copied, setCopied] = useState(false);

  // Typing effect state
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Refs for timing and control
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const animationIntervalRef = useRef(null);
  const lastShownCharsRef = useRef(0);

  // typing configuration
  const CHAR_DELAY_MS = 15; // approximate ms per char (same as original)

  // Check if summary is fully generated
  const isSummaryFullyGenerated = !isTyping && chat?.summarize?.value && displayedText === convertNormalText(chat.summarize.value);

  // Handle copy click and feedback
  const handleCopyClick = () => {
    if (!isSummaryFullyGenerated) return; // Disable if not fully generated
    
    const summaryText = convertNormalText(chat.summarize.value);
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500); // Show tick for 1.5sec
    }
  };

  useEffect(() => {
    // When summary value becomes empty / hidden, reset displayed text
    if (!chat || !chat.summarize) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }
    if (chat.summarize.value === "" || chat.summarize.error.status) {
      // clear any running timers
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
      lastShownCharsRef.current = 0;
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    // Begin typing for new summary
    const fullText = convertNormalText(chat.summarize.value);
    const totalChars = fullText.length;
    startTimeRef.current = performance.now();
    lastShownCharsRef.current = 0;
    setDisplayedText("");
    setIsTyping(true);

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const charsToShow = Math.min(totalChars, Math.floor(elapsed / CHAR_DELAY_MS));
      if (charsToShow !== lastShownCharsRef.current) {
        lastShownCharsRef.current = charsToShow;
        setDisplayedText(fullText.substring(0, charsToShow));
      }
      if (charsToShow >= totalChars) {
        // finished
        setIsTyping(false);
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    };

    animationIntervalRef.current = setInterval(() => {
      tick();
    }, 60);
    tick();

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
      lastShownCharsRef.current = 0;
      setIsTyping(false);
    };
  }, [chat && chat.summarize && chat.summarize.value, chat && chat.summarize && chat.summarize.error && chat.summarize.error.status]);

  return (
    <AnimatePresence>
      {(chat.summarize.value !== "" || chat.summarize.error.status) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{
            opacity: 0,
            height: 0,
            transition: {
              duration: 0.3,
              onComplete: () => {
                if (activeSpeechChatId === chat.chatID) {
                  handleSpeechStop(chat.chatID);
                }
              }
            }
          }}
          transition={{ duration: 0.3 }}
          className="mt-3 overflow-hidden"
        >
          {(chat.summarize.value !== "" && !chat.summarize.error.status) ? (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-gray-700">
              <div className="font-medium text-blue-700 mb-1 flex items-center justify-between">
                <div className="flex items-center">
                  <Sparkles className="mr-1" size={16} />
                  Data Summary
                  {isTyping && (
                    <span className="ml-2 text-xs text-blue-500 font-normal">
                      Generating...
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <TextToSpeechControls
                    text={convertNormalText(chat.summarize.value)}
                    chatId={chat.chatID}
                    onStop={() => handleSpeechStop(chat.chatID)}
                    disabled={!isSummaryFullyGenerated}
                  />
                  <button
                    onClick={handleCopyClick}
                    className={`ml-1 transition-colors flex items-center ${
                      isSummaryFullyGenerated 
                        ? "text-blue-500 hover:text-blue-700 cursor-pointer" 
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                    title={isSummaryFullyGenerated ? "Copy summary text" : "Wait for summary to complete"}
                    disabled={!isSummaryFullyGenerated}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      outline: "none",
                    }}
                  >
                    {copied ? (
                      <FiCheck className="text-green-500" size={18} />
                    ) : (
                      <FiCopy size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div className="break-words whitespace-pre-wrap break-all mt-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <div style={{ display: 'inline' }}>
                  {displayedText}
                  {/* show cursor only while typing */}
                  {isTyping ? (
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 8,
                        marginLeft: 4,
                        backgroundColor: '#3b82f6', // blue cursor color to match theme
                        height: 14,
                        verticalAlign: 'text-bottom',
                        borderRadius: 2,
                        animation: 'summary-cursor-blink 1s steps(2, start) infinite'
                      }}
                    />
                  ) : null}
                </div>
              </div>

              {/* small style block for cursor blink animation (scoped inline) */}
              <style>{`
                @keyframes summary-cursor-blink {
                  0% { opacity: 1; }
                  50% { opacity: 0; }
                  100% { opacity: 1; }
                }
              `}</style>
            </div>
          ) : (
            // Error container
            <div className="bg-red-50 border border-red-100 rounded-md p-3 text-sm text-red-700">
              <div className="font-medium text-red-700 mb-1 flex items-center justify-between">
                <div className="flex items-center">
                  <BiSolidMessageAltError className="mr-1" size={16} />
                  Error occurs while generating summary
                </div>
              </div>
              <div className="break-words whitespace-pre-wrap break-all mt-2 text-xs" style={{ overflowWrap: 'anywhere' }}>
                {ErrorMessageGenerate(chat.summarize.error.message)}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GenerateSummary;