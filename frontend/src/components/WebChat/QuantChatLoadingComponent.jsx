import React from 'react'
import { BiLoaderAlt } from "react-icons/bi";

function QuantChatLoadingComponent() {

  return (
    <div className='flex items-center justify-start w-full'>
        
        <div className='flex items-center justify-center'>
                <BiLoaderAlt className=' w-8 h-8 text-quantchat animate-spin' />
                <img src="logo.png" alt="quantchat-logo" className='w-4 h-4 rounded-full absolute animate-pulse' />            
            </div>
    </div>
  )
}

export default QuantChatLoadingComponent
