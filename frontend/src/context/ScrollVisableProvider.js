
import { createContext, useState, useEffect } from 'react'
import { useWindowSize } from "react-use";


export const ScrollVisableContext = createContext();

const styleOn = `
body::-webkit-scrollbar {
  width:6px;
}

body::-webkit-scrollbar-thumb  
{
  background-color:#a28bff;
}
body::-webkit-scrollbar-track {
  background-color:white;
}
  `

const styleOff = `body::-webkit-scrollbar {
  width:0px;
}
`


function ScrollVisableProvider({ children }) {
    const [scrollStyle, setScrollStyle] = useState(styleOff);
    const { width } = useWindowSize();
    const [currentScreenWidth, setCurrentScreenWidth] = useState(width)



    useEffect(() => {
        setCurrentScreenWidth(width)
    }, [width, currentScreenWidth])

    const handleMouseMove = (e) => {

        if (e.screenX > (currentScreenWidth - 10)) {
            setScrollStyle(styleOn)
        } else {
            setScrollStyle(styleOff)
        }
    }
    window.addEventListener('mousemove', handleMouseMove)


    return (
        <ScrollVisableContext.Provider value={{ currentScreenWidth, scrollStyle }}>
            {children}
        </ScrollVisableContext.Provider>
    )
}

export default ScrollVisableProvider