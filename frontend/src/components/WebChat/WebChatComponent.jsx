import  { useState ,useEffect,useCallback} from 'react';
import useSpeechRecognitionHook from '../../hooks/useSpeechRecognitionHook';
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiMicOff } from "react-icons/fi";
import { GeneralChat_API, WebSearchAPI } from '../../utils/api';
import ChatSearchBar from '../Common/ChatSearchBar';
import ChatComponentWC from './ChatComponentWC';
import SliderChatHistoryComponent from './SliderChatHistoryComponent';
import DeleteMessageAlertComponent from './DeleteMessageAlertComponent';
import QuantChatLoadingComponent from "./QuantChatLoadingComponent";
import toast, { Toaster } from 'react-hot-toast';
import ScrollButton from "../Common/ScrollButton";


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



function WebChatComponent() {
    const [message, setMessage] = useState("");
    const [editingIndex, setEditingIndex] = useState(null);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [isChatBlocked] = useState(false);
    const [isdeleteAlert, setIsDeleteAlert] = useState(false);
    const [currentDeleteItem, setCurrentDeleteItem] = useState(null);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [chatHistoryData, setChatHistoryData] = useState([]);
    const [ArchData, setArchData] = useState([]);

    // sidebar open
    const [isSideBaropen, setIsSideBarOpen] = useState(false);

    // scroll state
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [showScrollUp, setShowScrollUp] = useState(false);

    const AddArchiveHandler = (id) => {
        setArchData([...ArchData, ...chatHistoryData.filter((val) => val.id === id)]);
        setChatHistoryData(prev => prev.filter(val => val.id !== id));
        toast.success('Add archived succussfully')
        setCurrentChatId(null);
    }

    const RemoveArchiveHandler = (id) => {
        setChatHistoryData([...chatHistoryData, ...ArchData.filter((val) => val.id === id)]);
        setArchData(prev => prev.filter(val => val.id !== id));
        toast.success('Removed archvied succussfully')
        !currentChatId && setCurrentChatId(id)
    }


    const UpdateTitle = (title, id) => {
        setChatHistoryData(prev => prev.map((val) => {
            if (val.id === id) {
                return { ...val, title: title }
            }
            return val;
        }))

        setArchData(prev => prev.map((val) =>{
            return val.id === id ? {...val,title:title} : val;
        }))
    }


    const NewChatWindow = () => {
        setCurrentChatId(null);
        toast.success('New chat added')
    }

    const ChangeChatWindow = (id) => {
        setCurrentChatId(id);

        const findChat = chatHistoryData.find(val => val.id === id) || ArchData.find(val => val.id === id);
        
        findChat && toast.success(`${findChat?.title} chat changed`)
    }

    const ErrorToast = (message) => {
        toast.error(message)
    }


    const DeleteHistoryMessageHandler = (id) => {
        if (id === currentChatId) {
            setCurrentChatId(null);
            setChatHistoryData(chatHistoryData.filter((val) => val.id !== id));
            setArchData(ArchData.filter((val) => val.id !== id));
        } else {
            setChatHistoryData(chatHistoryData.filter((val) => val.id !== id));
            setArchData(ArchData.filter((val) => val.id !== id));
        }

        CloseDeleteAlert()
    }


    const DeleteActivatedHandler = (id) => {

        const findMessage = chatHistoryData.find(val => val?.id === id);
        const findArchivedData = ArchData.find(val => val?.id === id)
        setCurrentDeleteItem(findMessage || findArchivedData);
        setIsDeleteAlert(true);

    }

    const CloseDeleteAlert = () => {
        setIsDeleteAlert(false)
        setCurrentDeleteItem(null);
    }




    const cancelEdit = () => {
        setEditingIndex(null);
        setMessage("");
    };


    const handleVoiceTranscript = (transcript) => {
        setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    }


    const CreateNewChatHistory = (usermessage) => {
        if (currentChatId) {

            setChatHistoryData(prev => prev.map((item) => {
                if (item.id === currentChatId) {
                    return { ...item, chatHistory: [...item.chatHistory, usermessage] };
                }
                return item;
            }))

            setArchData(prev => prev.map((item) => {
                if (item.id === currentChatId) {
                    return { ...item, chatHistory: [...item.chatHistory, usermessage] };
                }
                return item;
            }))

            return currentChatId;

        } else {
            let history = {
                id: Date.now(),
                title: usermessage.question,
                chatHistory: [usermessage]
            }
            setCurrentChatId(history.id);
            setChatHistoryData([history, ...chatHistoryData]);

            return history.id;
        }
    }

    const handleSend = async () => {
        const user = {
            id: Date.now(),
            type: 'user',
            question: message,
            created_at: Date.now()
        }
        const idHistory = CreateNewChatHistory(user);
        setIsBotTyping(true);
        setMessage("");
        setIsChatLoading(true);

        const responseChat = await GeneralChat_API(message);

        if (responseChat.success) {
            let aiResponse = {
                id: Date.now(),
                type: 'bot',
                isError: { status: false, message: "" },
                created_at: Date.now(),
                message: responseChat.ai_response,
                responsetype:'aichat',
                websearchresponse:{search_result:'',source:[]}

            }


            if (currentChatId || idHistory) {
                setChatHistoryData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return { ...item, chatHistory: [...item.chatHistory, aiResponse] };
                    }
                    return item;
                }))

                setArchData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return { ...item, chatHistory: [...item.chatHistory, aiResponse] };
                    }
                    return item;
                }))

            }
        } else {

            if (currentChatId || idHistory) {
                setChatHistoryData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return {
                            ...item, chatHistory: [...item.chatHistory, {
                                id: Date.now(),
                                type: 'bot',
                                isError: { status: true, message: "ISE" },
                                created_at: Date.now(),
                                message: ""
                            }]
                        };
                    }
                    return item;
                }))

                setArchData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return {
                            ...item, chatHistory: [...item.chatHistory, {
                                id: Date.now(),
                                type: 'bot',
                                isError: { status: true, message: "ISE" },
                                created_at: Date.now(),
                                message: ""
                            }]
                        };
                    }
                    return item;
                }))
               
            }
            
        }

        setIsBotTyping(false);
        setIsChatLoading(false);

    }


    const handleSendWebSearch = async () => {
        const user = {
            id: Date.now(),
            type: 'user',
            question: message,
            created_at: Date.now()
        }
        const idHistory = CreateNewChatHistory(user);
        setIsBotTyping(true);
        setMessage("");
        setIsChatLoading(true);

        const responseChat = await WebSearchAPI(message);
        if (responseChat.success) {
            let aiResponse = {
                id: Date.now(),
                type: 'bot',
                isError: { status: false, message: "" },
                created_at: Date.now(),
                message: responseChat?.ai_response || '',
                responsetype:'websearch',
                websearchresponse:{search_result:responseChat.search_results,source:responseChat.source}
            }


            if (currentChatId || idHistory) {
                setChatHistoryData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return { ...item, chatHistory: [...item.chatHistory, aiResponse] };
                    }
                    return item;
                }))

                setArchData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return { ...item, chatHistory: [...item.chatHistory, aiResponse] };
                    }
                    return item;
                }))
                // setChatMessage(prev => [...prev, aiResponse])
            }
        } else {

            if (currentChatId || idHistory) {
                setChatHistoryData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return {
                            ...item, chatHistory: [...item.chatHistory, {
                                id: Date.now(),
                                type: 'bot',
                                isError: { status: true, message: "ISE" },
                                created_at: Date.now(),
                                message: ""
                            }]
                        };
                    }
                    return item;
                }))

                setArchData(prev => prev.map((item) => {
                    if (item.id === (currentChatId || idHistory)) {
                        return {
                            ...item, chatHistory: [...item.chatHistory, {
                                id: Date.now(),
                                type: 'bot',
                                isError: { status: true, message: "ISE" },
                                created_at: Date.now(),
                                message: ""
                            }]
                        };
                    }
                    return item;
                }))
               
            }
            
        }

        setIsBotTyping(false);
        setIsChatLoading(false);

    }


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



    return (
        <div id='Chatpage' className='min-h-screen w-full flex flex-row items-start justify-start  bg-gray-100' style={{ opacity: 1, transform: 'none' }} >




            {/* side navbar for message history storage */}


            <div className={` ${isSideBaropen ? 'w-[14rem]' : 'w-[2.5rem]'} `}>
                <SliderChatHistoryComponent
                    chatHistoryData={chatHistoryData}
                    DeleteHistoryMessageHandler={DeleteActivatedHandler}
                    NewHistoryHandler={NewChatWindow}
                    ChangeChatWindow={ChangeChatWindow}
                    UpdateTitle={UpdateTitle}
                    AddArchiveHandler={AddArchiveHandler}
                    ArchData={ArchData}
                    RemoveArchiveHandler={RemoveArchiveHandler}
                    ErrorToast={ErrorToast}
                    checkState={setIsSideBarOpen}
                />
            </div>




            <div className={` flex-1 flex flex-col min-h-screen ${isSideBaropen ? 'w-[calc(100%-14rem)] SideBodyAdjustOpen' : 'w-[calc(100%-2.5rem)] SideBodyAdjustClose '} `}>
                {/* display all message */}

                <Toaster
                    position='top-center'
                    containerClassName='z-30'
                    toastOptions={{
                        duration: 1000,
                        className: 'text-xs'
                    }}
                />


                <ScrollButton
                    direction={'up'}
                    onClick={scrollToTop}
                    isVisible={showScrollUp}
                />
                <ScrollButton
                    direction={'down'}
                    onClick={scrollToBottom}
                    isVisible={showScrollDown}
                />
                <div className="bg-gray-100 flex-1 overflow-y-auto p-7 sm:p-6 space-y-6 max-w-4xl mx-auto w-full ">
                    {/* <div className='chat-view flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-[100%]'> */}
                    {currentChatId && chatHistoryData.filter(val => val.id === currentChatId)[0]?.chatHistory.map(chatMsg => {
                        return (
                            <ChatComponentWC
                                key={chatMsg.id}
                                chatMessage={chatMsg}
                            />
                        )
                    })}

                    {currentChatId && ArchData.filter(val => val.id === currentChatId)[0]?.chatHistory.map(chatMsg => {
                        return (
                            <ChatComponentWC
                                key={chatMsg.id}
                                chatMessage={chatMsg}
                            />
                        )
                    })}

                    {isChatLoading && <QuantChatLoadingComponent />}
                    {/* </div> */}
                </div>

                <div className="sticky bottom-0 left-0 right-0 bg-gray-100  z-10">
                    <div className="max-w-4xl mx-auto w-full p-4">
                        <ChatSearchBar
                            message={message}
                            setMessage={setMessage}
                            onSend={handleSend}
                            disabled={isBotTyping}
                            isBotTyping={isBotTyping}
                            onTranscript={handleVoiceTranscript}
                            VoiceSearchButton={VoiceSearchButton}
                            editingIndex={editingIndex}
                            cancelEdit={cancelEdit}
                            // isChatBlocked={isChatBlocked}
                            searchBarType={'general-chat'}
                            inputType={'chat-view'}
                            handleSendWebSearch={handleSendWebSearch}
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            QuantChat can make mistakes. Consider checking important information
                        </p>
                    </div>
                </div>
            </div>



            {isdeleteAlert &&
                <DeleteMessageAlertComponent
                    CurrentMessage={currentDeleteItem}
                    Cancelhandler={CloseDeleteAlert}
                    DeleteHandler={DeleteHistoryMessageHandler}
                />
            }
        </div>
    )
}

export default WebChatComponent