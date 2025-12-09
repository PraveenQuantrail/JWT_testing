import { motion } from "framer-motion"
import { useState } from "react";
import { FiUser } from "react-icons/fi";
import BotMDComponent from "./BotMDComponent";
import { LuServerOff } from "react-icons/lu";
import { FaFaceSadTear } from "react-icons/fa6";
import { BiSolidError } from "react-icons/bi";
import { IoCopyOutline } from "react-icons/io5";
import { ImCheckboxChecked } from "react-icons/im";

function ChatComponentWC({ chatMessage }) {


    const [isCopied, setIsCopied] = useState(false);
    const [showSetting, setShowSetting] = useState(false);


    function CopyHandler(message) {
        setIsCopied(true);
        navigator.clipboard.writeText(message);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    }


    const NewWebname = (str) => {
        const url = new URL(str);
        return url.origin.split('//')[1]
    }




    function InvalidPromptError(message) {
        return message.includes("I’m sorry, but I’m not sure what you’re asking.") ? true : false;
    }

    return (
        chatMessage.type === 'user' ?
            // chat component for user
            <div
                onMouseEnter={() => setShowSetting(true)}
                onMouseLeave={() => setShowSetting(false)}
                className='w-full flex items-center justify-end' id='user-chat fade-in'>
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}

                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}

                >
                    <div className="account-img w-full flex items-center justify-end mb-1" >
                        <div className="bg-quantchat p-1 rounded-full flex-shrink-0 ml-0 ">
                            <FiUser className="text-white" size={14} />
                        </div>
                    </div>
                    <div className="max-w-3xl px-4 relative py-3 rounded-lg shadow-sm text-sm bg-white  text-black rounded-tr-none " id="chat-body">
                        {chatMessage.question}
                        {showSetting &&
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className="absolute top-[15%] left-[-2.5rem] flex items-center justify-center"
                            >
                                <div
                                    onClick={() => CopyHandler(chatMessage.question)}
                                    className="bg-white w-8 h-8 flex items-center justify-center rounded-lg" id="copy-btn ">
                                    {isCopied ? <ImCheckboxChecked className="text-green-500 rounded-md" /> : <IoCopyOutline />}
                                </div>

                            </motion.div>
                        }
                    </div>

                </ motion.div>
            </div>
            :

            // chat component for bot
            <div className='w-full flex items-center justify-start' id='bot-chat'>
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                    <div className="chat-bot-logo mb-1">
                        <img src="logo.png" className="w-5 h-5 rounded-full" />
                    </div>
                    {!chatMessage.isError.status && <div className="max-w-3xl px-4  py-3 rounded-lg shadow-sm text-sm bg-white  text-black rounded-tl-none relative" id="chat-body">

                        {InvalidPromptError(chatMessage.message) ? <div className="flex items-start flex-row space-x-1 text-red-500 ">
                            <FaFaceSadTear className="my-2 mr-2 w-6 h-6" /> {chatMessage.message}
                        </div> :

                            chatMessage.responsetype === 'websearch' ?
                                <div>
                                    <BotMDComponent message={chatMessage.websearchresponse.search_result} />
                                    {chatMessage.websearchresponse.source.length > 0 && <>
                                        <hr />
                                        <h5 className="mt-2 text-md font-semibold ">Source links</h5>
                                        <div className="my-1 flex flex-wrap">
                                            {chatMessage.websearchresponse.source.map((val) => {
                                                return (
                                                    <a href={val} target="_blank" className="hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer flex items-center py-1 px-2 bg-gray-800 m-1 rounded-md text-white" key={val}>
                                                        <img className="w-4 h-4" src={`https://www.google.com/s2/favicons?domain_url=${val}`} />
                                                        <p className="ml-2 text-[10px] font-semibold">{NewWebname(val)}</p>
                                                    </a>
                                                )
                                            })}
                                        </div>
                                    </>}
                                </div>
                                :
                                <BotMDComponent message={chatMessage.message} />

                        }

                    </div>}

                    {chatMessage.isError.status && <div className="max-w-3xl px-4  py-3 rounded-lg shadow-sm text-sm bg-red-50 border-1 border-red-700  text-red-700 rounded-tl-none relative" id="chat-body">
                        <div className="error-title flex items-center">
                            <BiSolidError /> <span className="ml-2 font-semibold ">Error occurs while connecting.</span>
                        </div>
                        {chatMessage.isError.message === "ISE" &&
                            <div className="flex my-3 items-center">
                                <LuServerOff /> <span className="ml-2 font-medium text-xs">Internal server error!</span>
                            </div>
                        }
                    </div>}

                </motion.div>
            </div>
    )
}

export default ChatComponentWC
