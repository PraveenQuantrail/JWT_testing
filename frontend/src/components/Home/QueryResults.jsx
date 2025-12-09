import React from 'react';
import { motion } from 'framer-motion';

// Enhanced Table Loading Animation Component
const TableLoadingAnimation = () => (
  <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden min-h-[200px]">
    {/* Animated background */}
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

    {/* Main spinner */}
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-12 h-12 border-4 border-[#5D3FD3]/20 rounded-full mb-3 relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-[#5D3FD3] rounded-full" />
      </motion.div>

      {/* Progress dots */}
      <div className="flex space-x-1 mb-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-[#5D3FD3] rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Loading text with progress */}
      <motion.div
        className="text-sm text-gray-600 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Updating Results
      </motion.div>
      <motion.div
        className="text-xs text-gray-500 mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Executing your SQL query...
      </motion.div>
    </motion.div>
  </div>
);

const QueryResults = ({ 
  results = [], 
  tableLoading = false,
  showHeader = true 
}) => {
  if (tableLoading) {
    return <TableLoadingAnimation />;
  }

  if (!results || results.length === 0) {
    return (
      <div className="bg-orange-50 border border-orange-100 rounded-md p-3 text-sm text-orange-700">
        <div className="break-words whitespace-pre-wrap break-all mt-2 text-xs flex items-center" style={{ overflowWrap: 'anywhere' }}>
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          No data found. Check the query or data source.
        </div>
      </div>
    );
  }

  const headers = Object.keys(results[0] || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-gray-300 rounded-lg overflow-hidden shadow-sm mb-3 overflow-x-auto bg-white"
    >
      {showHeader && (
        <div className="text-xs font-medium text-gray-600 mb-2 flex items-center px-3 pt-3">
          Query Results <span className="ml-2 text-[11px] font-normal text-gray-400">({results.length} rows)</span>
        </div>
      )}
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300 bg-gray-50/80 whitespace-normal break-words"
                style={{ overflowWrap: 'anywhere' }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}
            >
              {headers.map((header, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-normal border-b border-gray-200 break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};

export default QueryResults;