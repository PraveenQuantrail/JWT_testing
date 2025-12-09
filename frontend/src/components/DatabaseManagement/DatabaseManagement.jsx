import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSync, FaPlug, FaSearch, FaCircle } from 'react-icons/fa';
import { FiDatabase, FiUser, FiEye } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import AddDatabase from './AddDatabase';
import EditDatabase from './EditDatabase';
import ShowDatabase from './ShowDatabase';
import { connectDBPinggy, databaseApi, authApi } from '../../utils/api';
import { MdKey } from "react-icons/md";
import { SessionIDContext } from '../../context/SessionIDContext';
import { TbLoader3 } from "react-icons/tb";
import { MdAutoDelete } from "react-icons/md";

const statusStyles = {
  'Connected': 'text-green-500',
  'Disconnected': 'text-red-500',
  'Testing...': 'text-yellow-500',
  'Connecting...': 'text-yellow-500',
  'Disconnecting...': 'text-yellow-500',
  'Connected (Warning)': 'text-orange-500',
};

const databaseTypes = ['All Types', 'PostgreSQL', 'MySQL', 'ClickHouse'];
const connectionTypes = ['All Connections', 'Local', 'External'];

const connectionsPerPage = 10;

const DB_MANAGER_ROLES = ['Super Admin', 'Admin', 'Editor'];

function CustomSelect({ value, onChange, options, ariaLabel }) {
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
      const selectedIndex = options.indexOf(value);
      const children = listRef.current.querySelectorAll('[role="option"]');
      if (children && children[selectedIndex]) {
        children[selectedIndex].focus();
      } else if (children[0]) {
        children[0].focus();
      }
    }
  }, [open, options, value]);

  const handleToggle = () => setOpen((v) => !v);

  const handleSelect = (opt) => {
    onChange(opt);
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

  return (
    <div ref={rootRef} className="relative inline-block w-56 text-sm">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={handleToggle}
        className={`w-full text-left flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-md px-3 py-2 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition`}
      >
        <span className="truncate">{value}</span>
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
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-56 overflow-auto focus:outline-none"
        >
          {options.map((opt, idx) => {
            const isSelected = opt === value;
            return (
              <div
                key={opt}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(opt)}
                onKeyDown={(e) => handleOptionKeyDown(e, opt, idx)}
                className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition
                  ${isSelected ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'}`}
              >
                <span className="truncate">{opt}</span>
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

export default function DatabaseManagement() {
  const [connections, setConnections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState({ role: '' });
  const [showAddDatabaseModal, setShowAddDatabaseModal] = useState(false);
  const [showEditDatabaseModal, setShowEditDatabaseModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const [showConnectionMenu, setShowConnectionMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingTrackConnection, setLoadingTrackConnection] = useState([]);
  const [databaseTypeFilter, setDatabaseTypeFilter] = useState('All Types');
  const [connectionTypeFilter, setConnectionTypeFilter] = useState('All Connections');

  const { sessionIDData, InsertSessionStorage, RemoveSessionId, checkCurrentSessionId } = useContext(SessionIDContext);

  // refs for plug buttons and for throttling reposition updates
  const plugRefs = useRef({});
  const rafRef = useRef(null);
  const lastPosRef = useRef(null);

  // Fetch current user role
  const fetchCurrentUser = useCallback(async () => {
    try {
      const session = sessionStorage.getItem('session') || localStorage.getItem('session');
      if (session) {
        try {
          const currentUserData = await authApi.getCurrentUser();
          if (currentUserData && currentUserData.user) {
            setCurrentUser({ role: currentUserData.user.role });
            return;
          }
        } catch (error) {
          // fallback to token decode if API call fails
          try {
            const sessionData = JSON.parse(session);
            let token = sessionData.token || sessionData.user?.token;
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setCurrentUser({ role: payload.role || '' });
              return;
            }
            setCurrentUser({ role: sessionData.user?.role || '' });
          } catch (err) {
            setCurrentUser({ role: '' });
          }
        }
      } else {
        setCurrentUser({ role: '' });
      }
    } catch (error) {
      console.error('Error getting current user info:', error);
      setCurrentUser({ role: '' });
    }
  }, []);

  const fetchDatabases = useCallback(async () => {
    try {
      const params = { page: currentPage, limit: connectionsPerPage };
      const data = await databaseApi.getAll(params);
      const databases = data.databases || data.data?.databases || data.rows || [];
      const totalPagesResp = data.totalPages || data.data?.totalPages || Math.ceil((data.total || 0) / connectionsPerPage);

      const filterData = databases.map((conn) => ({ dbid: conn.id, isLoadinFastapi: false }));
      setLoadingTrackConnection(filterData);
      setConnections(databases);
      setTotalPages(totalPagesResp || 1);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch databases');
    }
  }, [currentPage]);

  useEffect(() => {
    fetchCurrentUser();
    fetchDatabases();

    const onSessionUpdated = () => {
      fetchCurrentUser();
      fetchDatabases();
    };
    window.addEventListener('sessionUpdated', onSessionUpdated);
    return () => window.removeEventListener('sessionUpdated', onSessionUpdated);
  }, [fetchCurrentUser, fetchDatabases]);

  // If user gets demoted to Readonly while on this page, redirect to /chat immediately
  useEffect(() => {
    const role = currentUser.role;
    if (role && !DB_MANAGER_ROLES.includes(role)) {
      // Readonly should not stay on this page
      window.location.href = '/chat';
    }
  }, [currentUser]);

  // Filter connections based on search query and filters
  const filtered = connections.filter((conn) => {
    const matchesSearch = `${conn.name} ${conn.host || conn.connection_string || ''}:${conn.port || ''} ${conn.database} ${conn.type}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    // Normalize connection type for filtering
    const normalizedConnectionType = conn.server_type ? 
      conn.server_type.charAt(0).toUpperCase() + conn.server_type.slice(1) : 
      'Local';
    
    const matchesDatabaseType = databaseTypeFilter === 'All Types' || conn.type === databaseTypeFilter;
    const matchesConnectionType = connectionTypeFilter === 'All Connections' || normalizedConnectionType === connectionTypeFilter;
    
    return matchesSearch && matchesDatabaseType && matchesConnectionType;
  });

  const displayHostDetails = (connection) => {
    if (connection.server_type === 'external') {
      return 'External Connection';
    }
    return connection.host
      ? `${connection.host}${connection.port ? `:${connection.port}` : ''}`
      : 'Not specified';
  };

  // Helper function to capitalize connection type for display
  const displayConnectionType = (connection) => {
    if (!connection.server_type) return 'Local';
    return connection.server_type.charAt(0).toUpperCase() + connection.server_type.slice(1);
  };

  const computeMenuPosition = (button) => {
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const offset = 16;
    return {
      top: rect.top + window.scrollY + offset,
      left: rect.left + window.scrollX,
    };
  };

  const toggleConnectionMenu = (id, e) => {
    e.stopPropagation();
    const button = plugRefs.current[id];
    if (!button) {
      setShowConnectionMenu(null);
      return;
    }
    const position = computeMenuPosition(button);
    if (position) {
      setShowConnectionMenu({
        id,
        position,
      });
    }
  };

  // Update the menu position on resize/scroll while the menu is open.
  useEffect(() => {
    const updatePosition = () => {
      if (!showConnectionMenu) return;
      const id = showConnectionMenu.id;
      const button = plugRefs.current[id];
      if (!button) {
        // if button is not available anymore, close the menu
        setShowConnectionMenu(null);
        return;
      }

      // throttle using requestAnimationFrame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        const newPos = computeMenuPosition(button);
        if (!newPos) return;

        // avoid unnecessary state updates by comparing with last known position
        const last = lastPosRef.current;
        if (!last || Math.abs(last.top - newPos.top) > 1 || Math.abs(last.left - newPos.left) > 1) {
          lastPosRef.current = newPos;
          setShowConnectionMenu((prev) => (prev ? { ...prev, position: newPos } : prev));
        }
      });
    };

    if (showConnectionMenu) {
      // update immediately (in case something else moved the element before listeners run)
      updatePosition();

      // listen for relevant events
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('orientationchange', updatePosition);

      // Also observe body mutations that might affect layout (optional and lightweight)
      let mutationObserver;
      try {
        mutationObserver = new MutationObserver(() => {
          updatePosition();
        });
        mutationObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
      } catch (e) {
        // ignore if MutationObserver not available or errors
      }

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('orientationchange', updatePosition);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (mutationObserver) {
          mutationObserver.disconnect();
        }
      };
    }

    return () => {
      // cleanup if showConnectionMenu is null
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [showConnectionMenu]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setShowConnectionMenu(null);
  };

  const handleEditClick = async (id) => {
    // Refresh current user role to ensure we have up-to-date permissions
    try {
      await fetchCurrentUser();
    } catch (err) {
      // if refresh fails, we'll continue using the current client state but log the error
      console.error('Failed to refresh current user before edit:', err);
    }

    if (!canManageDatabases()) {
      toast.error('You do not have permission to edit databases');
      return;
    }

    try {
      const connection = await databaseApi.getDetails(id);
      setCurrentConnection(connection);
      setShowEditDatabaseModal(true);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch database details');
    }
  };

  const handleShowDatabase = async (id) => {
    try {
      const connection = await databaseApi.getDetails(id);
      setSelectedConnection(connection);
      setShowDatabaseModal(true);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch database details');
    }
  };

  const menuConnection = showConnectionMenu && connections.find((conn) => conn.id === showConnectionMenu.id);

  const MenuButton = ({ onClick, children, last = false }) => (
    <button
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none ${!last ? 'border-b border-gray-200' : ''
        }`}
      style={{ background: 'transparent' }}
    >
      {children}
    </button>
  );

  // Permission helpers
  const canManageDatabases = () => {
    const role = currentUser.role;
    return DB_MANAGER_ROLES.includes(role);
  };

  const showAddButton = canManageDatabases();

  // Action handlers
  const handleTest = async (id) => {
    if (!canManageDatabases()) {
      toast.error('You do not have permission to test databases');
      return;
    }

    try {
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Testing...' } : conn
      ));

      const result = await databaseApi.test(id);

      if (result.success) {
        if (result.message && result.message.includes('Warning:')) {
          toast.warn(result.message);
        } else {
          toast.success(result.message || 'Test succeeded');
        }
        await fetchDatabases();
      } else {
        toast.error(result.message || 'Test failed');
        setConnections(prev => prev.map(conn =>
          conn.id === id ? { ...conn, status: 'Disconnected' } : conn
        ));
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to test database';
      if (errorMessage && errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Disconnected' } : conn
      ));
    }
    setShowConnectionMenu(null);
  };

  const handleConnect = async (id) => {
    if (!canManageDatabases()) {
      toast.error('You do not have permission to connect databases');
      return;
    }

    try {
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Connecting...' } : conn
      ));

      const result = await databaseApi.connect(id);

      if (result.success) {
        if (result.message && result.message.includes('Warning:')) {
          toast.warn(result.message);
        } else {
          toast.success(result.message || 'Connected');
        }
        await fetchDatabases();
      } else {
        toast.error(result.message || 'Connect failed');
        setConnections(prev => prev.map(conn =>
          conn.id === id ? { ...conn, status: 'Disconnected' } : conn
        ));
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to connect to database';
      if (errorMessage && errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Disconnected' } : conn
      ));
    }
    setShowConnectionMenu(null);
  };

  const handleDisconnect = async (id) => {
    if (!canManageDatabases()) {
      toast.error('You do not have permission to disconnect databases');
      return;
    }

    try {
      setConnections(prev => prev.map(conn =>
        conn.id === id ? { ...conn, status: 'Disconnecting...' } : conn
      ));

      const result = await databaseApi.disconnect(id);

      if (result.success) {
        toast.success(result.message || 'Disconnected');
        await fetchDatabases();
      } else {
        toast.error(result.message || 'Disconnect failed');
        await fetchDatabases();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to disconnect from database');
      await fetchDatabases();
    }
    setShowConnectionMenu(null);
  };

  const handleDelete = async (id) => {
    if (!canManageDatabases()) {
      toast.error('You do not have permission to delete databases');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        await databaseApi.delete(id);
        setConnections(prev => prev.filter(conn => conn.id !== id));
        toast.success('Database connection deleted successfully!');
      } catch (error) {
        toast.error(error.message || 'Failed to delete database connection');
      }
    }
  };

  const handleAddDatabase = async (newDatabase) => {
    if (!canManageDatabases()) {
      toast.error('You do not have permission to add databases');
      return;
    }
    try {
      await databaseApi.create(newDatabase);
      toast.success('Database added successfully!');
      setShowAddDatabaseModal(false);
      fetchDatabases();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add database';
      if (errorMessage && errorMessage.includes('already exists')) {
        toast.error('A connection with this name or details already exists');
      } else if (errorMessage && errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEditDatabase = async (updatedDatabase) => {
    if (!canManageDatabases()) {
      toast.error('You do not have permission to edit databases');
      return;
    }
    try {
      await databaseApi.update(updatedDatabase.id, updatedDatabase);
      toast.success('Database updated successfully!');
      setShowEditDatabaseModal(false);
      fetchDatabases();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to update database';
      if (errorMessage && errorMessage.includes('already exists')) {
        toast.error('A connection with this name or details already exists');
      } else if (errorMessage && errorMessage.includes('MongoDB connections are temporarily disabled')) {
        toast.error('MongoDB connections are temporarily disabled');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshAnimation(true);
    Promise.all([fetchCurrentUser(), fetchDatabases()]).finally(() => {
      setTimeout(() => setRefreshAnimation(false), 1000);
    });
  };

  // FastAPI session generation
  const handleFastAPIConnection = async (dbid) => {
    const findDatabase = connections.find((val) => val.id === dbid);

    setLoadingTrackConnection((prev) =>
      prev.map((conn) => {
        if (conn.dbid === dbid) {
          return { ...conn, isLoadinFastapi: true };
        }
        return conn;
      })
    );

    const StatusSessionId = typeof checkCurrentSessionId === 'function' ? checkCurrentSessionId(dbid) : false;

    if (StatusSessionId) {
      toast.warning('Session ID already generated!');

      setLoadingTrackConnection((prev) =>
        prev.map((conn) => {
          if (conn.dbid === dbid) {
            return { ...conn, isLoadinFastapi: false };
          }
          return conn;
        })
      );

      setTimeout(() => {
        fetchDatabases().catch(() => { /* swallow */ });
      }, 300);

      return;
    } else {
      try {
        const connectFastAPI = await connectDBPinggy(findDatabase);

        if (connectFastAPI.success) {
          await InsertSessionStorage(connectFastAPI);

          setLoadingTrackConnection((prev) =>
            prev.map((conn) => {
              if (conn.dbid === dbid) {
                return { ...conn, isLoadinFastapi: false };
              }
              return conn;
            })
          );

          toast.success(connectFastAPI.message);

          fetchDatabases().catch(() => { /* swallow */ });
        } else {
          setLoadingTrackConnection((prev) =>
            prev.map((conn) => {
              if (conn.dbid === dbid) {
                return { ...conn, isLoadinFastapi: false };
              }
              return conn;
            })
          );
          toast.error(connectFastAPI.message);
        }
      } catch (err) {
        setLoadingTrackConnection((prev) =>
          prev.map((conn) => {
            if (conn.dbid === dbid) {
              return { ...conn, isLoadinFastapi: false };
            }
            return conn;
          })
        );
        toast.error(err.message || 'Failed to generate session key');
      }
    }
  };

  // Handle session ID deletion with toast notification
  const handleDeleteSessionId = async (dbid) => {
    try {
      await RemoveSessionId(dbid);
      toast.success('Session ID deleted successfully!');
      fetchDatabases().catch(() => { /* swallow */ });
    } catch (error) {
      toast.error('Failed to delete session ID');
    }
  };

  // checking DB is Connected
  const IsDBConnected = (status) => {
    return status === 'Connected' || status === 'Connected (Warning)';
  };

  const IsSessionGenerated = (dbID) => {
    try {
      if (typeof checkCurrentSessionId === 'function') {
        const checked = checkCurrentSessionId(dbID);
        if (checked) return true;
      }
    } catch (e) {
    }
    const findvalue = sessionIDData.find((val) => val.dbid === dbID);
    return !!findvalue;
  };

  const Isloadingfastapi = (dbid) => {
    const find = loadingTrackConnection.filter((val) => val.dbid === dbid);
    return find.length ? find[0].isLoadinFastapi : false;
  };

  // Close connection menu when clicking outside and close on Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showConnectionMenu && !event.target.closest('#conn-menu-root')) {
        setShowConnectionMenu(null);
      }
    };

    const handleKeyDown = (event) => {
      if (!showConnectionMenu) return;
      // Close the menu when Escape is pressed
      if (event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27) {
        setShowConnectionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConnectionMenu]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4 bg-gray-50 text-gray-800"
    >
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Database Connections</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 capitalize">
            {currentUser.role || 'Loading...'}
          </span>
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700">
            <FiUser size={20} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex gap-3 items-center w-full md:w-auto">
          <button
            className={`flex items-center gap-2 px-2 py-1 sm:px-4 sm:py-2 bg-[#5D3FD3] text-white rounded text-sm sm:text-base
             hover:bg-[#6d4fe4] focus:bg-[#5D3FD3] outline-none transition ${!showAddButton ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => showAddButton && setShowAddDatabaseModal(true)}
            disabled={!showAddButton}
            title={!showAddButton ? 'Insufficient permissions' : 'Add Connection'}
          >
            <FaPlus /> Add Connection
          </button>

          <div className="relative flex-grow md:flex-grow-0 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search connections..."
              className="pl-10 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Replaced the primitive native selects with CustomSelect for a modern, accessible dropdown */}
          <CustomSelect
            ariaLabel="Filter by database type"
            value={databaseTypeFilter}
            onChange={(val) => setDatabaseTypeFilter(val)}
            options={databaseTypes}
          />

          <CustomSelect
            ariaLabel="Filter by connection type"
            value={connectionTypeFilter}
            onChange={(val) => setConnectionTypeFilter(val)}
            options={connectionTypes}
          />
        </div>
        <div className="flex gap-3 items-center text-sm text-gray-600 w-full md:w-auto justify-end">
          <span>{filtered.length} connections</span>
          <button
            onClick={handleRefresh}
            className={`text-gray-500 hover:text-purple-600 transition ${refreshAnimation ? 'animate-spin' : ''}`}
            title="Refresh connections"
          >
            <FaSync />
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-max text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Connection Type</th>
                <th className="p-3 font-semibold">Host</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className={
              refreshAnimation ? 'opacity-50 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'
            }>
              {filtered.map((conn, index) => (
                <tr key={conn.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#5D3FD3] rounded flex items-center justify-center text-white">
                        <FiDatabase className="text-xs sm:text-sm" />
                      </div>
                      <div>
                        <div className="font-semibold">{conn.name}</div>
                        <div className="text-xs text-gray-500">{conn.database}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-semibold">{conn.type}</td>
                  <td className="p-3 font-semibold">{displayConnectionType(conn)}</td>
                  <td className="p-3 font-semibold">
                    <div className="max-w-xs truncate" title={displayHostDetails(conn)}>{displayHostDetails(conn)}</div>
                  </td>
                  <td className="p-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <FaCircle className={statusStyles[conn.status] || 'text-gray-500'} size={12} />
                      {conn.status}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1 text-purple-600 relative items-center">
                      {/* Plug-icon */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        <button
                          ref={(el) => (plugRefs.current[conn.id] = el)}
                          onClick={(e) => toggleConnectionMenu(conn.id, e)}
                          className="hover:text-purple-800 transition text-[#5d3fd3] flex items-center justify-center"
                          title="Connection options"
                          disabled={conn.type === 'MongoDB'}
                        >
                          <FaPlug className={`w-4 h-4 ${conn.type === 'MongoDB' ? 'opacity-50' : ''}`} />
                        </button>
                      </div>

                      {/* View */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        <button
                          onClick={() => handleShowDatabase(conn.id)}
                          className="hover:text-purple-800 transition text-[#5d3fd3] flex items-center justify-center"
                          title="View Database"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Edit */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        <button
                          onClick={() => handleEditClick(conn.id)}
                          className="hover:text-purple-800 transition text-[#5d3fd3] flex items-center justify-center"
                          title="Edit"
                          disabled={!canManageDatabases()}
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Delete */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        <button
                          onClick={() => handleDelete(conn.id)}
                          className="hover:text-purple-800 transition text-[#5d3fd3] flex items-center justify-center"
                          title="Delete"
                          disabled={!canManageDatabases()}
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Session / Key */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        {IsSessionGenerated(conn.id) ? (
                          <button
                            onClick={() => handleDeleteSessionId(conn.id)}
                            className="hover:text-purple-800 transition text-[#5d3fd3] flex items-center justify-center cursor-pointer"
                            title="Delete SessionID"
                          >
                            <MdAutoDelete className="w-5 h-5 mt-1.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFastAPIConnection(conn.id)}
                            disabled={!IsDBConnected(conn.status) || Isloadingfastapi(conn.id)}
                            className={`${IsDBConnected(conn.status) ? 'hover:text-purple-800 text-[#5d3fd3]' : 'cursor-not-allowed text-[#ddd4ff]'} transition flex items-center justify-center`}
                            title="Generate Session key"
                          >
                            {Isloadingfastapi(conn.id) ? (
                              <TbLoader3 className="w-5 h-5 animate-spin" />
                            ) : (
                              <MdKey className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * connectionsPerPage + 1, filtered.length)} to{' '}
              {Math.min(currentPage * connectionsPerPage, filtered.length)} of {filtered.length} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => handlePageChange(number)}
                  className={`px-3 py-1 border rounded-md text-sm ${currentPage === number ? 'bg-purple-600 text-white' : ''}`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showConnectionMenu && menuConnection && (
        <div
          id="conn-menu-root"
          className="z-50 w-28 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 absolute"
          style={{
            top: `${showConnectionMenu.position.top}px`,
            left: `${showConnectionMenu.position.left}px`,
          }}
        >
          {menuConnection.type === 'MongoDB' ? (
            <div className="px-4 py-2 text-sm text-gray-500">MongoDB Disabled</div>
          ) : menuConnection.status === 'Connected' || menuConnection.status === 'Connected (Warning)' ? (
            <>
              <MenuButton onClick={() => handleDisconnect(menuConnection.id)}>Disconnect</MenuButton>
              <MenuButton onClick={() => handleTest(menuConnection.id)} last>Test</MenuButton>
            </>
          ) : menuConnection.status === 'Disconnected' ? (
            <>
              <MenuButton onClick={() => handleConnect(menuConnection.id)}>Connect</MenuButton>
              <MenuButton onClick={() => handleTest(menuConnection.id)} last>Test</MenuButton>
            </>
          ) : (
            <>
              <MenuButton onClick={() => handleConnect(menuConnection.id)}>Connect</MenuButton>
              <MenuButton onClick={() => handleDisconnect(menuConnection.id)} last>Stop Testing</MenuButton>
            </>
          )}
        </div>
      )}

      {showAddDatabaseModal && (
        <AddDatabase onClose={() => setShowAddDatabaseModal(false)} onAddDatabase={handleAddDatabase} />
      )}

      {showEditDatabaseModal && currentConnection && (
        <EditDatabase connection={currentConnection} onClose={() => setShowEditDatabaseModal(false)} onEditDatabase={handleEditDatabase} />
      )}

      {showDatabaseModal && selectedConnection && (
        <ShowDatabase connection={selectedConnection} onClose={() => { setShowDatabaseModal(false); setSelectedConnection(null); }} />
      )}
    </motion.div>
  );
}