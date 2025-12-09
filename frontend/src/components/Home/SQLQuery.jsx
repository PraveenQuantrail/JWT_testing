import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck, FiEdit3, FiSave, FiX } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

// SQL Editor with Line Numbers Component
const SQLEditorWithLines = ({ value, onChange, onKeyDown }) => {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = value.split('\n');

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleChange = (e) => {
    onChange(e);
    handleScroll();
  };

  return (
    <div className="flex bg-gray-800 rounded-md overflow-hidden border border-gray-600">
      {/* Line Numbers - Only visible in edit mode */}
      <div
        ref={lineNumbersRef}
        className="bg-gray-900 text-gray-400 text-right py-3 px-2 font-mono text-xs select-none overflow-hidden"
        style={{ minWidth: '40px', lineHeight: '1.5' }}
      >
        {lines.map((_, index) => (
          <div key={index + 1} className="pr-2">
            {index + 1}
          </div>
        ))}
      </div>

      {/* SQL Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        className="flex-1 bg-gray-800 text-gray-100 p-3 font-mono text-xs resize-y min-h-[120px] focus:outline-none border-0"
        style={{
          overflowWrap: 'anywhere',
          lineHeight: '1.5',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937'
        }}
        spellCheck={false}
      />
    </div>
  );
};

const SQLQuery = ({ chat, index, copiedItems, onCopy, onUpdateSql }) => {
  const [editingSql, setEditingSql] = useState({
    isEditing: false,
    sql: chat.sql,
    originalSql: chat.sql
  });

  // Handle SQL editing
  const handleEditSql = () => {
    setEditingSql({
      isEditing: true,
      sql: chat.sql,
      originalSql: chat.sql
    });
  };

  const handleCancelEditSql = () => {
    setEditingSql({
      isEditing: false,
      sql: chat.sql,
      originalSql: chat.sql
    });
  };

  const handleSqlChange = (e) => {
    setEditingSql(prev => ({
      ...prev,
      sql: e.target.value
    }));
  };

  const handleUpdateSql = () => {
    onUpdateSql(editingSql.sql);
    setEditingSql({
      isEditing: false,
      sql: editingSql.sql,
      originalSql: editingSql.sql
    });
  };

  // Handle SQL editor key events
  const handleSqlKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleUpdateSql();
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between bg-gray-800 text-gray-100 px-3 py-2 rounded-t-md">
        <span className="text-xs font-medium">SQL Query</span>
        <div className="flex items-center space-x-2">
          {/* Edit SQL Button - Only show when not in edit mode */}
          {!editingSql.isEditing && (
            <>
              <button
                onClick={handleEditSql}
                className="text-gray-300 hover:text-white transition-colors flex items-center"
                title="Edit SQL query"
              >
                <FiEdit3 className="mr-1" size={12} />
                <span className="text-xs">Edit</span>
              </button>

              {/* Copy SQL Button - Only show when not in edit mode */}
              <button
                onClick={() => onCopy(chat.sql, `sql-${index}`)}
                className="text-gray-300 hover:text-white transition-colors flex items-center"
              >
                {copiedItems[`sql-${index}`] ? (
                  <>
                    <FiCheck className="text-green-400 mr-1" size={12} />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="mr-1" size={12} />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* SQL Query Display/Edit Area */}
      {editingSql.isEditing ? (
        <div className="bg-gray-900 text-gray-100 rounded-b-md overflow-hidden">
          <SQLEditorWithLines
            value={editingSql.sql}
            onChange={handleSqlChange}
            onKeyDown={handleSqlKeyDown}
          />
          <div className="flex justify-end space-x-2 mt-2 p-3 bg-gray-800">
            <button
              onClick={handleCancelEditSql}
              className="flex items-center text-xs text-gray-300 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            >
              <FiX className="mr-1" size={12} />
              Cancel
            </button>
            <button
              onClick={handleUpdateSql}
              disabled={chat.sqlUpdating}
              className="flex items-center text-xs bg-[#5D3FD3] text-white px-3 py-1 rounded hover:bg-[#6d4fe4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chat.sqlUpdating ? (
                <>
                  <AiOutlineLoading3Quarters className="animate-spin mr-1" size={12} />
                  Updating...
                </>
              ) : (
                <>
                  <FiSave className="mr-1" size={12} />
                  Update SQL
                </>
              )}
            </button>
          </div>
          <div className="text-xs text-gray-400 px-3 pb-2 bg-gray-800">
            Tip: Press Ctrl+Enter to quickly update
          </div>
        </div>
      ) : (
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-b-md overflow-x-auto text-xs font-mono break-words whitespace-pre-wrap break-all relative">
            <code>
              {chat.sql}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default SQLQuery;