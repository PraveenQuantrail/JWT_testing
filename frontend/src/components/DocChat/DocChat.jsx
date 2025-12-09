import React, { useState, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMessageSquare,
  FiCopy,
  FiCheck,
  FiUser,
  FiEdit3,
} from "react-icons/fi";
import { docApi } from "../../utils/api";
import { SessionIDContext } from "../../context/SessionIDContext";
import ChatSearchBar from "../Common/ChatSearchBar";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import DocChatHeader from "./DocChatHeader";
import SliderChatHistoryComponent from "../WebChat/SliderChatHistoryComponent";
import ScrollButton from "../Common/ScrollButton";
import DeleteMessageAlertComponent from "../WebChat/DeleteMessageAlertComponent";
import ViewTopicDocuments from "./ViewTopicDocuments";
import { Toaster } from "react-hot-toast";

const LoadingDots = () => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-[#5D3FD3] rounded-full"
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
  </div>
);

const ThinkingAnimation = () => (
  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-2 h-2 mx-2 bg-blue-500 rounded-full animate-ping" />
    </motion.div>
    <div className="flex-1">
      <div className="text-sm text-blue-700 font-medium">QuantChat is thinking</div>
      <div className="text-xs text-blue-600">Analyzing your documents and generating insights...</div>
    </div>
    <LoadingDots />
  </div>
);

export default function DocChat() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [topics, setTopics] = useState([]);
  const [message, setMessage] = useState("");
  const [copiedItems, setCopiedItems] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [chats, setChats] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [hasShownWelcomeMessage, setHasShownWelcomeMessage] = useState(false);
  const [selectedTopicDetails, setSelectedTopicDetails] = useState(null);
  const [showTopicInfo, setShowTopicInfo] = useState(false);

  // Scroll state management
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Chat history state
  const [currentChatId, setCurrentChatID] = useState(null);
  const [chatHistoryData, setChatHistoryData] = useState([]);
  const [ArchData, setArchData] = useState([]);
  const [isdeleteAlert, setIsDeleteAlert] = useState(false);
  const [currentDeleteItem, setCurrentDeleteItem] = useState(null);
  const [isSideBaropen, setIsSideBarOpen] = useState(false);

  const { sessionIDData } = useContext(SessionIDContext);

  // Persisted selection key
  const SELECTED_TOPIC_KEY = 'docChatSelectedTopic';

  // Fetch topics on component mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
      
        setTopicsLoading(true);
        const data = await docApi.getAllTopics({ page: 1, limit: 100 });
        const fetchedTopics = data.topics || [];
        setTopics(fetchedTopics);

        // After topics loaded, attempt to restore persisted selection (if any)
        const stored = sessionStorage.getItem(SELECTED_TOPIC_KEY) || localStorage.getItem(SELECTED_TOPIC_KEY);
        if (stored) {
          // stored may be id or name; try to match by id (loose equality) first, then by name
          const matchById = fetchedTopics.find(t => String(t.id) === String(stored));
          if (matchById) {
            setSelectedTopic(String(matchById.id));
            return;
          }
          const matchByName = fetchedTopics.find(t => String(t.name).toLowerCase() === String(stored).toLowerCase());
          if (matchByName) {
            setSelectedTopic(String(matchByName.id));
            return;
          }
          // If nothing matches, do not set selection (user must pick)
        }
      } catch (error) {
        toast.error(error.message || 'Failed to fetch topics');
        setTopics([]);
      } finally {
        setTopicsLoading(false);
      }
    };

    fetchTopics();
  }, []);

  useEffect(() => {
     
      const storedID = sessionStorage.getItem(SELECTED_TOPIC_KEY) || localStorage.getItem(SELECTED_TOPIC_KEY) || "";
      if (storedID) {
        setSelectedTopic(storedID);
      }
    }, []);

  // Whenever selectedTopic changes, persist it and fetch its details so header and other parts are in sync.
  useEffect(() => {
    const syncSelectedTopic = async () => {
      if (!selectedTopic) {

        setSelectedTopicDetails(null);
        sessionStorage.removeItem(SELECTED_TOPIC_KEY);
        localStorage.removeItem(SELECTED_TOPIC_KEY);
        return;
      }

      try {
        // persist selection as string

        sessionStorage.setItem(SELECTED_TOPIC_KEY, String(selectedTopic));
        // also keep in localStorage for cross-tab persistence if desired
        localStorage.setItem(SELECTED_TOPIC_KEY, String(selectedTopic));

        // fetch topic details just like DocManagement does
        const topicDetails = await docApi.getTopicDocuments(selectedTopic, { page: 1, limit: 50 });
        // store result for header and view panel
        setSelectedTopicDetails(topicDetails);
      } catch (err) {
        console.error('Failed to fetch selected topic details:', err);
        // if fetch fails, clear selectedTopicDetails but keep selectedTopic so user doesn't lose selection
        setSelectedTopicDetails(null);
      }
    };

    syncSelectedTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);

  // Welcome message effect
  useEffect(() => {
    if (selectedTopic && !hasShownWelcomeMessage) {
      setChats([
        {
          type: "bot",
          text: "Welcome to Document Chat! I can help you analyze and understand your documents. Just ask questions about the content in your selected topic.",
        },
      ]);
      setHasShownWelcomeMessage(true);
    } else if (!selectedTopic && hasShownWelcomeMessage) {
      setChats([]);
      setHasShownWelcomeMessage(false);
    }
  }, [selectedTopic, hasShownWelcomeMessage]);

  // Scroll management
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    setShowScrollUp(scrollTop > 100);
    setShowScrollDown(scrollTop + windowHeight < documentHeight - 100);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Chat history management functions
  const CreateNewChatHistory = (usermessage) => {
    if (currentChatId) {
      setChatHistoryData(prev => prev.map((item) => {
        if (item?.id === currentChatId) {
          return { ...item, chatHistory: [...item.chatHistory, usermessage] };
        }
        return item;
      }));

      setArchData(prev => prev.map((item) => {
        if (item?.id === currentChatId) {
          return { ...item, chatHistory: [...item.chatHistory, usermessage] };
        }
        return item;
      }));

      return currentChatId;
    } else {
      let history = {
        id: Date.now(),
        title: usermessage.text,
        chatHistory: [usermessage]
      };
      setCurrentChatID(history.id);
      setChatHistoryData([history, ...chatHistoryData]);
      return history.id;
    }
  };

  const handleSend = async () => {
    if (message.trim() === "") return;

    const userMessage = message.trim();
    const currentHistoryId = CreateNewChatHistory({ type: "user", text: userMessage });

    if (!selectedTopic) {
      if (currentChatId || currentHistoryId) {
        setChatHistoryData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currentHistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                type: "bot",
                text: "Please select a topic before chatting.",
              }]
            };
          }
          return val;
        }));

        setArchData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currentHistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                type: "bot",
                text: "Please select a topic before chatting.",
              }]
            };
          }
          return val;
        }));
      }

      setMessage("");
      return;
    }

    setMessage("");
    setIsBotTyping(true);

    // Simulate bot response (will be replaced with actual AI integration later)
    setTimeout(() => {
      const chatID = Date.now();
      if (currentChatId || currentHistoryId) {
        setChatHistoryData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currentHistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                chatID,
                type: "bot",
                text: "I understand you're asking about your documents. While I process your specific query, here's what I can help you with: document analysis, content summarization, and answering questions based on your uploaded files.",
                error: { status: false, message: "" }
              }]
            };
          }
          return val;
        }));

        setArchData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currentHistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                chatID,
                type: "bot",
                text: "I understand you're asking about your documents. While I process your specific query, here's what I can help you with: document analysis, content summarization, and answering questions based on your uploaded files.",
                error: { status: false, message: "" }
              }]
            };
          }
          return val;
        }));
      }
      setIsBotTyping(false);
    }, 2000);
  };

  // Chat history management functions (reused from Chat.jsx)
  const AddArchiveHandler = (id) => {
    setArchData([...ArchData, ...chatHistoryData.filter((val) => val.id === id)]);
    setChatHistoryData(prev => prev.filter(val => val.id !== id));
    toast.success('Added to archive successfully');
    setCurrentChatID(null);
  };

  const RemoveArchiveHandler = (id) => {
    setChatHistoryData([...chatHistoryData, ...ArchData.filter(val => val.id === id)]);
    setArchData(prev => prev.filter(val => val.id !== id));
    toast.success('Removed from archive successfully');
    !currentChatId && setCurrentChatID(id);
  };

  const UpdateTitle = (title, id) => {
    setChatHistoryData(prev => prev.map((val) => {
      if (val.id === id) {
        return { ...val, title: title };
      }
      return val;
    }));

    setArchData(prev => prev.map((val) => {
      return val.id === id ? { ...val, title: title } : val;
    }));
  };

  const NewChatWindow = () => {
    setCurrentChatID(null);
    setChats([]);
    setTimeout(() => {
      setChats([
        {
          type: "bot",
          text: "Welcome to Document Chat! I can help you analyze and understand your documents. Just ask questions about the content in your selected topic.",
        },
      ]);
    }, 100);
    toast.success('New chat started');
  };

  const ChangeChatWindow = (id) => {
    if (!(id === currentChatId)) {
      setCurrentChatID(id);
      const findChat = chatHistoryData.find(val => val?.id === id) || ArchData.find(val => val?.id === id);
      findChat && toast.success(`${findChat?.title} chat loaded`);
    }
  };

  const DeleteHistoryMessageHandler = (id) => {
    if (id === currentChatId) {
      setCurrentChatID(null);
      setChatHistoryData(chatHistoryData.filter((val) => val.id !== id));
      setArchData(ArchData.filter((val) => val.id !== id));
    } else {
      setChatHistoryData(chatHistoryData.filter((val) => val.id !== id));
      setArchData(ArchData.filter((val) => val.id !== id));
    }
    CloseDeleteAlert();
  };

  const DeleteActivatedHandler = (id) => {
    const findMessage = chatHistoryData.filter(val => val?.id === id);
    const findMessage2 = ArchData.filter(val => val?.id === id);
    setCurrentDeleteItem(findMessage.length > 0 ? findMessage[0] : findMessage2[0]);
    setIsDeleteAlert(true);
  };

  const CloseDeleteAlert = () => {
    setIsDeleteAlert(false);
    setCurrentDeleteItem(null);
  };

  const handleTopicSelect = (topicId) => {
    // Accept either numeric or string IDs from header; store as string to keep consistency
    setSelectedTopic(String(topicId));
    // fetching of details happens in the effect above
  };

  const handleClearTopic = () => {
    setSelectedTopic("");
    setSelectedTopicDetails(null);
    sessionStorage.removeItem(SELECTED_TOPIC_KEY);
    localStorage.removeItem(SELECTED_TOPIC_KEY);
  };

  const handleVoiceTranscript = (transcript) => {
    setMessage(prev => prev + (prev ? ' ' : '') + transcript);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setCopiedItems(prev => ({ ...prev, [index]: false }));
    }, 2000);
  };

  const handleEditMessage = (index) => {
    setMessage(chats[index].text);
    setEditingIndex(index);
    setTimeout(() => {
      document.querySelector('input[type="text"]')?.focus();
    }, 100);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setMessage("");
  };

  const checkStateSidebar = (flag) => {
    flag ? setTimeout(() => {
      setIsSideBarOpen(flag);
    }, 300) : setIsSideBarOpen(flag);
  };

  const findCurrentChatHistorydataWithId = (id) => {
    if (currentChatId) {
      const response = chatHistoryData?.filter(val => val?.id === id);
      const archRes = ArchData?.filter(val => val.id === id);
      return response.length > 0 ? response[0]?.chatHistory : archRes.length > 0 ? archRes[0].chatHistory : [];
    }
    return [];
  };

  const isChatBlocked = !selectedTopic;
  const hasRealChats = chats.length > 0;

  const renderChatMessage = (chat, index) => {
    if (chat.type === "user") {
      return (
        <div
          className="flex justify-end relative group"
          onMouseEnter={() => setHoveredMessage(index)}
          onMouseLeave={() => setHoveredMessage(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm bg-[#5D3FD3] text-white rounded-br-none relative"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-3 break-words whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{chat.text}</div>
              <div className="bg-white p-1 rounded-full flex-shrink-0 ml-0">
                <FiUser className="text-[#5D3FD3]" size={14} />
              </div>
            </div>
            {(hoveredMessage === index || editingIndex === index) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-end mt-2 space-x-1 absolute -bottom-2 right-0 bg-white rounded-tl-lg rounded-br-lg p-1 shadow-xs"
              >
                <button
                  onClick={() => handleEditMessage(index)}
                  className="p-1 rounded-full hover:bg-[#5D3FD3] transition-colors group/icon"
                  title="Edit message"
                >
                  <FiEdit3 size={12} className="text-[#5D3FD3] group-hover/icon:text-white" />
                </button>
                <button
                  onClick={() => copyToClipboard(chat.text, `user-${index}`)}
                  className="p-1 rounded-full hover:bg-[#5D3FD3] transition-colors group/icon"
                  title="Copy message"
                >
                  {copiedItems[`user-${index}`] ? (
                    <FiCheck size={12} className="text-green-500" />
                  ) : (
                    <FiCopy size={12} className="text-[#5D3FD3] group-hover/icon:text-white" />
                  )}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    } else {
      return (
        <div className="flex justify-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm rounded-bl-none ${chat.error?.status ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}
            style={{ overflowWrap: 'anywhere' }}
          >
            <div className="flex items-center mb-2">
              <div className={chat.text ? "bg-[#5D3FD3] p-1 rounded-full mr-2" : "bg-red-600 p-1 rounded-full mr-2"}>
                <FiMessageSquare className="text-white" size={14} />
              </div>
              <span className={chat.text ? "text-xs text-[#5D3FD3] font-medium" : "text-xs text-red-600 font-medium"}>QuantChat</span>
            </div>
            {chat.text ? (
              <div className="mb-3 text-gray-700 break-words whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{chat.text}</div>
            ) : (
              chat.error.status && (
                <div className="text-red-600 text-sm">
                  {chat.error.message}
                </div>
              )
            )}
          </motion.div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-row items-start justify-start w-full">
      <div className={`${isSideBaropen ? 'w-[14rem]' : 'w-[2.5rem]'}`}>
        <SliderChatHistoryComponent
          chatHistoryData={chatHistoryData}
          ArchData={ArchData}
          checkState={checkStateSidebar}
          DeleteHistoryMessageHandler={DeleteActivatedHandler}
          NewHistoryHandler={NewChatWindow}
          AddArchiveHandler={AddArchiveHandler}
          RemoveArchiveHandler={RemoveArchiveHandler}
          UpdateTitle={UpdateTitle}
          ChangeChatWindow={ChangeChatWindow}
        />
      </div>
      
      <motion.div
        className={`min-h-screen bg-gray-200 flex flex-col ${isSideBaropen ? 'w-[calc(100%-14rem)] SideBodyAdjustOpen' : 'w-[calc(100%-2.5rem)] SideBodyAdjustClose'}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Toaster position="top-center" toastOptions={{ duration: 500, className: 'text-xs' }} />
        <ToastContainer position="top-right" autoClose={5000} />

        <DocChatHeader
          selectedTopic={selectedTopic}
          topics={topics}
          onTopicSelect={handleTopicSelect}
          onClearTopic={handleClearTopic}
          selectedTopicDetails={selectedTopicDetails}
          setSelectedTopicDetails={setSelectedTopicDetails}
          showTopicInfo={showTopicInfo}
          setShowTopicInfo={setShowTopicInfo}
        />

        <ScrollButton
          direction="up"
          onClick={scrollToTop}
          isVisible={showScrollUp}
        />
        <ScrollButton
          direction="down"
          onClick={scrollToBottom}
          isVisible={showScrollDown}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
            {(hasRealChats || chatHistoryData.length > 0) ? (
              <>
                {chats.map((chat, index) => (
                  <div key={chat.chatID ?? index}>{renderChatMessage(chat, index)}</div>
                ))}

                {findCurrentChatHistorydataWithId(currentChatId)?.map((val, index) => {
                  return <div key={val.chatID ?? index}>{renderChatMessage(val, index)}</div>;
                })}

                {isBotTyping && <ThinkingAnimation />}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 max-w-md mx-auto">
                  <FiMessageSquare className="mx-auto text-4xl mb-4 text-gray-300" />
                  <p className="text-lg mb-2">Select a topic to start chatting</p>
                  <p className="text-sm">Choose a topic from the dropdown above to begin your conversation about documents</p>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 left-0 right-0 bg-gray-200 border-t border-gray-300 z-10">
            <div className="max-w-4xl mx-auto w-full p-4">
              <ChatSearchBar
                message={message}
                setMessage={setMessage}
                onSend={handleSend}
                disabled={isChatBlocked || isBotTyping}
                isBotTyping={isBotTyping}
                onTranscript={handleVoiceTranscript}
                VoiceSearchButton={({ onTranscript, disabled }) => (
                  <button
                    onClick={() => onTranscript("Sample voice input")}
                    disabled={disabled}
                    className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}
                editingIndex={editingIndex}
                cancelEdit={cancelEdit}
                isChatBlocked={isChatBlocked}
                searchBarType={'document-chat'}
                showStatusMessage={true}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {isdeleteAlert && (
        <DeleteMessageAlertComponent
          CurrentMessage={currentDeleteItem}
          Cancelhandler={CloseDeleteAlert}
          DeleteHandler={DeleteHistoryMessageHandler}
        />
      )}

      {showTopicInfo && selectedTopicDetails && (
        <ViewTopicDocuments
          topic={selectedTopicDetails}
          onClose={() => setShowTopicInfo(false)}
        />
      )}
    </div>
  );
}