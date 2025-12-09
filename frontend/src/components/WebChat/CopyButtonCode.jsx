import React, { useState } from 'react';
import { LuCopy } from "react-icons/lu";
import { ImCheckboxChecked } from "react-icons/im";


function CopyButtonCode({ message }) {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = (text) => {
        setIsCopied(true);
        navigator.clipboard.writeText(text);
        setTimeout(() => {
            setIsCopied(false);
        }, 1500)
    };

    return (
        <button
            title="copy"
            onClick={() => copyToClipboard(message)}
            className="flex items-center absolute right-[8px] top-[8px] bg-gray-900 font-semibold border-0 text-gray-100 rounded-md py-2 px-2 text-xs"
        >
            {isCopied ? <div className='text-green-500 flex items-center justify-center '><ImCheckboxChecked  className='ml-0.5' /> copied</div> : <><LuCopy className="mr-0.5 text-gray-400" /> copy</>}

        </button>
    )
}

export default CopyButtonCode 
