import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MdDelete } from "react-icons/md";


function DeleteMessageAlertComponent({CurrentMessage,DeleteHandler,Cancelhandler}) {
    const [mouseTrack,setMouseTrack] = useState(false);
  
    
    return (
    <div className='delete-con fixed inset-0 z-50 flex items-center justify-center p-4' >
        <div 
        onClick={()=>Cancelhandler()}
        className='fixed inset-0 bg-black bg-opacity-50 transition-opacity overlay-fade-in'></div>

        <div className='main-delete-alert relative lg:w-[30%] md:w-[50%] sm:w-[50%] h-30 bg-white popup-slide-in mb-40 p-3 rounded-lg' >
            <div className='title-con mb-2 text-md font-semibold'>
                <h4>Delete chat ?</h4>
            </div>
            <div className=''>
                <p className='text-sm'>Are you sure want to delete <span className='text-red-700 font-semibold '>{CurrentMessage.title}</span>.</p>
            </div>

            <div className='button mt-5 pr-5 flex items-center justify-end space-x-4'>
                <motion.button 
                whileHover={{boxShadow:'inset 0px 0px 3px lightgray'}}
                className=' px-3 py-2 bg-gray-100  rounded-md text-sm border '
                onClick={()=> Cancelhandler()}
                >
                    Cancel
                </motion.button>
                <motion.button
                onClick={() => DeleteHandler(CurrentMessage.id)}
                whileHover={{boxShadow:'inset 0px 0px 3px darkred'}}
                className='flex items-center px-3 py-2 bg-red-600 text-white rounded-md text-sm border border-red-600'
                >
                    <MdDelete className='mr-1' />Delete
                </motion.button>
            </div>
        </div>

    </div>
  )
}

export default DeleteMessageAlertComponent
