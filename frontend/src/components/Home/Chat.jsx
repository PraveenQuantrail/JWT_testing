import React, { useState, useEffect, useCallback, useContext ,useRef} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PiWarningFill } from "react-icons/pi";
import {
  FiDatabase,
  FiMessageSquare,
  FiCopy,
  FiCheck,
  FiUser,
  FiEdit3,
  FiRefreshCw,
  FiBarChart2,
  FiPieChart,
  FiMic,
  FiMicOff,
  FiChevronUp,
  FiChevronDown
} from "react-icons/fi";
import { databaseApi, authApi, ChatWithSQL_API, getSummarizeSQL_API, GetVisualizationSQL_API, api_AI, connectDBPinggy } from "../../utils/api";
import { Brain, Sparkles } from 'lucide-react';
import { LuServerOff } from "react-icons/lu";
import { BiSolidMessageAltError } from "react-icons/bi";
import { IoTimeOutline } from "react-icons/io5";
import { PiLockKeyFill } from "react-icons/pi";
import { SessionIDContext } from "../../context/SessionIDContext";
import useSpeechRecognitionHook from "../../hooks/useSpeechRecognitionHook";
import ImageGalleryModal from "./ImageGalleryModal";
import SQLQuery from "./SQLQuery";
import QueryResults from "./QueryResults";
import GenerateSummary from "./GenerateSummary";
import VisualizeData from "./VisualizeData";
import ChatSearchBar from "../Common/ChatSearchBar";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import ChatHeader from "./ChatHeader";
import SliderChatHistoryComponent from "../WebChat/SliderChatHistoryComponent";
import ScrollButton from "../Common/ScrollButton"
import DeleteMessageAlertComponent from "../WebChat/DeleteMessageAlertComponent";
import ToasterFunction, { Toaster } from "react-hot-toast"

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function getSelectedDbStorageKey() {
  let token = getToken();
  return token ? `selectedDb_${token}` : "selectedDb";
}

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
      <Brain className="text-blue-500" size={20} />
    </motion.div>
    <div className="flex-1">
      <div className="text-sm text-blue-700 font-medium">QuantChat is thinking</div>
      <div className="text-xs text-blue-600">Analyzing your query and generating insights...</div>
    </div>
    <LoadingDots />
  </div>
);


const VoiceSearchButton = ({ onTranscript, disabled }) => {
  const {
    hasError,
    isMIC,
    listening,
    StartlisteningHandler,
    isSupportSpeechRecongnition,
    StopListeningHandler
  } = useSpeechRecognitionHook(onTranscript);

  const [showTooltip, setShowTooltip] = useState(false);

  if (!isSupportSpeechRecongnition()) {
    return (
      <button
        disabled
        className="p-2 text-gray-400 cursor-not-allowed"
        title="Speech recognition not supported in this browser"
      >
        <FiMicOff size={12} />
      </button>
    );
  }

  if (isMIC) {
    return (
      <button
        disabled
        className="p-2 text-gray-400 cursor-not-allowed"
        title="Microphone not available"
      >
        <FiMicOff size={12} />
      </button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={!listening ? StartlisteningHandler : StopListeningHandler}
        disabled={disabled || hasError}
        className={`p-2 rounded-full transition-all duration-300 ${listening
          ? 'text-white bg-[#5D3FD3] border border-[#5D3FD3] shadow-lg'
          : hasError
            ? 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'
            : 'text-[#5D3FD3] bg-white border border-gray-300 hover:bg-[#5D3FD3] hover:text-white hover:border-[#5D3FD3]'
          }`}
        whileHover={!disabled && !hasError ? { scale: 1.05 } : {}}
        whileTap={!disabled && !hasError ? { scale: 0.95 } : {}}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={hasError ? "Microphone access denied" : listening ? "Stop listening" : "Start voice search"}
      >
        <motion.div
          animate={listening ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={listening ? {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
        >
          {listening ? (
            <div className="relative">
              <FiMic size={12} />
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          ) : (
            <FiMic size={12} />
          )}
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 -left-20 transform -translate-x-1/2 bg-[#5D3FD3] text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50"
          >
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-4 bg-white rounded-full"
                    animate={{
                      height: [4, 12, 4],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
              <span>Listening... Speak now</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTooltip && !listening && !hasError && (
          <motion.div
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-9 left-[-29px] transform -translate-x-1/2 bg-[#5D3FD3] text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50"
          >
            Voice search
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#5D3FD3] rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ErrorMessageGenerate = (code) => {
  let currentError = null;
  switch (code) {
    case 'ISE':
      currentError = "The server encountered an internal error or misconfiguration and was unable to complete your request"
      break;
    case 'SI':
      currentError = "Your session has expired. Please connect again"
      break;
    case 'SNF':
      currentError = "This action requires an active session. Please connect again for this action";
      break;
    default:
      currentError = "Something went wrong on our end. Please try again later.";
      break;
  }
  return currentError;
}

export default function Chat() {
  const [selectedDb, setSelectedDb] = useState("");
  const [dbStatus, setDbStatus] = useState("");
  const [message, setMessage] = useState("");
  const [copiedItems, setCopiedItems] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [chats, setChats] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [checkingDbStatus, setCheckingDbStatus] = useState(false);
  const [showDBInfo, setShowDBInfo] = useState(false);
  const [selectedDbDetails, setSelectedDbDetails] = useState(null);
  const [schemaData, setSchemaData] = useState(null);
  const [showStatus, setShowStatus] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [hasShownWelcomeMessage, setHasShownWelcomeMessage] = useState(false);
  const [chartType] = useState(["Bar Chart", "Line Chart", "Histogram", "Scatter Plot"]);
  const [loadingFastAPI, setLoadingFastAPI] = useState(false);
  const [isSideBaropen, setIsSideBarOpen] = useState(false);

  const { sessionIDData, GetSessionID, checkCurrentSessionId, InsertSessionStorage, RemoveSessionId } = useContext(SessionIDContext);

  const [currentSelectedID, setCurrentSelectedID] = useState("");
  const [galleryModal, setGalleryModal] = useState({
    isOpen: false,
    images: [],
    startIndex: 0
  });
  const [activeSpeechChatId, setActiveSpeechChatId] = useState(null);

  // Scroll state management
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);


  // update change for chat history in db chat component
  const [currentChatId, setCurrentChatID] = useState(null);
  const [chatHistoryData, setChatHistoryData] = useState([])
  const [ArchData, setArchData] = useState([]);

  const [isdeleteAlert, setIsDeleteAlert] = useState(false);
  const [currentDeleteItem, setCurrentDeleteItem] = useState(null);



  const CreateNewChatHistory = (usermessage) => {
    if (currentChatId) {

      setChatHistoryData(prev => prev.map((item) => {
        if (item?.id === currentChatId) {
          return { ...item, chatHistory: [...item.chatHistory, usermessage] };
        }
        return item;
      }))

      setArchData(prev => prev.map((item) => {
        if (item?.id === currentChatId) {
          return { ...item, chatHistory: [...item.chatHistory, usermessage] };
        }
        return item;
      }))

      return currentChatId;

    } else {
      let history = {
        id: Date.now(),
        title: usermessage.text,
        chatHistory: [usermessage]
      }
      setCurrentChatID(history.id);
      setChatHistoryData([history, ...chatHistoryData]);

      return history.id;
    }
  }


  const IsDBConnected = (status) => status === 'Connected' ? true : false;

  const IsSessionGenerated = (dbID) => {
    try {
      if (typeof checkCurrentSessionId === 'function') {
        const checked = checkCurrentSessionId(dbID);
        if (checked) return true;
      }
    } catch (e) {
      console.error('Error checking session:', e);
    }
    const findvalue = sessionIDData.find((val) => val.dbid === dbID);
    return !!findvalue;
  };

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

  const handleFastAPIConnection = async (dbid) => {
    if (!selectedDbDetails) return;

    setLoadingFastAPI(true);
    const StatusSessionId = typeof checkCurrentSessionId === 'function' ? checkCurrentSessionId(dbid) : false;

    if (StatusSessionId) {
      toast.warning('Session ID already generated!');
      setLoadingFastAPI(false);
      return;
    }

    try {
      const connectFastAPI = await connectDBPinggy(selectedDbDetails);

      if (connectFastAPI.success) {
        await InsertSessionStorage(connectFastAPI);
        toast.success('Session ID generated successfully!');
        // Refresh the current session ID
        getSessionIDWithDBID(dbid);
      } else {
        toast.error(connectFastAPI.message || 'Failed to generate session key');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate session key');
    } finally {
      setLoadingFastAPI(false);
    }
  };

  const handleDeleteSessionId = async (dbid) => {
    try {
      await RemoveSessionId(dbid);
      toast.success('Session ID deleted successfully!');
      setCurrentSelectedID("");
    } catch (error) {
      toast.error('Failed to delete session ID');
    }
  };

  const getSessionIDWithDBID = useCallback((id) => {
    if (id && sessionIDData) {
      const findValue = sessionIDData.find(val => val.dbid === Number(id));
      if (findValue) {
        setCurrentSelectedID(findValue.token);
      } else {
        setCurrentSelectedID("");
      }
    }
  }, [sessionIDData]);

  useEffect(() => {
    function clearCurrentSessionID() {
      if (currentSelectedID.length > 0) {
        const findvalue = sessionIDData.find((val) => val.token === currentSelectedID);
        if (!findvalue) {
          setCurrentSelectedID("");
        }
      }
    }
    clearCurrentSessionID();
  }, [sessionIDData, currentSelectedID]);

  const handleVoiceTranscript = (transcript) => {
    setMessage(prev => prev + (prev ? ' ' : '') + transcript);
  }

  useEffect(() => {
    const dbKey = getSelectedDbStorageKey();
    const storedDb = sessionStorage.getItem(dbKey) || localStorage.getItem(dbKey) || "";
    if (storedDb) {
      setSelectedDb(storedDb);
    }
  }, []);

  useEffect(() => {
    if (selectedDb && !hasShownWelcomeMessage) {
      setChats([
        {
          type: "bot",
          text: "Welcome to QuantChat! I can help you query your database using natural language. Just describe what data you're looking for.",
        },
      ]);
      setHasShownWelcomeMessage(true);
    } else if (!selectedDb && hasShownWelcomeMessage) {
      setChats([]);
      setHasShownWelcomeMessage(false);
    }
  }, [selectedDb, hasShownWelcomeMessage]);

  const checkDbStatus = useCallback(async () => {
    if (!selectedDb || !initialLoadComplete) {
      setDbStatus("");
      setShowStatus(false);
      return;
    }
    setCheckingDbStatus(true);
    try {
      const dbDetails = await databaseApi.getDetails(selectedDb);
      getSessionIDWithDBID(dbDetails.id);
      let status = dbDetails.status;
      if (status === "Connected (Warning)") status = "Connected";
      if (
        status === "Testing..." ||
        status === "Connecting..." ||
        status === "Disconnecting..."
      ) {
        status = "Disconnected";
      }
      if (status !== "Connected" && status !== "Disconnected") {
        status = dbDetails.status === "Connected" ? "Connected" : "Disconnected";
      }
      setDbStatus(status);
      setSelectedDbDetails(dbDetails);
      setShowStatus(true);
    } catch (err) {
      setDbStatus("Disconnected");
      setSelectedDbDetails(null);
      setShowStatus(true);
    } finally {
      setCheckingDbStatus(false);
    }
  }, [selectedDb, initialLoadComplete, getSessionIDWithDBID]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAll() {
      setDbLoading(true);
      try {
        const dbListResp = await databaseApi.getAll({ page: 1, limit: 100 });
        const dbList = Array.isArray(dbListResp.databases)
          ? dbListResp.databases.map((db) => ({
            id: db.id?.toString() ?? "",
            name: db.name ?? "(no name)",
          }))
          : [];
        if (isMounted) setDatabases(dbList);

        let token = getToken();
        if (token) {
          try {
            let selectedDbResp = await authApi.getSelectedDatabase();
            let serverSelectedDb = selectedDbResp.success
              ? selectedDbResp.selectedDatabase?.toString()
              : "";
            if (
              serverSelectedDb &&
              dbList.some((db) => db.id === serverSelectedDb)
            ) {
              setSelectedDb(serverSelectedDb);
              const dbKey = getSelectedDbStorageKey();
              sessionStorage.setItem(dbKey, serverSelectedDb);
              localStorage.setItem(dbKey, serverSelectedDb);
            } else {
              setSelectedDb("");
              const dbKey = getSelectedDbStorageKey();
              sessionStorage.removeItem(dbKey);
              localStorage.removeItem(dbKey);
              if (serverSelectedDb) await authApi.setSelectedDatabase("");
            }
          } catch (err) {
            setSelectedDb("");
            const dbKey = getSelectedDbStorageKey();
            sessionStorage.removeItem(dbKey);
            localStorage.removeItem(dbKey);
          }
        }
      } catch (error) {
        setDatabases([]);
        setSelectedDb("");
        const dbKey = getSelectedDbStorageKey();
        sessionStorage.removeItem(dbKey);
        localStorage.removeItem(dbKey);
      } finally {
        if (isMounted) {
          setDbLoading(false);
          setInitialLoadComplete(true);
        }
      }
    }
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadComplete) return;
    const dbKey = getSelectedDbStorageKey();
    if (selectedDb) {
      sessionStorage.setItem(dbKey, selectedDb);
      localStorage.setItem(dbKey, selectedDb);
    } else {
      sessionStorage.removeItem(dbKey);
      localStorage.removeItem(dbKey);
    }
    let token = getToken();
    if (token) {
      authApi.setSelectedDatabase(selectedDb);
    }
  }, [selectedDb, initialLoadComplete]);

  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  const fetchSchemaData = async () => {
    if (!selectedDb || dbStatus !== "Connected") return;
    try {
      const result = await databaseApi.getSchema(selectedDb);
      if (result.success) {
        setSchemaData(result);
      }
    } catch (error) {
      setSchemaData(null);
    }
  };

  const chatBotResponse = async (userMsg, currentSelectedID) => {
    try {
      setIsBotTyping(true);
      const responseSQLBOT = await ChatWithSQL_API(userMsg, currentSelectedID);
      setIsBotTyping(false);
      return responseSQLBOT;
    } catch (err) {
      console.log(err.message + 'error on chating with bot!')
      return { success: false }
    }
  }

  const handleSend = async () => {
    if (message.trim() === "") return;

    const userMessage = message.trim();
    const currenthistoryId = CreateNewChatHistory({ type: "user", text: userMessage })

    if (!selectedDb) {
      if (currentChatId || currenthistoryId) {
        setChatHistoryData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                type: "bot",
                text: "Please select a database before chatting.",
              }]
            }
          }

          return val
        }))

        setArchData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                type: "bot",
                text: "Please select a database before chatting.",
              }]
            }
          }

          return val
        }))
      }

      setMessage("");
      return;
    }



    setMessage("");
    if (dbStatus !== "Connected") {
      if (currentChatId || currenthistoryId) {
        setChatHistoryData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                type: "bot",
                text: "Database is currently disconnected. Your message has been queued and will be processed once the connection is restored.",
                status: "disconnected"
              }]
            }
          }

          return val
        }))

        setArchData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                type: "bot",
                text: "Database is currently disconnected. Your message has been queued and will be processed once the connection is restored.",
                status: "disconnected"
              }]
            }
          }

          return val
        }))
      }
      return;
    }


    const currentSessionToken = GetSessionID ? GetSessionID(Number(selectedDb)) : currentSelectedID;
    const botapi_response = await chatBotResponse(userMessage, currentSessionToken);
    const chatID = Date.now();
    if (botapi_response.success) {
      const filterColumnsTable = botapi_response.data.length > 0 ? Object.keys(botapi_response.data[0]) : []
      if (currentChatId || currenthistoryId) {
        setChatHistoryData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                chatID,
                summarize: { value: "", isloading: false, error: { status: false, message: "" } },
                type: "bot",
                text: "I understand you're looking for data insights. While I process your specific query, here's an example of what I can do with your data.",
                sql: botapi_response.sql,
                results: botapi_response.data,
                chartData: {
                  isloading: false,
                  image: "",
                  isVisualForm: false,
                  question: "",
                  x_axis: "",
                  y_axis: "",
                  charttype: "",
                  dataColumn: filterColumnsTable,
                  error: { status: false, message: "" }
                },
                sqlerror: { status: false, message: "" },
                error: { status: false, message: "" }
              }]
            }
          }
          return val
        }))

        setArchData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                chatID,
                summarize: { value: "", isloading: false, error: { status: false, message: "" } },
                type: "bot",
                text: "I understand you're looking for data insights. While I process your specific query, here's an example of what I can do with your data.",
                sql: botapi_response.sql,
                results: botapi_response.data,
                chartData: {
                  isloading: false,
                  image: "",
                  isVisualForm: false,
                  question: "",
                  x_axis: "",
                  y_axis: "",
                  charttype: "",
                  dataColumn: filterColumnsTable,
                  error: { status: false, message: "" }
                },
                sqlerror: { status: false, message: "" },
                error: { status: false, message: "" }
              }]
            }
          }
          return val
        }))
      }

    } else {

      if (currentChatId || currenthistoryId) {
        setChatHistoryData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                chatID,
                summarize: { value: "", isloading: false, error: { status: false, message: "" } },
                type: "bot",
                text: "",
                sql: "",
                results: [],
                chartData: {
                  isloading: false,
                  image: "",
                  isVisualForm: false,
                  question: "",
                  x_axis: "",
                  y_axis: "",
                  charttype: "",
                  dataColumn: [],
                  error: { status: false, message: "" }
                },
                sqlerror: { status: false, message: "" },
                error: { status: true, message: botapi_response.message }
              }]
            }
          }
          return val
        }))

        setArchData(prev => prev.map((val) => {
          if (val?.id === currentChatId || val?.id === currenthistoryId) {
            return {
              ...val, chatHistory: [...val.chatHistory, {
                chatID,
                summarize: { value: "", isloading: false, error: { status: false, message: "" } },
                type: "bot",
                text: "",
                sql: "",
                results: [],
                chartData: {
                  isloading: false,
                  image: "",
                  isVisualForm: false,
                  question: "",
                  x_axis: "",
                  y_axis: "",
                  charttype: "",
                  dataColumn: [],
                  error: { status: false, message: "" }
                },
                sqlerror: { status: false, message: "" },
                error: { status: true, message: botapi_response.message }
              }]
            }
          }

          return val
        }))
      }

    }
  };


  const AddArchiveHandler = (id) => {
    setArchData([...ArchData, ...chatHistoryData.filter((val) => val.id === id)]);
    setChatHistoryData(prev => prev.filter(val => val.id !== id));
    ToasterFunction.success('Add archived succussfully')
    setCurrentChatID(null);
  }

  const RemoveArchiveHandler = (id) => {
    setChatHistoryData([...chatHistoryData, ...ArchData.filter(val => val.id === id)]);
    setArchData(prev => prev.filter(val => val.id !== id));
    ToasterFunction.success('Removed archvied succussfully')
    !currentChatId && setCurrentChatID(id)
  }


  const UpdateTitle = (title, id) => {
    setChatHistoryData(prev => prev.map((val) => {
      if (val.id === id) {
        return { ...val, title: title }
      }
      return val;
    }))

    setArchData(prev => prev.map((val) => {
      return val.id === id ? { ...val, title: title } : val;
    }))
  }

  const NewChatWindow = () => {
    setCurrentChatID(null);
    setChats([])
    setTimeout(() => {
      setChats([
        {
          type: "bot",
          text: "Welcome to QuantChat! I can help you query your database using natural language. Just describe what data you're looking for.",
        },
      ]);
    }, 100)
    ToasterFunction.success('New chat added')
  }

  const ChangeChatWindow = (id) => {
    if (!(id === currentChatId)) {
      setCurrentChatID(id);

      const findChat = chatHistoryData.find(val => val?.id === id) || ArchData.find(val => val?.id === id);

      findChat && ToasterFunction.success(`${findChat?.title} chat changed`)
    }

  }

  const DeleteHistoryMessageHandler = (id) => {
    if (id === currentChatId) {
      setCurrentChatID(null);
      setChatHistoryData(chatHistoryData.filter((val) => val.id !== id));
      setArchData(ArchData.filter((val) => val.id !== id));
    } else {
      setChatHistoryData(chatHistoryData.filter((val) => val.id !== id));
      setArchData(ArchData.filter((val) => val.id !== id));
    }

    CloseDeleteAlert()
  }


  const DeleteActivatedHandler = (id) => {

    const findMessage = chatHistoryData.filter(val => val?.id === id);
    const findMessage2 = ArchData.filter(val => val?.id === id);
    setCurrentDeleteItem(findMessage.length > 0 ? findMessage[0] : findMessage2[0]);
    setIsDeleteAlert(true);

  }

  const CloseDeleteAlert = () => {
    setIsDeleteAlert(false)
    setCurrentDeleteItem(null);
  }





  const handleDbSelect = async (dbId) => {
    setSelectedDb(dbId);
    const dbKey = getSelectedDbStorageKey();
    if (dbId) {
      getSessionIDWithDBID(dbId)
      sessionStorage.setItem(dbKey, dbId);
      localStorage.setItem(dbKey, dbId);
    } else {
      sessionStorage.removeItem(dbKey);
      localStorage.removeItem(dbKey);
    }
    setShowDBInfo(false);
  };

  const handleClearDb = () => {
    setSelectedDb("");
    const dbKey = getSelectedDbStorageKey();
    sessionStorage.removeItem(dbKey);
    localStorage.removeItem(dbKey);
    setShowDBInfo(false);
    setShowStatus(false);
    setCurrentSelectedID("");
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

  const convertNormalText = (summary) => {
    return summary.includes("**") ? summary.replace(/\*\*/g, " ") : summary;
  }

  const GenerateSummarize = async (chat) => {

    if (chat.summarize.value || chat.summarize.error.status) {
      console.log(chat.summarize)
      setChatHistoryData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val => {
              if (chat.chatID === val.chatID) {
                return { ...chat, summarize: { value: "", isloading: false, error: { status: false, message: "" } } }
              }
              return val
            }))
          }
        }
        return ch;
      }))

      setArchData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val => {
              if (chat.chatID === val.chatID) {
                return { ...chat, summarize: { value: "", isloading: false, error: { status: false, message: "" } } }
              }
              return val
            }))
          }
        }
        return ch;
      }))
      setActiveSpeechChatId(null);
    } else {
      setChatHistoryData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val => {
              if (chat.chatID === val.chatID) {
                return { ...chat, summarize: { ...chat.summarize, isloading: true } };
              }
              return val
            }))
          }
        }
        return chat;
      }))

      setArchData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val => {
              if (chat.chatID === val.chatID) {
                return { ...chat, summarize: { ...chat.summarize, isloading: true } };
              }
              return val
            }))
          }
        }
        return ch;
      }))

      const currentSessionToken = GetSessionID ? GetSessionID(Number(selectedDb)) : currentSelectedID;
      const respback = await getSummarizeSQL_API(chat.results, currentSessionToken);

      if (respback.success) {


        setChatHistoryData(prev => prev.map(ch => {
          if (ch?.id === currentChatId) {
            return {
              ...ch, chatHistory: ch.chatHistory.map((val => {
                if (chat.chatID === val.chatID) {
                  return {
                    ...chat, summarize: {
                      value: convertNormalText(respback?.summary),
                      isloading: false,
                      error: { status: false, message: "" }
                    }
                  };
                }
                return val
              }))
            }
          }
          return chat;
        }))

        setArchData(prev => prev.map(ch => {
          if (ch?.id === currentChatId) {
            return {
              ...ch, chatHistory: ch.chatHistory.map((val => {
                if (chat.chatID === val.chatID) {
                  return {
                    ...chat, summarize: {
                      value: convertNormalText(respback?.summary),
                      isloading: false,
                      error: { status: false, message: "" }
                    }
                  };
                }
                return val
              }))
            }
          }
          return ch;
        }))
      } else {


        setChatHistoryData(prev => prev.map(ch => {
          if (ch?.id === currentChatId) {
            return {
              ...ch, chatHistory: ch.chatHistory.map((val => {
                if (chat.chatID === val.chatID) {
                  return {
                    ...chat, summarize: {
                      value: "",
                      isloading: false,
                      error: { status: true, message: respback.message }
                    }
                  };
                }
                return val
              }))
            }
          }
          return chat;
        }))

        setArchData(prev => prev.map(ch => {
          if (ch?.id === currentChatId) {
            return {
              ...ch, chatHistory: ch.chatHistory.map((val => {
                if (chat.chatID === val.chatID) {
                  return {
                    ...chat, summarize: {
                      value: "",
                      isloading: false,
                      error: { status: true, message: respback.message }
                    }
                  };
                }
                return val
              }))
            }
          }
          return ch;
        }))
      }
    }
  }

  const SelectAxishandler = (event, type, chatid) => {

    if (type === 'x') {

      setArchData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val) => {
              if (chatid === val.chatID) {
                return { ...val, chartData: { ...val.chartData, x_axis: event.target.value } }
              }
              return val
            })
          }
        }
        return ch;
      }))

      setChatHistoryData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val) => {
              if (chatid === val.chatID) {
                return { ...val, chartData: { ...val.chartData, x_axis: event.target.value } }
              }
              return val
            })
          }
        }
        return ch;
      }))






      // setChats(chats.map(val => {
      //   if (val.chatID === chatid) {
      //     return { ...val, chartData: { ...val.chartData, x_axis: event.target.value } }
      //   }
      //   return val
      // }))
    } else {


      setArchData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val) => {
              if (chatid === val.chatID) {
                return { ...val, chartData: { ...val.chartData, y_axis: event.target.value } }
              }

              return val
            })
          }
        }
        return ch;
      }))

      setChatHistoryData(prev => prev.map(ch => {
        if (ch?.id === currentChatId) {
          return {
            ...ch, chatHistory: ch.chatHistory.map((val) => {
              if (chatid === val.chatID) {
                return { ...val, chartData: { ...val.chartData, y_axis: event.target.value } }
              }

              return val
            })
          }
        }
        return ch;
      }))

      // setChats(chats.map(val => {
      //   if (val.chatID === chatid) {
      //     return { ...val, chartData: { ...val.chartData, y_axis: event.target.value } }
      //   }
      //   return val
      // }))
    }
  }

  const SelectChartType = (event, chatid) => {



    setArchData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (chatid === val.chatID) {
              return { ...val, chartData: { ...val.chartData, charttype: event.target.value } }
            }

            return val
          })
        }
      }
      return ch;
    }))

    setChatHistoryData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (chatid === val.chatID) {
              return { ...val, chartData: { ...val.chartData, charttype: event.target.value } }
            }

            return val
          })
        }
      }
      return ch;
    }))

    // setChats(chats.map(val => {
    //   if (val.chatID === chatid) {
    //     return { ...val, chartData: { ...val.chartData, charttype: event.target.value } }
    //   }
    //   return val;
    // }))
  }

  const OpenChartFormhandle = (chatid) => {

    setArchData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (val.type === 'bot' && val.chatID === chatid) {
              const updatedChat = {
                ...val,
                chartData: { ...val.chartData, isVisualForm: !val.chartData.isVisualForm }
              };
              if (updatedChat.chartData.isVisualForm) {
                setTimeout(() => {
                  const inputElement = document.getElementById(`chart-input-${chatid}`);
                  if (inputElement) {
                    inputElement.focus();
                  }
                }, 100);
              }
              return updatedChat;
            }
            return val;
          })
        }
      }
      return ch;
    }))

    setChatHistoryData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (val.type === 'bot' && val.chatID === chatid) {
              const updatedChat = {
                ...val,
                chartData: { ...val.chartData, isVisualForm: !val.chartData.isVisualForm }
              };
              if (updatedChat.chartData.isVisualForm) {
                setTimeout(() => {
                  const inputElement = document.getElementById(`chart-input-${chatid}`);
                  if (inputElement) {
                    inputElement.focus();
                  }
                }, 100);
              }
              return updatedChat;
            }
            return val;
          })
        }
      }
      return ch;
    }))




    // setChats(chats.map((val) => {
    //   if (val.type === 'bot' && val.chatID === chatid) {
    //     const updatedChat = {
    //       ...val,
    //       chartData: { ...val.chartData, isVisualForm: !val.chartData.isVisualForm }
    //     };
    //     if (updatedChat.chartData.isVisualForm) {
    //       setTimeout(() => {
    //         const inputElement = document.getElementById(`chart-input-${chatid}`);
    //         if (inputElement) {
    //           inputElement.focus();
    //         }
    //       }, 100);
    //     }
    //     return updatedChat;
    //   }
    //   return val;
    // }))
  }

  const ChartQuestionQuery = (chatid, event) => {

    setArchData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (chatid === val.chatID) {
              return { ...val, chartData: { ...val.chartData, question: event.target.value } }
            }

            return val
          })
        }
      }
      return ch;
    }))

    setChatHistoryData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (chatid === val.chatID) {
              return { ...val, chartData: { ...val.chartData, question: event.target.value } }
            }

            return val
          })
        }
      }
      return ch;
    }))


    // setChats(chats.map((val) => {
    //   if (val.chatID === chatid) {
    //     return { ...val, chartData: { ...val.chartData, question: event.target.value } }
    //   }
    //   return val;
    // }))
  }

  const SetPendingVisual = (chatid, value) => {

    setArchData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (chatid === val.chatID) {
              return { ...val, chartData: { ...val.chartData, isloading: value } }
            }

            return val
          })
        }
      }
      return ch;
    }))

    setChatHistoryData(prev => prev.map(ch => {
      if (ch?.id === currentChatId) {
        return {
          ...ch, chatHistory: ch.chatHistory.map((val) => {
            if (chatid === val.chatID) {
              return { ...val, chartData: { ...val.chartData, isloading: value } }
            }

            return val
          })
        }
      }
      return ch;
    }))


  }

  const handleChartFormSubmit = (chatid) => {
    SubmitVisualFormhandler(chatid);
  }

  const handleChartInputKeyDown = (e, chatid) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChartFormSubmit(chatid);
    }
  }

  const SubmitVisualFormhandler = async (chatid) => {
    try {


      const findchat = chatHistoryData.map((val) => {
        if (val?.id === currentChatId) {
          return val.chatHistory.filter(ch => {
            if (ch?.chatID === chatid) {
              return ch
            }
          })
        }
      });

      const findchat_archive = ArchData.map((val) => {
        if (val?.id === currentChatId) {
          return val.chatHistory.filter(ch => {
            if (ch?.chatID === chatid) {
              return ch
            }
          })
        }
      });

      let finalData = null
      if (findchat.length > 0 && findchat[0] !== undefined && findchat[0].length > 0 && findchat[0][0] !== undefined) {
        finalData = findchat[0][0]
      } else if (findchat_archive.length > 0 && findchat_archive[0] !== undefined && findchat_archive[0].length > 0 && findchat_archive[0][0] !== undefined) {
        finalData = findchat_archive[0][0]
      }
      // console.log(findchat,findchat_archive)

      const chatdata = finalData?.chartData

      if (finalData) {
        const currentSessionToken = GetSessionID ? GetSessionID(Number(selectedDb)) : currentSelectedID;
        const resdata = {
          "session_id": currentSessionToken,
          "data": finalData.results,
          "user_question": chatdata.question,
          "chart_type": chatdata.charttype,
          "x_axis": chatdata.x_axis,
          "y_axis": chatdata.y_axis
        }
        SetPendingVisual(chatid, true)
        const responseback = await GetVisualizationSQL_API(resdata);
        if (responseback.success) {
          const imageURI = `data:image/png;base64,${responseback.imageURI}`;
          console.log(imageURI)
          // setChats(chats.map(val => {
          //   if (val.chatID === chatid) {
          //     return {
          //       ...val,
          //       chartData: {
          //         ...val.chartData,
          //         image: imageURI,
          //         isloading: false,
          //         error: { status: false, message: "" }
          //       }
          //     };
          //   }
          //   return val;
          // }))

          setArchData(prev => prev.map(ch => {
            if (ch?.id === currentChatId) {
              return {
                ...ch, chatHistory: ch.chatHistory.map((val) => {
                  if (chatid === val.chatID) {
                    return {
                      ...val, chartData: {
                        ...val.chartData,
                        image: imageURI,
                        isloading: false,
                        error: { status: false, message: "" }
                      }
                    }
                  }

                  return val
                })
              }
            }
            return ch;
          }))

          setChatHistoryData(prev => prev.map(ch => {
            if (ch?.id === currentChatId) {
              return {
                ...ch, chatHistory: ch.chatHistory.map((val) => {
                  if (chatid === val.chatID) {
                    return {
                      ...val, chartData: {
                        ...val.chartData,
                        image: imageURI,
                        isloading: false,
                        error: { status: false, message: "" }
                      }
                    }
                  }

                  return val
                })
              }
            }
            return ch;
          }))
        } else {
          // setChats(chats.map(val => {
          //   if (val.chatID === chatid) {
          //     return {
          //       ...val,
          //       chartData: {
          //         ...val.chartData,
          //         isloading: false,
          //         isVisualForm: true,
          //         error: { status: true, message: responseback.message }
          //       }
          //     };
          //   }
          //   return val;
          // }))

          setArchData(prev => prev.map(ch => {
            if (ch?.id === currentChatId) {
              return {
                ...ch, chatHistory: ch.chatHistory.map((val) => {
                  if (chatid === val.chatID) {
                    return {
                      ...val, chartData: {
                        ...val.chartData,
                        isloading: false,
                        isVisualForm: true,
                        error: { status: true, message: responseback.message }
                      }
                    }
                  }

                  return val
                })
              }
            }
            return ch;
          }))

          setChatHistoryData(prev => prev.map(ch => {
            if (ch?.id === currentChatId) {
              return {
                ...ch, chatHistory: ch.chatHistory.map((val) => {
                  if (chatid === val.chatID) {
                    return {
                      ...val, chartData: {
                        ...val.chartData,
                        isloading: false,
                        isVisualForm: true,
                        error: { status: true, message: responseback.message }
                      }
                    }
                  }

                  return val
                })
              }
            }
            return ch;
          }))



        }
      }
    } catch (err) {
      console.log(err.message)
    }
  }

  const handleUpdateSql = async (chatid, editedSql) => {
    if (!editedSql) return;
    const currentSessionToken = GetSessionID ? GetSessionID(Number(selectedDb)) : null;
    if (currentSessionToken) {
      try {
        setChats(chats.map(chat =>
          chat.chatID === chatid
            ? { ...chat, sqlUpdating: true, tableLoading: true }
            : chat
        ));
        const sqlQueryEncode = btoa(editedSql);
        const sqldataFromQuery = await api_AI.post('/api/v1/database/execute-sql', {
          session_id: currentSessionToken,
          sql_query: sqlQueryEncode
        });
        if (sqldataFromQuery.data.success) {
          setChats(chats.map(chat => {
            if (chat.chatID === chatid) {
              const filterColumnsTable = sqldataFromQuery.data.data.length > 0 ? Object.keys(sqldataFromQuery.data.data[0]) : [];
              return {
                ...chat,
                sql: editedSql,
                results: sqldataFromQuery.data.data,
                chartData: {
                  ...chat.chartData,
                  dataColumn: filterColumnsTable,
                  image: "",
                  isVisualForm: false
                },
                sqlerror: { status: false, message: "" },
                summarize: { value: "", isloading: false, error: { status: false, message: "" } },
                sqlUpdating: false,
                tableLoading: false
              };
            }
            return chat;
          }));
        } else {
          setChats(chats.map(chat =>
            chat.chatID === chatid
              ? { ...chat, sqlUpdating: false, tableLoading: false, sqlerror: { status: true, message: "Failed to execute updated SQL query. Please check your syntax" }, }
              : chat
          ));
        }
      } catch (err) {
        setChats(chats.map(chat =>
          chat.chatID === chatid
            ? { ...chat, sqlUpdating: false, tableLoading: false, sqlerror: { status: true, message: "Failed to execute updated SQL query. Please check your syntax" }, }
            : chat
        ));
      }
    } else {
      setChats(chats.map(chat =>
        chat.chatID === chatid
          ? { ...chat, sqlUpdating: false, tableLoading: false, sqlerror: { status: true, message: "SNF" }, }
          : chat
      ));
    }
  };

  const openImageGallery = (chatID, image) => {
    const allChartImages = chats
      .filter(chat => chat.chartData?.image)
      .map(chat => chat.chartData.image);

    const findHistoryData = chatHistoryData.filter(val => val?.id === currentChatId);
    const findArchivedData = ArchData.filter(val => val?.id === currentChatId);

    let finalData = null
    if (findHistoryData.length > 0 && findHistoryData[0] !== undefined) {
      finalData = findHistoryData[0].chatHistory.filter(val => val.chartData?.image).map(chat => chat.chartData.image)
    } else if (findArchivedData.length > 0 && findArchivedData[0] !== undefined) {
      finalData = findArchivedData[0].chatHistory.filter(val => val.chartData?.image).map(chat => chat.chartData.image)
    }


    const currentImageIndex = finalData.indexOf(image);
    setGalleryModal({
      isOpen: true,
      images: finalData,
      startIndex: currentImageIndex !== -1 ? currentImageIndex : 0
    });
  };

  const closeImageGallery = () => {
    setGalleryModal({
      isOpen: false,
      images: [],
      startIndex: 0
    });
  };

  const handleSpeechStop = (chatId) => {
    setActiveSpeechChatId(null);
  };

  const ErrorStyleChat = (errorFlag) => {
    return errorFlag ? 'bg-red-50 border border-red-100' : ' bg-gray-50 border border-gray-100'
  }

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
            className="max-w-3xl px-4  py-3 rounded-lg shadow-sm text-sm bg-[#5D3FD3] text-white rounded-br-none relative"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {/* <div className="flex items-center flex-col-reverse  justify-between">
              <div className="flex-1 pr-4 break-words whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{chat.text}</div>
              <div className="w-full flex items-center justify-end mb-4 mr-0">
                <div className="bg-white p-1 rounded-full flex-shrink-0 ml-2">
                  <FiUser className="text-[#5D3FD3]" size={14} />
                </div>
              </div>
            </div> */}

            {/* user icon update */}

            <div className="flex items-start   justify-between">
              <div className="flex-1 pr-3 break-words whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{chat.text}</div>
              <div className="bg-white p-1 rounded-full flex-shrink-0 ml-0 ">
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
    } else if (chat.status === "disconnected") {
      return (
        <div className="flex justify-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm bg-yellow-50 border border-yellow-200 rounded-bl-none"
            style={{ overflowWrap: 'anywhere' }}
          >
            <div className="flex items-center mb-2">
              <div className="bg-yellow-500 p-1 rounded-full mr-2">
                <FiDatabase className="text-white" size={14} />
              </div>
              <span className="text-xs text-yellow-700 font-medium">Database Status</span>
            </div>
            <div className="mb-3 text-yellow-700 break-words whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{chat.text}</div>
            <div className="flex items-center mt-2">
              <button
                onClick={checkDbStatus}
                disabled={checkingDbStatus}
                className="flex items-center text-xs text-yellow-700 hover:text-yellow-800 disabled:opacity-50"
              >
                <FiRefreshCw className={`mr-1 ${checkingDbStatus ? 'animate-spin' : ''}`} size={12} />
                {checkingDbStatus ? 'Checking status...' : 'Retry connection'}
              </button>
            </div>
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
            className={`max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm rounded-bl-none ${ErrorStyleChat(chat?.error?.status)}`}
            style={{ overflowWrap: 'anywhere' }}
          >
            <div className="flex items-center mb-2">
              <div className={chat.text ? "bg-[#5D3FD3] p-1 rounded-full mr-2" : "bg-red-600 p-1 rounded-full mr-2"}>
                <FiMessageSquare className="text-white" size={14} />
              </div>
              <span className={chat.text ? "text-xs text-[#5D3FD3] font-medium" : "text-xs text-red-600 font-medium"}>QuantChat</span>
            </div>
            {chat.text ?
              <div className="mb-3 text-gray-700 break-words whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{chat.text}</div> :
              chat.error.status && <div>
                {chat.error.message === 'ISE' && <div className="my-4 flex items-center text-red-600 text-sm">
                  <LuServerOff className="w-5 h-5 mr-2" /> The server encountered an internal error or misconfiguration and was unable to complete your request
                </div>}
                {chat.error.message === 'SI' && <div className="my-4 flex items-center text-red-600 text-sm">
                  <IoTimeOutline className="w-5 h-5 mr-2" /> Your session has expired. Please connect again
                </div>}
                {chat.error.message === 'SNF' && <div className="my-4 flex items-center text-red-600 text-sm">
                  <PiLockKeyFill className="w-5 h-5 mr-2" /> This action requires an active session. Please connect again for this action
                </div>}
                {(chat.error.message !== 'SI' && chat.error.message !== 'ISE' && chat.error.message !== 'SNF') && <div className="my-4 flex items-center text-red-600 text-sm">
                  <BiSolidMessageAltError className="w-5 h-5 mr-2" /> Something went wrong on our end. Please try again later.
                </div>}
              </div>
            }
            {chat.sql && (
              <SQLQuery
                chat={chat}
                index={index}
                copiedItems={copiedItems}
                onCopy={(text, key) => copyToClipboard(text, key)}
                onUpdateSql={(editedSql) => handleUpdateSql(chat.chatID, editedSql)}
              />
            )}
            {(chat?.results?.length > 0 && !chat.sqlerror.status) && (
              <div className="mt-4 relative">
                <QueryResults
                  results={chat.results}
                  tableLoading={chat.tableLoading}
                  showHeader={true}
                />
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => GenerateSummarize(chat)}
                    className="flex items-center text-xs text-[#5D3FD3] hover:text-[#6d4fe4] font-medium transition-colors disabled:opacity-50"
                  >
                    {chat.summarize.isloading ? (
                      <>
                        <Sparkles className="mr-1 animate-pulse" size={12} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiBarChart2 className="mr-1" size={12} />
                        {(chat.summarize.value || chat.summarize.error.status) ? 'Hide Summary' : 'Generate Summary'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => OpenChartFormhandle(chat.chatID)}
                    className="flex items-center text-xs text-[#5D3FD3] hover:text-[#6d4fe4] font-medium transition-colors disabled:opacity-50"
                  >
                    <>
                      <FiPieChart className="mr-1" size={12} />
                      {chat.chartData.isVisualForm ? 'Hide Visualization' : 'Visualize Data'}
                    </>
                  </button>
                </div>
                <GenerateSummary
                  chat={chat}
                  activeSpeechChatId={activeSpeechChatId}
                  handleSpeechStop={handleSpeechStop}
                />
                <VisualizeData
                  chat={chat}
                  chartType={chartType}
                  SelectChartType={SelectChartType}
                  SelectAxishandler={SelectAxishandler}
                  ChartQuestionQuery={ChartQuestionQuery}
                  handleChartInputKeyDown={handleChartInputKeyDown}
                  handleChartFormSubmit={handleChartFormSubmit}
                  openImageGallery={openImageGallery}
                />
              </div>
            )}
            {(chat?.results?.length === 0 && chat.sqlerror.status) && (<div className="bg-orange-50 border border-orange-100 rounded-md p-3 text-sm text-orange-700">
              <div className="break-words whitespace-pre-wrap break-all mt-2 text-xs flex item-center" style={{ overflowWrap: 'anywhere' }}>
                <PiWarningFill className="mr-3" /> No data founded check the query or data
              </div>
            </div>)}
            {chat?.sqlerror?.status && (<div className="bg-red-50 border border-red-100 rounded-md p-3 text-sm text-red-700">
              <div className="font-medium text-red-700 mb-1 flex items-center justify-between">
                <div className="flex items-center">
                  <BiSolidMessageAltError className="mr-1" size={14} />
                  Error occurs while generating SQL Table
                </div>
              </div>
              <div className="break-words whitespace-pre-wrap break-all mt-2 text-xs" style={{ overflowWrap: 'anywhere' }}>
                {chat.sqlerror.message === 'SNF' ? ErrorMessageGenerate('SNF') : chat.sqlerror.message}
              </div>
            </div>)}
          </motion.div>
        </div>
      );
    }
  };



  const checkStateSidebar = (flag) => {
    // setIsSideBarOpen(flag)
    flag ? setTimeout(() => {
      setIsSideBarOpen(flag)

    }, 300) : setIsSideBarOpen(flag)

  };

  const findCurrentChatHistorydataWithId = (id) => {
    if (currentChatId) {
      const response = chatHistoryData?.filter(val => val?.id === id)
      const archRes = ArchData?.filter(val => val.id === id);
      return response.length > 0 ? response[0]?.chatHistory : archRes.length > 0 ? archRes[0].chatHistory : []
    }
  }


  const isChatBlocked = !selectedDb;
  const hasRealChats = chats.length > 0;

  return (
    <div  className="min-h-screen bg-gray-200 flex flex-row items-start justify-start  w-full ">
      <div className={`${isSideBaropen ? 'w-[14rem]' : 'w-[2.5rem]'} `}>
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
        className={`min-h-screen bg-gray-200 flex flex-col  ${isSideBaropen ? 'w-[calc(100%-14rem)] SideBodyAdjustOpen' : 'w-[calc(100%-2.5rem)] SideBodyAdjustClose '} `}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >

        <Toaster position="top-center" toastOptions={{ duration: 500, className: 'text-xs' }} />
        <ToastContainer position="top-right" autoClose={5000} />

        <ChatHeader
          selectedDb={selectedDb}
          databases={databases}
          dbLoading={dbLoading}
          onDbSelect={handleDbSelect}
          onClearDb={handleClearDb}
          showStatus={showStatus}
          dbStatus={dbStatus}
          checkingDbStatus={checkingDbStatus}
          onRefreshStatus={checkDbStatus}
          selectedDbDetails={selectedDbDetails}
          schemaData={schemaData}
          fetchSchemaData={fetchSchemaData}
          showDBInfo={showDBInfo}
          setShowDBInfo={setShowDBInfo}
          onGenerateSession={handleFastAPIConnection}
          onDeleteSessionId={handleDeleteSessionId}
          IsSessionGenerated={IsSessionGenerated}
          IsDBConnected={IsDBConnected}
          loadingFastAPI={loadingFastAPI}
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

        <ImageGalleryModal
          isOpen={galleryModal.isOpen}
          onClose={closeImageGallery}
          images={galleryModal.images}
          startIndex={galleryModal.startIndex}
        />
        <div className="flex-1 flex flex-col min-h-0 ">

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">

            {(hasRealChats || chatHistoryData.length > 0) ? (
              <>
                {chats.map((chat, index) => (
                  <div key={chat.chatID ?? index}>{renderChatMessage(chat, index)}</div>
                ))}
                {/* {JSON.stringify(findCurrentChatHistorydataWithId(currentChatId))} */}

                {

                  findCurrentChatHistorydataWithId(currentChatId)?.map((val, index) => {
                    return <div key={val.chatID ?? index}>{renderChatMessage(val, index)}</div>
                  })
                }

                {isBotTyping && <ThinkingAnimation />}

              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 max-w-md mx-auto">
                  <FiMessageSquare className="mx-auto text-4xl mb-4 text-gray-300" />
                  <p className="text-lg mb-2">Select a database to start chatting</p>
                  <p className="text-sm">Choose a database from the dropdown above to begin your conversation with QuantChat</p>
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
                VoiceSearchButton={VoiceSearchButton}
                editingIndex={editingIndex}
                cancelEdit={cancelEdit}
                isChatBlocked={isChatBlocked}
                searchBarType={'database-chat'}
                showStatusMessage={false}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                {!selectedDb
                  ? "Please select a database to chat."
                  : dbStatus !== "Connected"
                    ? "Database is currently disconnected. Your messages will be queued for processing when the connection is restored."
                    : isBotTyping
                      ? "Processing your request... Please wait"
                      : "Press Enter to send, Shift+Enter for new line. QuantChat can make mistakes. Consider checking important information."
                }
              </p>
            </div>
          </div>
        </div>

      </motion.div>

      {isdeleteAlert &&
        <DeleteMessageAlertComponent
          CurrentMessage={currentDeleteItem}
          Cancelhandler={CloseDeleteAlert}
          DeleteHandler={DeleteHistoryMessageHandler}
        />}
    </div>

  );
}