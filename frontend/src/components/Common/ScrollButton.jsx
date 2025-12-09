
import { motion } from "framer-motion";
import {  FiChevronUp,
  FiChevronDown
} from "react-icons/fi";


const ScrollButton = ({ direction, onClick, isVisible }) => (
  <motion.button
    onClick={onClick}
    className={`fixed right-6 p-3 rounded-full shadow-lg z-40 ${direction === 'up'
      ? 'bg-[#5D3FD3] hover:bg-[#6d4fe4] bottom-24'
      : 'bg-[#5D3FD3] hover:bg-[#6d4fe4] bottom-6'
      } text-white transition-colors duration-200`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{
      opacity: isVisible ? 1 : 0,
      scale: isVisible ? 1 : 0.8
    }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    transition={{ duration: 0.2 }}
    style={{
      pointerEvents: isVisible ? 'auto' : 'none'
    }}
  >
    {direction === 'up' ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
  </motion.button>
);



export default ScrollButton