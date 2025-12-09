import React, { useState, useEffect, useCallback } from 'react';
import { FaUserPlus, FaEdit, FaTrash, FaSearch, FaSync } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import AddUser from './AddUser';
import EditUser from './EditUser';
import { userApi, authApi } from '../../utils/api';
import { formatDateTime } from '../../utils/api';

const statuses = ['All Status', 'Active', 'Inactive'];
const USERS_PER_PAGE = 10;

// Define role hierarchy for sorting
const roleHierarchy = {
  'Super Admin': 4,
  'Admin': 3,
  'Editor': 2,
  'Readonly': 1
};

// Roles that can access User Management
const USER_MANAGER_ROLES = ['Super Admin', 'Admin'];

function CustomSelect({ value, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = React.useRef(null);
  const listRef = React.useRef(null);

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
    <div ref={rootRef} className="relative inline-block w-40 text-sm">
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

export default function UserManagement({ setIsAuthenticated }) {
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState(['All Roles']);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [refreshAnimation, setRefreshAnimation] = useState(false);

  // Function to update current user info from session and refresh from server
  const updateCurrentUserInfo = async () => {
    try {
      const session = sessionStorage.getItem('session') || localStorage.getItem('session');
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.token) {
          const tokenPayload = JSON.parse(atob(sessionData.token.split('.')[1]));
          setCurrentUserId(tokenPayload.userId);

          // Get fresh user data from server to ensure role is updated
          try {
            const currentUserData = await authApi.getCurrentUser();
            if (currentUserData && currentUserData.user) {
              const freshRole = currentUserData.user.role;
              setCurrentUserRole(freshRole);

              if (freshRole !== tokenPayload.role) {
                const newSession = {
                  ...sessionData,
                  user: { ...sessionData.user, role: freshRole }
                };

                if (localStorage.getItem('session')) {
                  localStorage.setItem('session', JSON.stringify(newSession));
                }
                if (sessionStorage.getItem('session')) {
                  sessionStorage.setItem('session', JSON.stringify(newSession));
                }

                // Notify other components that session details have updated
                try {
                  window.dispatchEvent(new Event('sessionUpdated'));
                } catch (err) {
                  // Silent catch
                }
              }
            }
          } catch (error) {
            // Fallback to token role if API call fails
            console.error('Error fetching current user:', error);
            if (tokenPayload.role) {
              setCurrentUserRole(tokenPayload.role);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user info:', error);
    }
  };

  useEffect(() => {
    updateCurrentUserInfo();
  }, []);

  // If user gets demoted to Editor or Readonly while on this page, redirect to /chat immediately
  useEffect(() => {
    const role = currentUserRole;
    if (role && !USER_MANAGER_ROLES.includes(role)) {
      // Editor or Readonly should not stay on this page
      window.location.href = '/chat';
    }
  }, [currentUserRole]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: USERS_PER_PAGE,
        role: roleFilter !== 'All Roles' ? roleFilter : undefined,
        status: statusFilter !== 'All Status' ? statusFilter : undefined,
        search: searchQuery || undefined
      };
      const data = await userApi.getAll(params);

      // Normalize data format in case the API wrapper
      const usersList = data.users || data.data?.users || [];
      const availableRolesFromAPI = data.availableRoles || data.data?.availableRoles || [];

      // Sort users by role hierarchy (Super Admin -> Admin -> Editor -> Readonly)
      const sortedUsers = usersList.sort((a, b) => {
        // First sort by role hierarchy
        const roleWeightA = roleHierarchy[a.role] || 0;
        const roleWeightB = roleHierarchy[b.role] || 0;
        
        if (roleWeightA !== roleWeightB) {
          return roleWeightB - roleWeightA; // Higher weight first
        }
        
        // If same role, sort by creation date (earliest first)
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return dateA - dateB;
      });

      setUsers(sortedUsers);
      setRoles(['All Roles', ...availableRolesFromAPI]);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, roleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    // Only fetch users if current user has permission
    if (currentUserRole && USER_MANAGER_ROLES.includes(currentUserRole)) {
      fetchUsers();
    }
  }, [fetchUsers, currentUserRole]);

  const handleRefresh = () => {
    setRefreshAnimation(true);
    Promise.all([updateCurrentUserInfo(), fetchUsers()]).finally(() => {
      setTimeout(() => setRefreshAnimation(false), 1000);
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter;
    const userName = user.name || '';
    const userEmail = user.email || '';
    const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const start = (currentPage - 1) * USERS_PER_PAGE;
  const end = start + USERS_PER_PAGE;
  const usersToDisplay = filteredUsers.slice(start, end);

  const handleDelete = async (id) => {
    const userToDelete = users.find(user => user.id === id);

    // Check permissions
    if (!canDeleteUser(userToDelete)) {
      toast.error('You do not have permission to delete this user');
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
        await userApi.delete(id);
        setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
        toast.success('User deleted successfully!');
        if (currentUserId && currentUserId.toString() === id.toString()) {
          toast.info('Your account has been deleted. Logging out...');
          setTimeout(() => {
            localStorage.removeItem('session');
            sessionStorage.removeItem('session');
            setIsAuthenticated(false);
            window.location.href = '/';
          }, 2000);
        }
      } catch (error) {
        const msg = error?.response?.data?.message || error.message || 'Failed to delete user';
        toast.error(msg);
      }
    }
  };

  const handleEdit = async (id) => {
    // Refresh current user role to ensure we have up-to-date permissions
    try {
      await updateCurrentUserInfo();
    } catch (err) {
      console.error('Failed to refresh current user before edit:', err);
    }

    const userToEdit = users.find(user => user.id === id);

    // Check permissions
    if (!canEditUser(userToEdit)) {
      toast.error('You do not have permission to edit this user');
      return;
    }

    setCurrentUser(userToEdit);
    setShowEditUserModal(true);
  };

  const handleAddUser = async (newUser) => {
    // Check permissions
    if (!canAddUser()) {
      toast.error('You do not have permission to add users');
      return;
    }

    try {
      const createdUser = await userApi.create(newUser);
      // Normalize possible response shapes
      const created = createdUser.user || createdUser.data?.user || createdUser;
      setUsers(prevUsers => [...prevUsers, {
        ...created,
        id: created.uid || created.id || Date.now(),
        lastLogin: created.lastLogin || null,
        createdAt: created.createdAt || created.created_at || new Date().toISOString()
      }]);
      setShowAddUserModal(false);
      toast.success('User added successfully!');
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to add user';
      if (errorMessage.toLowerCase().includes('already exists')) {
        toast.error('User with this email already exists');
      } else if (errorMessage.includes('Only Super Admins can create Super Admin users')) {
        toast.error('Only Super Admins can create Super Admin users');
      } else if (errorMessage.includes('Only Super Admins can create Admin or Super Admin users')) {
        toast.error('Only Super Admins can create Admin or Super Admin users');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleUpdateUser = async (id, updatedData) => {
    // Check permissions
    if (!canEditUser(users.find(user => user.id === id))) {
      toast.error('You do not have permission to edit this user');
      return;
    }

    try {
      const res = await userApi.update(id, updatedData);
      // Normalize response shape
      const updatedUser = res.user || res.data?.user || res;

      // Update the users list
      const updatedUsers = users.map(user =>
        user.id === id ? { ...user, ...updatedUser } : user
      );

      // Re-sort users after update using role hierarchy
      const sortedUsers = updatedUsers.sort((a, b) => {
        const roleWeightA = roleHierarchy[a.role] || 0;
        const roleWeightB = roleHierarchy[b.role] || 0;
        
        if (roleWeightA !== roleWeightB) {
          return roleWeightB - roleWeightA;
        }
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return dateA - dateB;
      });

      setUsers(sortedUsers);
      setShowEditUserModal(false);
      toast.success('User updated successfully!');

      await updateCurrentUserInfo();
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Failed to update user';
      if (msg.includes('You cannot edit a Super Admin user') || msg.includes('Only Super Admins can edit Super Admin users')) {
        toast.error('You cannot edit this Super Admin user');
      } else if (msg.includes('You cannot change your own role')) {
        toast.error('You cannot change your own role');
      } else {
        toast.error(msg);
      }
    }
  };

  // Permission helpers
  const canAddUser = () => {
    const role = currentUserRole;
    return USER_MANAGER_ROLES.includes(role);
  };

  const canEditUser = (user) => {
    if (!user) return false;

    // Super Admins can edit anyone
    if (currentUserRole === 'Super Admin') return true;

    // Admin rules:
    if (currentUserRole === 'Admin') {
      // Admins cannot edit Admin or Super Admin users
      if (user.role === 'Super Admin') return false;
      if (user.role === 'Admin') {
        // allow editing self (phone/address) but not other admins
        return currentUserId && currentUserId.toString() === user.id.toString();
      }
      // For Editor / Readonly, Admins can edit
      return true;
    }

    // Editors / Readonly cannot edit other users via this UI; they can only edit themselves (and don't have access to this page)
    if (currentUserId && currentUserId.toString() === user.id.toString()) return true;
    return false;
  };

  const canDeleteUser = (user) => {
    if (!user) return false;

    // Super Admins can delete Admins, Editors, Readonly
    if (currentUserRole === 'Super Admin') {
      if (currentUserId && currentUserId.toString() === user.id.toString()) return false;
      return true;
    }

    // Admins can delete Editor or Readonly only, and cannot delete themselves or Admin/SuperAdmin
    if (currentUserRole === 'Admin') {
      if (currentUserId && currentUserId.toString() === user.id.toString()) return false;
      return user.role === 'Editor' || user.role === 'Readonly';
    }

    // Editors / Readonly cannot delete anyone
    return false;
  };

  const showAddButton = canAddUser();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-3 sm:p-6 bg-gray-50 text-gray-80"
    >
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">User Management</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          {showAddButton && (
            <button
              data-testid="add-user-button"
              className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#5D3FD3] text-white rounded whitespace-nowrap text-sm sm:text-base
               hover:bg-[#6d4fe4] focus:outline-none focus:ring-[#5D3FD3] transition"
              onClick={() => setShowAddUserModal(true)}
            >
              <FaUserPlus className="text-sm sm:text-base" /> Add User
            </button>
          )}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700">
            <FiUser className="text-sm sm:text-base" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-64 lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-center gap-2 flex-nowrap">
            {/* Replaced native select with CustomSelect for role filter */}
            <CustomSelect
              ariaLabel="Filter by role"
              value={roleFilter}
              onChange={setRoleFilter}
              options={roles}
            />

            {/* Replaced native select with CustomSelect for status filter */}
            <CustomSelect
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statuses}
            />
          </div>
        </div>

        <div className="flex gap-3 items-center text-sm text-gray-600 whitespace-nowrap">
          <span className="hidden sm:block">
            Showing {start + 1}-{Math.min(end, totalUsers)} of {totalUsers} users
          </span>
          <span className="sm:hidden text-xs">
            {start + 1}-{Math.min(end, totalUsers)} of {totalUsers}
          </span>
          <button
            onClick={handleRefresh}
            className={`text-gray-500 hover:text-purple-600 transition ${refreshAnimation ? 'animate-spin' : ''}`}
            title="Refresh users"
          >
            <FaSync />
          </button>
        </div>
      </div>

      {/* Table container: w-full, overflow-x-auto, NO vertical scroll */}
      <div className="bg-white shadow rounded w-full overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-max text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 font-semibold">USER</th>
                <th className="p-3 font-semibold">ROLE</th>
                <th className="p-3 font-semibold">STATUS</th>
                <th className="p-3 font-semibold">2FA</th>
                <th className="p-3 font-semibold">LAST LOGIN</th>
                <th className="p-3 font-semibold">ADDED DATE</th>
                <th className="p-3 font-semibold text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className={
              refreshAnimation ? 'opacity-50 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'
            }>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  </td>
                </tr>
              ) : usersToDisplay.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                usersToDisplay.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`border-t hover:bg-gray-50 ${user.role === 'Super Admin' ? 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80 hover:from-amber-100/80 hover:to-yellow-100/80 border-l-4 border-l-amber-400 shadow-sm' : ''}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${user.role === 'Super Admin' ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md' : 'bg-purple-100 text-purple-700'}`}>
                          <FiUser className="text-xs sm:text-sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        user.role === 'Super Admin' 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:shadow-lg'
                          : user.role === 'Admin'
                            ? 'bg-[#5D3FD3] text-white'
                            : user.role === 'Editor'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                        {user.role === 'Super Admin' && (
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded ${user.status === 'Active'
                          ? 'bg-green-100 text-green-800 font-medium'
                          : 'bg-red-100 text-red-800 font-medium'
                          }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={user.twoFA}
                          readOnly
                        />
                        <div className={`w-9 h-5 sm:w-11 sm:h-6 ${user.twoFA ? 'bg-purple-600' : 'bg-gray-200'} rounded-full peer transition-all relative`}>
                          <div className={`absolute top-0.5 sm:top-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow transition-all ${user.twoFA ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`} />
                        </div>
                      </label>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatDateTime(user.lastLogin)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 sm:gap-4 justify-center text-purple-600">
                        <button 
                          onClick={() => handleEdit(user.id)} 
                          className={`hover:text-purple-800 ${
                            !canEditUser(user) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={!canEditUser(user)}
                          title={
                            !canEditUser(user) 
                              ? user.role === 'Super Admin' 
                                ? 'Only Super Admins can edit Super Admin users'
                                : 'Cannot edit user'
                              : (currentUserId && currentUserId.toString() === user.id.toString())
                                ? 'You can edit your phone and address but not your role'
                                : 'Edit user'
                          }
                        >
                          <FaEdit className="text-sm sm:text-base" />
                        </button>
                        <button
                          data-testid="delete-user-button"
                          onClick={() => handleDelete(user.id)}
                          className={`hover:text-purple-800 ${
                            !canDeleteUser(user) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={!canDeleteUser(user)}
                          title={
                            !canDeleteUser(user)
                              ? user.role === 'Super Admin'
                                ? currentUserRole !== 'Super Admin'
                                  ? 'You cannot delete a Super Admin user'
                                  : 'Super Admin cannot delete their own account'
                                : 'You cannot delete this user'
                              : 'Delete user'
                          }
                        >
                          <FaTrash className="text-sm sm:text-base" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * USERS_PER_PAGE + 1, totalUsers)} to{' '}
              {Math.min(currentPage * USERS_PER_PAGE, totalUsers)} of {totalUsers} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => setCurrentPage(number)}
                  className={`px-3 py-1 border rounded-md text-sm ${currentPage === number ? 'bg-purple-600 text-white' : ''
                    }`}
                >
                  {number}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {showAddUserModal && (
        <AddUser
          onClose={() => setShowAddUserModal(false)}
          onAddUser={handleAddUser}
          currentUserRole={currentUserRole}
        />
      )}
      {showEditUserModal && currentUser && (
        <EditUser
          user={currentUser}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setShowEditUserModal(false)}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </motion.div>
  );
}