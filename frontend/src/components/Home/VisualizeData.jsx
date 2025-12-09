import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FiZoomIn } from "react-icons/fi";
import { BarChart3 } from 'lucide-react';
import { BiSolidMessageAltError } from "react-icons/bi";
import { LazyLoadImage } from "react-lazy-load-image-component";

// Chart Loading Animation
const ChartLoadingAnimation = () => (
  <div className="w-full h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5D3FD3]/10 to-transparent"
      animate={{
        x: ['-100%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-16 h-16 border-4 border-[#5D3FD3]/20 rounded-full mb-4 relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#5D3FD3] rounded-full" />
      </motion.div>
      <div className="flex space-x-2 mb-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-[#5D3FD3] rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <motion.div
        className="text-sm text-gray-600 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Generating Visualization
      </motion.div>
      <motion.div
        className="text-xs text-gray-500 mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        This may take a few seconds...
      </motion.div>
    </motion.div>
  </div>
);

// Error Message generator
const ErrorMessageGenerate = (code) => {
  let currentError = null;
  switch (code) {
    case 'ISE':
      currentError = "The server encountered an internal error or misconfiguration and was unable to complete your request";
      break;
    case 'SI':
      currentError = "Your session has expired. Please connect again";
      break;
    case 'SNF':
      currentError = "This action requires an active session. Please connect again for this action";
      break;
    default:
      currentError = "Something went wrong on our end. Please try again later.";
      break;
  }
  return currentError;
};

const VisualizeData = ({
  chat,
  chartType,
  SelectChartType,
  SelectAxishandler,
  ChartQuestionQuery,
  handleChartInputKeyDown,
  handleChartFormSubmit,
  openImageGallery,
}) => {
  // Chart editor textarea ref
  const chartInputRef = useRef(null);
  const MAX_HEIGHT = 150; // px

  // Auto-resize textarea based on content (keeps original behaviour but enforces 150px max)
  useEffect(() => {
    const textarea = chartInputRef.current;
    if (!textarea) return;

    // Reset height to auto to measure content
    textarea.style.height = 'auto';

    // Calculate new height and cap it
    const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;

    // Show scrollbar when content exceeds max height
    textarea.style.overflowY = newHeight >= MAX_HEIGHT ? 'auto' : 'hidden';
  }, [chat?.chartData?.question]);

  return (
    <div className="mt-3 mb-3">
      <style>{`
        .chart-textarea::-webkit-scrollbar { width: 10px; }
        .chart-textarea::-webkit-scrollbar-track { background: transparent; }
        .chart-textarea::-webkit-scrollbar-thumb {
          background: rgba(93,63,211,0.35);
          border-radius: 6px;
          border: 2px solid rgba(0,0,0,0);
          background-clip: padding-box;
        }
      `}</style>

      {chat.chartData.isVisualForm && (
        <div className="bg-gray-50 border border-gray-200 w-full rounded-lg p-4 shadow-xs">
          <div className="font-medium text-gray-700 mb-3 flex items-center">
            <BarChart3 className="mr-2" size={18} />
            Data Visualization
          </div>
          <div className="data-visual-edit-form my-3 w-full">
            <div className="chart-config-select-con w-full flex items-center justify-between gap-3 mb-4">
              {/* Chart type select container */}
              <div className="select-charttype flex-1">
                <select
                  className="font-medium text-gray-700 bg-white border border-gray-300 w-full text-sm h-10 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition-all duration-200"
                  onChange={(e) => SelectChartType(e, chat.chatID)}
                  value={chat.chartData.charttype}
                >
                  <option value="" disabled>Select Chart Type</option>
                  {/* Chart options */}
                  {chartType.map((opt) => (
                    <option key={opt} value={opt} className="font-medium">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {/* Select option for x_axis */}
              <div className="x_axis-con flex-1">
                {(chat.chartData.charttype !== "" && (
                  <select
                    className="font-medium text-gray-700 bg-white border border-gray-300 w-full text-sm h-10 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition-all duration-200"
                    onChange={(e) => SelectAxishandler(e, 'x', chat.chatID)}
                    value={chat.chartData.x_axis}
                  >
                    <option value="" disabled>Select X-axis</option>
                    {chat.chartData.dataColumn.map((opt, index) => (
                      chat.chartData.y_axis === opt ?
                        <option disabled value={opt} key={index}>{opt}</option>
                        :
                        <option value={opt} key={index}>{opt}</option>
                    ))}
                  </select>
                ))}
              </div>
              {/* Select option for y_axis */}
              <div className="y_axis-con flex-1">
                {(chat.chartData.charttype !== "" && (
                  <select
                    className="font-medium text-gray-700 bg-white border border-gray-300 w-full text-sm h-10 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition-all duration-200"
                    onChange={(e) => SelectAxishandler(e, 'y', chat.chatID)}
                    value={chat.chartData.y_axis}
                  >
                    <option value="" disabled>Select Y-axis</option>
                    {chat.chartData.dataColumn.map((opt, index) => (
                      chat.chartData.x_axis === opt ?
                        <option disabled value={opt} key={index}>{opt}</option>
                        :
                        <option value={opt} key={index}>{opt}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
            {/* Chart question textarea and submit */}
            <div className="input-con w-full flex items-center gap-2">
              <textarea
                ref={chartInputRef}
                id={`chart-input-${chat.chatID}`}
                value={chat?.chartData?.question}
                onChange={(e) => ChartQuestionQuery(chat.chatID, e)}
                onKeyDown={(e) => handleChartInputKeyDown(e, chat.chatID)}
                className={
                  "chart-textarea flex-1 bg-white py-2 rounded-md font-medium text-sm border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition-all duration-200 " +
                  "resize-y break-words whitespace-pre-wrap break-all " +
                  "min-h-[40px] max-h-[150px]"
                }
                placeholder="Describe the chart you want to generate..."
                rows={1}
                aria-label="Chart description"
              />
              <button
                onClick={() => handleChartFormSubmit(chat.chatID)}
                disabled={chat.chartData.isloading}
                className="flex items-center justify-center get-chart-btn w-32 bg-[#5D3FD3] hover:bg-[#6d4fe4] h-10 text-sm font-semibold rounded-md text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chat.chartData.isloading ? (
                  <AiOutlineLoading3Quarters className="animate-spin w-4 h-4" />
                ) : (
                  'Get Chart'
                )}
              </button>
            </div>
            {/* Chart image */}
            {(chat.chartData.image !== "" && !chat.chartData.error.status) && (
              <div className="w-full mt-4">
                <div className="font-medium text-gray-700 mb-3 flex items-center">
                  <BarChart3 className="mr-2" size={16} />
                  Generated Visualization
                </div>
                {chat.chartData.isloading ? (
                  <ChartLoadingAnimation />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative group cursor-pointer"
                    onClick={() => openImageGallery(chat.chatID, chat.chartData.image)}
                  >
                    <LazyLoadImage
                      effect="opacity"
                      className="w-full rounded-lg border border-gray-200 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02]"
                      src={chat.chartData.image}
                      alt="Generated chart visualization"
                      placeholder={<ChartLoadingAnimation />}
                      threshold={100}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg flex items-center space-x-2">
                        <FiZoomIn className="text-gray-700" size={16} />
                        <span className="text-sm font-medium text-gray-700">Click to expand</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            {/* Error for chart */}
            {chat.chartData.error.status && (
              <div className="w-full mt-4">
                {chat.chartData.isloading ? (
                  <ChartLoadingAnimation />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-red-700 py-2 px-3 bg-red-50 border-[1px] border-red-100 rounded-lg"
                  >
                    <div className="font-medium mb-3 flex items-center">
                      <BiSolidMessageAltError className="mr-2" size={16} />
                      Error occurs while generating visualization
                    </div>
                    <div className="text-xs">
                      {ErrorMessageGenerate(chat.chartData.error.message)}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizeData;