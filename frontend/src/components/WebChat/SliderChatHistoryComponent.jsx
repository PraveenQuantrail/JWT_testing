import { useEffect, useState } from 'react';
import { MdKeyboardArrowDown } from "react-icons/md";
import { MdKeyboardArrowRight } from "react-icons/md";
import { FiSidebar } from "react-icons/fi";
import { motion } from 'framer-motion';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { BsChatSquareDotsFill } from "react-icons/bs";
import { RiSearch2Line } from "react-icons/ri";
import { MdDelete } from "react-icons/md";
import { RiChatNewFill } from "react-icons/ri";
import { BsThreeDots } from "react-icons/bs";
import { FaEdit } from "react-icons/fa";
import { BiEdit } from "react-icons/bi";
import { PiArchiveDuotone } from "react-icons/pi";
import { RiChatHistoryFill } from "react-icons/ri";
import { BiSolidEdit } from "react-icons/bi";


function ChatHistoryContainer({
    title,
    id,
    DeleteHistoryMessageHandler,
    ChangeChatWindow,
    UpdateTitle,
    AddArchiveHandler,
    typeChat,
    RemoveArchiveHandler,
    ErrorToast
}) {

    // const [showMenuIcon, setShowMenuIcon] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [editdetails, setEditDetails] = useState({ id: null, value: null });




    const ShowmenuHandler = () => {
        setShowMenu(true);
    }

    const RenameHandler = (id, value) => {
        setEditDetails({ id, value })
        setIsEditable(true);
    }

    const UpdateTitleHandler = () => {
        if (isEditable && (editdetails.id && editdetails.value)) {
            UpdateTitle(editdetails.value, editdetails.id);
            setIsEditable(false);
            setEditDetails({ id: null, value: null });
            setShowMenu(false);
        }
    }

    const changeWindowHandler = (id)=>{
        !isEditable && ChangeChatWindow(id)
    }


    return (
        <div
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
            className=' bg-gray-0 hover:bg-gray-50 flex items-center  justify-between px-1 py-[5px] w-full rounded-md my-1 cursor-pointer h-9'>

            <div className='flex items-center ml-2 '
                onClick={() => changeWindowHandler(id)}
                title={title}
            >
                {/* <BsChatSquareDotsFill className='text-quantchat w-3 h-3' /> */}
                {isEditable
                    ?
                    <input
                        onBlur={() => UpdateTitleHandler()}
                        onFocus={()=>setShowMenu(false)}
                        onKeyDown={(e) => { if (e.code === 'Enter') UpdateTitleHandler() }}
                        className='w-full outline-0 text-xs bg-transparent h-full'
                        value={editdetails.value}
                        onChange={(e) => setEditDetails({ ...editdetails, value: e.currentTarget.value })}
                    /> :
                    <span
                        className='text-[10px] ml-0 font-semibold text-gray-700 hover:text-gray-900 line-clamp-1 w-[100px]'

                    >{title}
                    </span>
                }
            </div>

           { showMenu && <div
               
                className='menu-drop-chat-con  rounded-md flex items-center flex-row space-x-0.5' >
                <div
                    onClick={() => RenameHandler(id, title)}
                    title='edit'
                    className='bg-gray-100 hover:bg-gray-100 cursor-pointer rounded-sm  w-full flex items-center justify-start text-quantchat p-1'>
                    <FaEdit className='w-3 h-3 ' />
                    {/* <span className='text-xs ml-2 font-medium'>Rename</span> */}
                </div>

                <div
                    onClick={() => typeChat === 'normal' ? AddArchiveHandler(id) : RemoveArchiveHandler(id)}
                    title={typeChat === 'normal' ? 'Archived' : 'UnArchived'}
                    className='bg-gray-100 hover:bg-gray-100 cursor-pointer rounded-sm  w-full flex items-center justify-start text-quantchat p-1'>
                    <PiArchiveDuotone className='w-4 h-4 ' />
                    {/* <span className='text-xs ml-2 font-medium'>{typeChat === 'normal' ? 'Archive' : 'UnArchived'}</span> */}
                </div>
                <div
                    title='delete'
                    onClick={() => DeleteHistoryMessageHandler(id)}
                    className=' cursor-pointer rounded-lg  w-full flex items-center justify-start p-1 text-red-800'>
                    <MdDelete className='w-4 h-4 ' />
                    {/* <span className='text-xs ml-2 font-medium'>Delete</span> */}
                </div>
            </div>}

            {/* {((showMenuIcon || showMenu) && !isEditable) && <div id="delete-item mr-3 relative">
                <div className='' id="menu-con" onClick={() => ShowmenuHandler()}>
                    {<BsThreeDots />}
                </div>

                {showMenu &&
                    <div
                        onMouseLeave={() => { setShowMenu(false) }}
                        className='menu-drop-chat-con border border-gray-200 shadow-md shadow-gray-400  p-1 bg-gray-100 absolute -top-full  rounded-md flex items-center flex-col space-y-1 z-100' >
                        <div
                            onClick={() => RenameHandler(id, title)}
                            title='edit'
                            className='bg-gray-100 hover:bg-gray-200 cursor-pointer rounded-sm  w-full flex items-center justify-start text-gray-800 p-1'>
                            <FaEdit className='w-3 h-3 ' />
                            <span className='text-xs ml-2 font-medium'>Rename</span>
                        </div>

                        <div
                            onClick={() => typeChat === 'normal' ? AddArchiveHandler(id) : RemoveArchiveHandler(id)}
                            title={typeChat === 'normal' ? 'Archived' : 'UnArchived'}
                            className='bg-gray-100 hover:bg-gray-200 cursor-pointer rounded-sm  w-full flex items-center justify-start text-gray-800 p-1'>
                            <PiArchiveDuotone className='w-3 h-3 ' />
                            <span className='text-xs ml-2 font-medium'>{typeChat === 'normal' ? 'Archive' : 'UnArchived'}</span>
                        </div>
                        <div
                            title='delete'
                            onClick={() => DeleteHistoryMessageHandler(id)}
                            className='bg-red-700 cursor-pointer rounded-sm  w-full flex items-center justify-start p-1 text-red-100'>
                            <MdDelete className='w-3 h-3 ' />
                            <span className='text-xs ml-2 font-medium'>Delete</span>
                        </div>
                    </div>
                }

            </div>} */}
        </div>
    )
}


function SliderChatHistoryComponent(
    {
        chatHistoryData,
        DeleteHistoryMessageHandler,
        NewHistoryHandler,
        ChangeChatWindow,
        UpdateTitle,
        AddArchiveHandler,
        ArchData,
        RemoveArchiveHandler,
        ErrorToast,
        checkState
    }
) {

    const [isSideActive, setIsSideActive] = useState("inital");
    const [openChat, setOpenChat] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchChat, setSearchChat] = useState("");
    const [isArchied, setIsArchied] = useState(false);


    const ChangeChatTypeHandler = () => setIsArchied(!isArchied);



    const OpenCloseSliderHandle = () => {

        if (isSideActive === 'open') {
            checkState !== undefined && checkState(false);
            setIsSideActive('close')
        } else {
            checkState !== undefined && checkState(true);
            setIsSideActive('open');
        }
    }

    const DeArchivedhandler = (id) => {
        RemoveArchiveHandler(id);
        // console.log(ArchData.length)
        ArchData.length === 1 && setIsArchied(false);
    }

    const StyleForSlider = (state) => {
        let style = ''
        switch (state) {
            case 'inital':
                style = ' w-10  bg-quantchat ';
                break;
            case 'open':
                style = ' w-56 ChatSideSliderClose px-2   bg-white ';
                break;

            case 'close':
                style = ` w-10 ChatSideSliderOpen  bg-quantchat  `;
                break;

        }
        return style
    }

    const isOpen_Close = () => {
        return isSideActive === 'open'
    }




    const SearchData = chatHistoryData.filter((item) => {
        return item?.title?.toLowerCase()?.includes(searchChat.toLowerCase())
    })

    const AcrhivedSearchData = ArchData.filter((item) => {
        return item?.title?.toLowerCase()?.includes(searchChat.toLowerCase());
    })





    useEffect(() => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false);
        }, 2000)
    }, [searchChat])


    return (
        <div
            id='chat-side-view'
            className={
                StyleForSlider(isSideActive) + ' z-20 p-1 h-screen border-r top-[60px] fixed border-gray-100 '}

        >
            <style>{`
        /* Scoped to only affect the textarea with the chat-textarea class */
        .message-con{scroll-behavior: smooth;}
        .message-con::-webkit-scrollbar { width: 7px; }
        .message-con::-webkit-scrollbar-track { background: transparent; }
        .message-con::-webkit-scrollbar-thumb {
          background:rgba(30,30,30,0.1);
          border-radius: 6px;
          border: 2px solid rgba(0,0,0,0);
          background-clip: padding-box;
        }
          .message-con::-webkit-scrollbar-thumb:hover {
              background: rgba(93,63,211,0.35);  
              border-radius: 6px;
          border: 2px solid rgba(0,0,0,0);
          background-clip: padding-box;
          display:block;
          }
      `}</style>

            <div id="button-slider"
                className={(isOpen_Close() ? `justify-end ` : `justify-center `) + " flex items-center w-full"}
            >
                <div
                    onClick={() => OpenCloseSliderHandle()}
                    className='rounded-lg w-8 h-8 flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] cursor-pointer'>
                    <FiSidebar className={(isOpen_Close() ? 'text-quantchat' : ' text-white ') + ' w-5 h-5'} />
                </div>
            </div>
            <div
                id='chats-history-con'
                className={(!isOpen_Close() ? ' justify-center  ' : ' justify-start ') + ' flex items-center my-3 w-full'}
            >
                {!isOpen_Close() ?
                    <BiSolidEdit className='w-5 h-5 text-white' title='New Chat' onClick={() => NewHistoryHandler()} />
                    :

                    <motion.div
                        initial={{ opacity: 0.1, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='search-con w-full my-2 text-black'>
                        <div
                            className='p-1 search-input-con bg-transparent flex items-center h-8 rounded-md w-full border border-gray-400 '
                        >
                            <RiSearch2Line />
                            <input
                                onChange={(e) => setSearchChat(e.target.value)}
                                placeholder='Search chats'
                                className='bg-transparent outline-0 w-[90%] text-[11px] pl-3 placeholder:text-gray-400 font-semibold'
                            />
                        </div>
                    </motion.div>

                }

            </div>


            <div
                id='chats-history-con'
                className={(!isOpen_Close() ? ' justify-center  ' : 'justify-start ') + ' flex items-center my-6 w-full'}
            >
                {isOpen_Close()
                    // ? //<HiMiniChatBubbleLeftRight className='text-quantchat w-5 h-5 ' />
                    // <img
                    //     src='/logo.png'
                    //     className='w-5 h-5 rounded-full fade-in'
                    //     alt='quantrail-logo'
                    // />
                    // :
                    &&
                    <div className='flex flex-col items-center w-full '>

                        <div
                            className={(isOpen_Close() ? `fade-in ` : `fade-out `) + ' flex items-center justify-between w-full pb-1 cursor-pointer'}
                            id="chat-id"
                            onClick={() => setOpenChat(!openChat)}
                        >
                            {/* <HiMiniChatBubbleLeftRight className='text-quantchat w-5 h-5' /> */}
                            <div className='flex items-center '>
                                <img
                                    src='/logo.png'
                                    className='w-5 h-5 rounded-full'
                                    alt='quantrail-logo'
                                />
                                <h5 className='text-[13px] font-semibold text-black ml-2 flex items-center '>Chats</h5>

                            </div>

                            <div className='archied text-quantchat mr-2'>

                                <div
                                    onClick={() => ChangeChatTypeHandler()}
                                    className='w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100'
                                    title={isArchied ? 'Chat history' : 'Archive chat'}
                                >
                                    {isArchied ? <RiChatHistoryFill /> : <PiArchiveDuotone className='w-4 h-4' />}
                                </div>

                            </div>
                        </div>

                        <div className=' message-con w-full fade-in  my-3 max-h-[70vh] overflow-y-scroll overflow-x-hidden '>
                            {isLoading ?

                                <SkeletonTheme baseColor="lightgray" highlightColor="gray" >
                                    <Skeleton count={isArchied ? (isArchied.length > 0 ? isArchied.length : 3) : (SearchData.length > 0 ? SearchData.length : 3)} className='h-4 opacity-70' />
                                </SkeletonTheme> :

                                isArchied ? (AcrhivedSearchData.length > 0 ? <div>
                                    <div className='my-2'>
                                        <div className='text-xs text-gray-700 font-semibold text-start'>Acrhived chat</div>

                                    </div>
                                    <hr />
                                    {AcrhivedSearchData.map((chat) => {
                                        return (
                                            <ChatHistoryContainer
                                                key={chat.id}
                                                id={chat.id}
                                                title={chat.title}
                                                DeleteHistoryMessageHandler={DeleteHistoryMessageHandler}
                                                ChangeChatWindow={ChangeChatWindow}
                                                UpdateTitle={UpdateTitle}
                                                typeChat='archived'
                                                RemoveArchiveHandler={DeArchivedhandler}
                                                ErrorToast={ErrorToast}
                                            />
                                        )
                                    })}
                                </div>
                                    :

                                    <div className='text-[10px] text-gray-500 font-semibold text-center'>No Acrhived chat</div>
                                ) : (SearchData.length > 0 ?
                                    SearchData.map((chat) => {
                                        return (
                                            <ChatHistoryContainer
                                                key={chat.id}
                                                id={chat.id}
                                                title={chat.title}
                                                DeleteHistoryMessageHandler={DeleteHistoryMessageHandler}
                                                ChangeChatWindow={ChangeChatWindow}
                                                UpdateTitle={UpdateTitle}
                                                AddArchiveHandler={AddArchiveHandler}
                                                typeChat='normal'
                                            />
                                        )
                                    }) :
                                    <div className='text-[10px] text-center text-gray-500 font-semibold'>No Messages</div>)

                            }



                        </div>


                        {!isArchied && <div className='w-full my-1'>
                            <motion.button
                                onClick={() => NewHistoryHandler()}
                                disabled={(chatHistoryData.length === 0 && ArchData.length === 0)}
                                className={
                                    (chatHistoryData.length > 0 || ArchData.length > 0) ?
                                        'opacity-100 text-xs w-full bg-quantchat rounded-md text-white flex items-center justify-center h-9 font-medium ' :
                                        'opacity-45 cursor-not-allowed text-xs w-full bg-gray-700 rounded-md text-gray-300 flex items-center justify-center h-9 font-medium '}>
                                <BiEdit className='mr-1' /> Add New Chat
                            </motion.button>
                        </div>}
                    </div>}


            </div>




        </div>
    )
}

export default SliderChatHistoryComponent
