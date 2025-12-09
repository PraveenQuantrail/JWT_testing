import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiDatabase, FiRefreshCw } from "react-icons/fi";
import { FaCircle } from "react-icons/fa";
import { MdKey, MdAutoDelete } from "react-icons/md";
import { TbLoader3 } from "react-icons/tb";
import ViewSelectedDBInfo from "./ViewSelectedDBInfo";

const statusColors = {
  Connected: "text-green-500",
  Disconnected: "text-red-500",
};

const statusVariants = {
  hidden: { opacity: 0, x: -10, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -10, scale: 0.95 },
};

const containerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

/* Custom Select Component */
function CustomSelect({ value, onChange, options, disabled, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Move focus to selected option when opening
  useEffect(() => {
    if (open && listRef.current) {
      const selectedIndex = options.findIndex(opt => opt.id === value);
      const children = listRef.current.querySelectorAll('[role="option"]');
      if (children && children[selectedIndex]) {
        children[selectedIndex].focus();
      } else if (children[0]) {
        children[0].focus();
      }
    }
  }, [open, options, value]);

  const handleToggle = () => {
    if (!disabled) setOpen((v) => !v);
  };

  const handleSelect = (opt) => {
    onChange(opt.id);
    setOpen(false);
  };

  const handleOptionKeyDown = (e, opt, idx) => {
    const key = e.key;
    const children = listRef.current ? Array.from(listRef.current.querySelectorAll('[role="option"]')) : [];
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      handleSelect(opt);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      const next = children[idx + 1] || children[0];
      next && next.focus();
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      const prev = children[idx - 1] || children[children.length - 1];
      prev && prev.focus();
    } else if (key === 'Home') {
      e.preventDefault();
      children[0] && children[0].focus();
    } else if (key === 'End') {
      e.preventDefault();
      children[children.length - 1] && children[children.length - 1].focus();
    } else if (key === 'Escape') {
      setOpen(false);
    }
  };

  const selectedOption = options.find(opt => opt.id === value) || { name: "Select Database" };

  return (
    <div ref={rootRef} className="relative inline-block w-48 text-sm">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full text-left flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-md px-3 py-2 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate" title={selectedOption.name}>{selectedOption.name}</span>
        {/* custom arrow */}
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'transform rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-56 overflow-auto focus:outline-none custom-scrollbar"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.id === value;
            return (
              <div
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(opt)}
                onKeyDown={(e) => handleOptionKeyDown(e, opt, idx)}
                className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition
                  ${isSelected ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'}`}
              >
                <span className="truncate" title={opt.name}>{opt.name}</span>
                {isSelected && (
                  <svg className="w-4 h-4 text-purple-600" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 10l3 3L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ChatHeader = ({
  selectedDb,
  databases,
  dbLoading,
  onDbSelect,
  onClearDb,
  showStatus,
  dbStatus,
  checkingDbStatus,
  onRefreshStatus,
  selectedDbDetails,
  schemaData,
  fetchSchemaData,
  showDBInfo,
  setShowDBInfo,
  onGenerateSession,
  onDeleteSessionId,
  IsSessionGenerated,
  IsDBConnected,
  loadingFastAPI,
}) => {
  const handleShowDBInfo = async () => {
    if (dbStatus === "Connected") {
      // ensure schema is fetched before showing the DB info panel
      if (typeof fetchSchemaData === "function") {
        await fetchSchemaData();
      }
      if (typeof setShowDBInfo === "function") {
        setShowDBInfo(true);
      }
    }
  };

  // Prepare options for CustomSelect
  const databaseOptions = [
    { id: "", name: "Select Database" },
    ...databases.map(db => ({ id: db.id, name: db.name }))
  ];

  return (
    <>
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #c7d2fe #f5f3ff;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f5f3ff;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #c7d2fe;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #a5b4fc;
        }
      `}</style>
      
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <FiDatabase className="text-xl text-[#5D3FD3]" />
          </div>

          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
            {/* Native select with CustomSelect */}
            <CustomSelect
              ariaLabel="Select database"
              value={selectedDb}
              onChange={onDbSelect}
              options={databaseOptions}
              disabled={dbLoading}
            />

            {selectedDb && (
              <motion.button
                onClick={onClearDb}
                className="ml-1 px-2 py-1 text-xs rounded bg-gray-200 border border-gray-300 hover:bg-gray-300 text-gray-700 transition"
                title="Clear selection"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            )}

            <AnimatePresence mode="wait">
              {selectedDb && showStatus && dbStatus && (
                <motion.div
                  key="status-container"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-center space-x-1 ml-2 overflow-hidden"
                >
                  <motion.div
                    variants={statusVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex items-center space-x-1"
                  >
                    <FaCircle className={`${statusColors[dbStatus]} text-xs`} />
                    <span className="text-xs text-gray-600 hidden sm:inline">{dbStatus}</span>
                    <motion.button
                      onClick={onRefreshStatus}
                      disabled={checkingDbStatus}
                      className="ml-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      title="Refresh status"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiRefreshCw className={checkingDbStatus ? "animate-spin" : ""} size={12} />
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Session Management */}
          <AnimatePresence>
            {selectedDb && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center space-x-2"
              >
                {IsSessionGenerated && IsSessionGenerated(Number(selectedDb)) ? (
                  <button
                    onClick={() => onDeleteSessionId(Number(selectedDb))}
                    className="hover:text-purple-800 transition text-[#5d3fd3] flex items-center justify-center cursor-pointer p-2 rounded-full hover:bg-gray-100"
                    title="Delete Session ID"
                  >
                    <MdAutoDelete className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onGenerateSession(Number(selectedDb))}
                    disabled={!IsDBConnected(dbStatus) || loadingFastAPI}
                    className={`transition flex items-center justify-center p-2 rounded-full hover:bg-gray-100 ${IsDBConnected(dbStatus) ? "text-[#5d3fd3]" : "text-[#ddd4ff] cursor-not-allowed"}`}
                    title="Generate Session key"
                  >
                    {loadingFastAPI ? (
                      <TbLoader3 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MdKey className="w-5 h-5" />
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* View DB Info Button */}
          <AnimatePresence>
            {selectedDb && dbStatus === "Connected" && (
              <motion.button
                key="db-info-button"
                onClick={handleShowDBInfo}
                className="bg-[#5D3FD3] text-white font-semibold py-2 px-4 rounded hover:bg-[#6d4fe4] transition duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:ring-offset-2 flex items-center space-x-2"
                title="View Database Information"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiDatabase size={14} />
                <span>View DB Info</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* <div className="">
          
        </div> */}
      </div>

      {/* Inline modal/panel for DB info - caller controls showDBInfo and selectedDbDetails */}
      <AnimatePresence>
        {showDBInfo && selectedDbDetails && (
          <ViewSelectedDBInfo
            connection={selectedDbDetails}
            schemaData={schemaData}
            onClose={() => setShowDBInfo(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatHeader;