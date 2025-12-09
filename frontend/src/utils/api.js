import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const USERNAME_PINGGY = process.env.REACT_APP_USERNAME_PINGGY;
const PASSWORD_PINGGY = process.env.REACT_APP_PASSWORD_PINGGY;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Helpers for session storage
const SESSION_KEY = 'session';

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('readSession error:', err);
    return null;
  }
}

function writeSession(sessionObj, { persist = true } = {}) {
  try {
    const str = JSON.stringify(sessionObj || {});
    if (persist) {
      localStorage.setItem(SESSION_KEY, str);
      sessionStorage.setItem(SESSION_KEY, str);
    } else {
      sessionStorage.setItem(SESSION_KEY, str);
      localStorage.removeItem(SESSION_KEY);
    }
    // Notify other windows/components
    try { window.dispatchEvent(new Event('sessionUpdated')); } catch (e) { }
  } catch (err) {
    console.error('writeSession error:', err);
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    try { window.dispatchEvent(new Event('sessionUpdated')); } catch (e) { }
  } catch (err) {
    console.error('clearSession error:', err);
  }
}

function getTokenFromSession() {
  const s = readSession();
  if (!s) return null;
  return s.token || s.user?.token || null;
}

function decodeToken(token) {
  try {
    return jwtDecode(token);
  } catch (err) {
    return null;
  }
}

// Explicit token storage helpers
function storeTokenForLogin(token, { persist = true } = {}) {
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload) return false;

  const session = readSession() || {};
  session.token = token;
  session.user = session.user || {};

  session.user.token = token;
  if (payload.userId) session.user.id = payload.userId;
  if (payload.role) session.user.role = payload.role;
  if (payload.email) session.user.email = payload.email;
  if (payload.name) session.user.name = payload.name;
  if (payload.is_super_admin !== undefined) session.user.is_super_admin = payload.is_super_admin;

  writeSession(session, { persist });
  return true;
}

// Only set token if it belongs to the current session user
function setTokenSafely(token, { persist = true } = {}) {
  if (!token) return false;
  const payload = decodeToken(token);
  if (!payload || !payload.userId) return false;

  const session = readSession();
  if (!session) {
    // No existing session
    console.warn('setTokenSafely: no existing session, not storing token automatically.');
    return false;
  }

  const currentUserId = session.user?.id || decodeToken(session.token || session.user?.token || '')?.userId;
  if (currentUserId && currentUserId.toString() === payload.userId.toString()) {
    session.token = token;
    session.user = session.user || {};
    session.user.token = token;
    if (payload.role) session.user.role = payload.role;
    if (payload.name) session.user.name = payload.name;
    writeSession(session, { persist });
    return true;
  }

  console.warn('setTokenSafely: token belongs to different userId, refusing to overwrite current session.');
  return false;
}

function clearTokenForCurrentSession() {
  const session = readSession();
  if (!session) return;
  delete session.token;
  if (session.user) delete session.user.token;
  writeSession(session, { persist: !!localStorage.getItem(SESSION_KEY) });
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getTokenFromSession();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers = config.headers || {};
    config.headers['Cache-Control'] = 'no-cache, no-store';
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  response => {
    // If backend returned a newToken for effected user role change, update stored sessions
    try {
      if (response?.data?.newToken) {
        setTokenSafely(response.data.newToken);
      }
      // If backend returns a refreshed session object
      if (response?.data?.session && response.data.session.token) {
        setTokenSafely(response.data.session.token);
      }
    } catch (err) {
      console.error('Error in response interceptor updating token:', err);
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';
      // If server indicates account deletion/revoked, clear session and redirect
      if (errorMessage.includes('Token revoked') || errorMessage.includes('User account no longer exists')) {
        clearSession();
        if (typeof window !== 'undefined') {
          alert('Your account has been deleted. Please contact administrator.');
          window.location.href = '/?message=account_deleted';
        }
      } else if (errorMessage.includes('Token expired') || errorMessage.includes('Invalid token')) {
        clearSession();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email, password, { persist = true } = {}) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      const data = response.data || {};
      // If token is returned, store explicitly
      if (data.token) {
        storeTokenForLogin(data.token, { persist });
      } else if (data.user && data.user.token) {
        storeTokenForLogin(data.user.token, { persist });
      }
      return data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Login failed');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout').catch(() => { });
    } finally {
      clearSession();
    }
    return { success: true };
  },

  refreshSession: async () => {
    try {
      const response = await api.get('/api/auth/refresh-session');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to refresh session');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch current user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getCurrentUserWithRefresh: async () => {
    try {
      const response = await api.get('/api/auth/me', {
        params: { refresh: true, t: Date.now() } // Add timestamp to prevent caching
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch current user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  // getCurrentUser and update local session.user.role if needed
  getCurrentUserAndSyncSession: async () => {
    try {
      const data = await authApi.getCurrentUser();
      // If data.user is present and session exists, update session.user.role (but do NOT overwrite token)
      const session = readSession();
      if (session && data?.user) {
        session.user = { ...session.user, ...data.user };
        // keep token untouched
        writeSession(session, { persist: !!localStorage.getItem(SESSION_KEY) });
      }
      return data;
    } catch (err) {
      throw err;
    }
  },

  getOrganization: async () => {
    try {
      const response = await api.get('/api/auth/organization');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch organization');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  googleLogin: async (token) => {
    try {
      const response = await api.post('/api/auth/google', { token });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Google login failed');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getSelectedDatabase: async () => {
    try {
      const response = await api.get('/api/auth/selected-database');
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch selected database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  setSelectedDatabase: async (databaseId) => {
    try {
      const response = await api.post('/api/auth/selected-database', { selectedDatabase: databaseId });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to set selected database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  // Expose token helpers for callers that need to explicitly persist tokens
  storeTokenForLogin,
  setTokenSafely,
  clearTokenForCurrentSession,
};

// User API
export const userApi = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/users', { params });
      return {
        users: Array.isArray(response.data?.users)
          ? response.data.users.map(user => ({
            id: user.id || user.uid,
            uid: user.uid,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'Editor',
            status: user.status || 'Inactive',
            twoFA: user.twoFA || false,
            address: user.address || '',
            lastLogin: user.lastLogin || null,
            createdAt: user.created_at || user.createdAt,
            updatedAt: user.updated_at || user.updatedAt,
            is_super_admin: user.is_super_admin || false
          }))
          : [],
        total: response.data?.total || 0,
        availableRoles: Array.isArray(response.data?.availableRoles)
          ? response.data.availableRoles
          : ['Admin', 'Editor', 'Readonly']
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch users');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  create: async (userData) => {
    try {
      const response = await api.post('/api/users', userData);
      const createdUser = response.data?.user || response.data;
      return {
        id: createdUser.id || createdUser.uid,
        uid: createdUser.uid,
        name: createdUser.name || '',
        email: createdUser.email || '',
        phone: createdUser.phone || '',
        role: createdUser.role || 'Editor',
        status: createdUser.status || 'Inactive',
        twoFA: createdUser.twoFA || false,
        address: createdUser.address || '',
        lastLogin: createdUser.lastLogin || null,
        createdAt: createdUser.created_at || createdUser.createdAt,
        updatedAt: createdUser.updated_at || createdUser.updatedAt,
        is_super_admin: createdUser.is_super_admin || false
      };
    } catch (error) {
      console.error('Error creating user:', error);
      const err = new Error(error.response?.data?.message || 'Failed to create user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  update: async (id, userData) => {
    try {
      const response = await api.put(`/api/users/${id}`, userData);
      const updatedUser = response.data?.user || response.data;
      return {
        id: updatedUser.id || updatedUser.uid,
        uid: updatedUser.uid,
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        role: updatedUser.role || 'Editor',
        status: updatedUser.status || 'Inactive',
        twoFA: updatedUser.twoFA || false,
        address: updatedUser.address || '',
        lastLogin: updatedUser.lastLogin || null,
        createdAt: updatedUser.created_at || updatedUser.createdAt,
        updatedAt: updatedUser.updated_at || updatedUser.updatedAt,
        is_super_admin: updatedUser.is_super_admin || false,
        newToken: response.data?.newToken
      };
    } catch (error) {
      console.error('Error updating user:', error);
      const err = new Error(error.response?.data?.message || 'Failed to update user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      const err = new Error(error.response?.data?.message || 'Failed to delete user');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Password Reset API
export const passwordResetApi = {
  sendOTP: async (email) => {
    try {
      const response = await api.post('/api/password-reset/send-otp', { email });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to send OTP');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/api/password-reset/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to verify OTP');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  checkStatus: async (email) => {
    try {
      const response = await api.get('/api/password-reset/check-status', {
        params: { email }
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to check reset status');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  resetPassword: async (email, resetToken, newPassword) => {
    try {
      const response = await api.post('/api/password-reset/reset-password', {
        email,
        resetToken,
        newPassword
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to reset password');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Database API
export const databaseApi = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/databases', { params });
      return {
        databases: Array.isArray(response.data?.databases)
          ? response.data.databases.map(db => ({
            id: db.id,
            name: db.name || '',
            type: db.type || 'PostgreSQL',
            host: db.host || '',
            port: db.port || '',
            password: db.password || '',
            username: db.username || '',
            database: db.database || '',
            status: db.status || 'Disconnected',
            server_type: db.server_type || 'local',
            connection_string: db.connection_string || '',
            createdAt: db.created_at || db.createdAt,
            updatedAt: db.updated_at || db.updatedAt
          }))
          : [],
        total: response.data?.total || 0,
        totalPages: response.data?.totalPages || 1,
        currentPage: response.data?.currentPage || 1
      };
    } catch (error) {
      console.error('Error fetching databases:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch databases');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  create: async (databaseData) => {
    try {
      const payload = {
        name: databaseData.name,
        server_type: databaseData.server_type,
        type: databaseData.type,
        database: databaseData.database,
        ssl: databaseData.ssl || false
      };

      if (databaseData.server_type === 'local') {
        payload.host = databaseData.host;
        payload.port = databaseData.port;
        payload.username = databaseData.username;
        payload.password = databaseData.password;
      } else {
        payload.connection_string = databaseData.connection_string;
      }

      const response = await api.post('/api/databases', payload);
      const createdDb = response.data?.database || response.data;
      return {
        id: createdDb.id,
        name: createdDb.name || '',
        type: createdDb.type || 'PostgreSQL',
        host: createdDb.host || '',
        port: createdDb.port || '',
        username: createdDb.username || '',
        database: createdDb.database || '',
        status: createdDb.status || 'Disconnected',
        server_type: createdDb.server_type || 'local',
        connection_string: createdDb.connection_string || '',
        createdAt: createdDb.created_at || createdDb.createdAt,
        updatedAt: createdDb.updated_at || createdDb.updatedAt
      };
    } catch (error) {
      console.error('Error creating database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to create database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  update: async (id, databaseData) => {
    try {
      const payload = {
        name: databaseData.name,
        server_type: databaseData.server_type,
        type: databaseData.type,
        database: databaseData.database,
        ssl: databaseData.ssl || false
      };

      if (databaseData.server_type === 'local') {
        payload.host = databaseData.host;
        payload.port = databaseData.port;
        payload.username = databaseData.username;
        // Only include password if it was provided
        if (databaseData.password) {
          payload.password = databaseData.password;
        }
      } else {
        payload.connection_string = databaseData.connection_string;
      }

      const response = await api.put(`/api/databases/${id}`, payload);
      const updatedDb = response.data?.database || response.data;
      return {
        id: updatedDb.id,
        name: updatedDb.name || '',
        type: updatedDb.type || 'PostgreSQL',
        host: updatedDb.host || '',
        port: updatedDb.port || '',
        username: updatedDb.username || '',
        database: updatedDb.database || '',
        status: updatedDb.status || 'Disconnected',
        server_type: updatedDb.server_type || 'local',
        connection_string: updatedDb.connection_string || '',
        createdAt: updatedDb.created_at || updatedDb.createdAt,
        updatedAt: updatedDb.updated_at || updatedDb.updatedAt
      };
    } catch (error) {
      console.error('Error updating database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to update database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/api/databases/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to delete database connection');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  test: async (id) => {
    try {
      const response = await api.post(`/api/databases/${id}/test`);
      return {
        success: response.data?.success || false,
        message: response.data?.message || '',
        status: response.data?.status || 'Disconnected'
      };
    } catch (error) {
      console.error('Error testing database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to test database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  connect: async (id) => {
    try {
      const response = await api.post(`/api/databases/${id}/connect`);
      return {
        success: response.data?.success || false,
        message: response.data?.message || '',
        status: response.data?.status || 'Disconnected',
        dbdetails: response.data?.databasedetails || {}
      };
    } catch (error) {
      console.error('Error connecting to database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to connect to database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  disconnect: async (id) => {
    try {
      const response = await api.post(`/api/databases/${id}/disconnect`);
      return {
        success: response.data?.success || false,
        message: response.data?.message || '',
        status: response.data?.status || 'Disconnected'
      };
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      const err = new Error(error.response?.data?.message || 'Failed to disconnect from database');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getDetails: async (id) => {
    try {
      const response = await api.get(`/api/databases/${id}`);
      const dbDetails = response.data?.database || response.data;
      return {
        id: dbDetails.id,
        name: dbDetails.name || '',
        type: dbDetails.type || 'PostgreSQL',
        host: dbDetails.host || '',
        port: dbDetails.port || '',
        username: dbDetails.username || '',
        password: '', // Never return the actual password (for security purposes)
        database: dbDetails.database || '',
        status: dbDetails.status || 'Disconnected',
        server_type: dbDetails.server_type || 'local',
        connection_string: dbDetails.connection_string || '',
        ssl: dbDetails.ssl || false,
        createdAt: dbDetails.created_at || dbDetails.createdAt,
        updatedAt: dbDetails.updated_at || dbDetails.updatedAt
      };
    } catch (error) {
      console.error('Error getting database details:', error);
      const err = new Error(error.response?.data?.message || 'Failed to get database details');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getSchema: async (id) => {
    try {
      const response = await api.get(`/api/databases/${id}/schema`);
      return {
        success: response.data?.success || false,
        tables: response.data?.tables || [],
        collections: response.data?.collections || [],
        databaseType: response.data?.databaseType || '',
        message: response.data?.message || ''
      };
    } catch (error) {
      console.error('Error fetching database schema:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch database schema');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getTableData: async (id, tableName) => {
    try {
      const response = await api.get(`/api/databases/${id}/table-data/${encodeURIComponent(tableName)}`);
      return {
        success: response.data?.success || false,
        data: response.data?.data || [],
        totalRows: response.data?.totalRows || 0,
        message: response.data?.message || ''
      };
    } catch (error) {
      console.error('Error fetching table data:', error);
      const err = new Error(error.response?.data?.message || 'Failed to fetch table data');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Document Management API
export const docApi = {
  // Topic operations
  getAllTopics: async (params = {}) => {
    try {
      const response = await api.get('/api/docs/topics', { params });
      return {
        topics: response.data.topics || [],
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
        currentPage: response.data.currentPage || 1
      };
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch topics');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  createTopic: async (name) => {
    try {
      const response = await api.post('/api/docs/topics', { name });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to create topic');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  updateTopic: async (id, name) => {
    try {
      const response = await api.put(`/api/docs/topics/${id}`, { name });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to update topic');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  deleteTopic: async (id) => {
    try {
      const response = await api.delete(`/api/docs/topics/${id}`);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to delete topic');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  // Document operations
  getTopicDocuments: async (topicId, params = {}) => {
    try {
      const response = await api.get(`/api/docs/topics/${topicId}/documents`, { params });
      return {
        documents: response.data.documents || [],
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
        currentPage: response.data.currentPage || 1,
        topic: response.data.topic
      };
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch documents');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  uploadDocument: async (topicId, file) => {
    try {
      // Convert file to base64 data URL
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const response = await api.post(`/api/docs/topics/${topicId}/documents`, {
        file: {
          name: file.name,
          type: file.type,
          data: dataUrl
        }
      });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to upload document');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  getDocument: async (id) => {
    try {
      const response = await api.get(`/api/docs/documents/${id}`);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to fetch document');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  updateDocument: async (id, updates) => {
    try {
      const response = await api.put(`/api/docs/documents/${id}`, updates);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to update document');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  renameDocument: async (id, name) => {
    try {
      const response = await api.post(`/api/docs/documents/${id}/rename`, { name });
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to rename document');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  deleteDocument: async (id) => {
    try {
      const response = await api.delete(`/api/docs/documents/${id}`);
      return response.data;
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to delete document');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  },

  searchDocuments: async (query, params = {}) => {
    try {
      const response = await api.get('/api/docs/search', {
        params: { q: query, ...params }
      });
      return {
        documents: response.data.documents || [],
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 1,
        currentPage: response.data.currentPage || 1
      };
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Failed to search documents');
      err.status = error.response?.status;
      err.data = error.response?.data;
      throw err;
    }
  }
};

// Utility formatting helper
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
};

/* -------------------------
   External FastAPI (Pinggy)
   -------------------------*/
export const api_AI = axios.create({
  baseURL: 'https://quantrail.a.pinggy.link',
  headers: {
    'Content-Type': 'application/json',
  },
  // },
  // auth: {
  //   username: USERNAME_PINGGY,
  //   password: PASSWORD_PINGGY
  // },
  timeout: 45000
});

api_AI.interceptors.request.use((request) => {
  try { 
    const token = JSON.parse(localStorage.getItem(process.env.REACT_APP_FASTAPITOKEN_KEY)) || JSON.parse(sessionStorage.getItem(process.env.REACT_APP_FASTAPITOKEN_KEY)) || ''
    console.log(JSON.parse(sessionStorage.getItem(process.env.REACT_APP_FASTAPITOKEN_KEY)))
    if (token) {
      request.headers.Authorization = `Bearer ${token}`
    }
    return request
  }
  catch (err) {
    return Promise.reject(err)
  }
})



// connectDBPinggy kept for backwards compatibility
export const connectDBPinggy = async (dbParam) => {
  try {
    let dbcren = null;
    if (dbParam.server_type === 'local') {
      dbcren = {
        connection_type: 'local',
        database_type: (dbParam.type || '').toLowerCase(),
        credentials: {
          host: dbParam.host || '',
          port: dbParam.port || 0,
          username: dbParam.username || '',
          password: dbParam.password || '',
          database: dbParam.database || ''
        },
        connection_string: '',
        session_duration_minutes: 60,
        store_schema: true
      };
    } else {
      const typeLower = (dbParam.type || '').toLowerCase();
      if (typeLower === 'clickhouse') {
        dbcren = {
          connection_type: 'cloud',
          database_type: typeLower,
          connection_string: `clickhouse+${(dbParam.connection_string || '').replace('https', 'http')}?protocol=https`,
          session_duration_minutes: 60,
          store_schema: true
        };
      } else if (typeLower === 'mysql' || typeLower.includes('mysql')) {
        let conn = (dbParam.connection_string || '').trim();
        conn = conn.replace(/^[a-zA-Z0-9+.-]+:\/\//, '');
        conn = `mysql+pymysql://${conn}`;
        dbcren = {
          connection_type: 'cloud',
          database_type: typeLower,
          connection_string: conn,
          session_duration_minutes: 60,
          store_schema: true
        };
      } else {
        dbcren = {
          connection_type: 'cloud',
          database_type: typeLower,
          connection_string: dbParam.connection_string,
          session_duration_minutes: 60,
          store_schema: true
        };
      }
    }

    const response = await api_AI.post('/api/v1/database/connect', { ...dbcren });
    const data = response.data;
    return data.success ? {
      sessionID: data?.session_id,
      expires_at: data?.expires_at,
      dbID: dbParam?.id,
      success: true,
      message: 'Session generated'
    } : { success: false, message: 'Not Connected' };
  } catch (err) {
    console.error('connectDBPinggy error', err);
    return { success: false, message: 'Not Connected' };
  }
};

// Chat/AI wrappers
export const ChatWithSQL_API = async (usermessage, sessionID) => {
  try {
    if (!usermessage || !sessionID) return { success: false, message: 'SNF' };

    const IsMessageLimit = usermessage.toLowerCase().includes('limit');
    const convertmessage = IsMessageLimit ? usermessage : `${usermessage} with limit 10`;

    const response = (await api_AI.post('/api/v1/sql/generate-sql', { session_id: sessionID, query: convertmessage })).data;
    if (!response.success) return { success: false, message: 'We have some problem to connect the fastapi' };

    const sqlQueryEncode = btoa(response.generated_sql || '');

    const sqldataFromQuery = (await api_AI.post('/api/v1/database/execute-sql', { session_id: sessionID, sql_query: sqlQueryEncode })).data;
    if (!sqldataFromQuery.success) return { success: false, message: "we have some problem to get data's" };

    return {
      success: true,
      sql: response.generated_sql,
      data: sqldataFromQuery.data || []
    };
  } catch (err) {
    console.error('ChatWithSQL_API error', err);
    const errorValue = err?.response?.data?.detail;
    if (errorValue === 'Session not found' || errorValue === 'Session expired') return { success: false, message: 'SI' };
    if (errorValue === 'Internal server error') return { success: false, message: 'ISE' };
    return { success: false, message: 'We have some problem to connect the fastapi or Internal Server Error' };
  }
};

export const getSummarizeSQL_API = async (data, sessionID) => {
  try {
    if (!sessionID) return { success: false, message: 'SNF', summary: '' };
    const response = (await api_AI.post('/api/v1/summarize', { session_id: sessionID, data, user_question: 'summarize the above data' })).data;
    if (response.success) return { success: true, summary: response.summary };
    return { success: false, message: 'Something went wrong in getting summarize', summary: '' };
  } catch (err) {
    console.error('getSummarizeSQL_API error', err);
    const errorValue = err?.response?.data?.detail;
    if (errorValue === 'Session not found' || errorValue === 'Session expired') return { success: false, message: 'SI', summary: '' };
    if (errorValue === 'Internal server error') return { success: false, message: 'ISE', summary: '' };
    return { success: false, message: 'Something went wrong in getting summarize or Internal Server Error', summary: '' };
  }
};

export const GetVisualizationSQL_API = async (visualDet) => {
  try {
    if (!visualDet.session_id) return { success: false, message: 'SNF' };
    const response = (await api_AI.post('/api/v1/visualize/visualize', { ...visualDet })).data;
    return response.success ? { success: true, imageURI: response.chart_image_base64 } : { success: false, message: response.message || 'Visualization failed' };
  } catch (err) {
    console.error('GetVisualizationSQL_API error', err);
    const errorValue = err?.response?.data?.detail;
    if (errorValue === 'Session not found' || errorValue === 'Session expired') return { success: false, message: 'SI' };
    if (errorValue === 'Internal server error') return { success: false, message: 'ISE' };
    return { success: false, message: 'Something went wrong in getting visualization or Internal Server Error' };
  }
};



export const GeneralChat_API = async (userQuery) => {

  try {

    const responseBack = await (await api_AI.post('/api/v1/chat', {
      session_id: "string",
      user_question: userQuery,
      token:JSON.parse(localStorage.getItem(process.env.REACT_APP_FASTAPITOKEN_KEY)) || JSON.parse(sessionStorage.getItem(process.env.REACT_APP_FASTAPITOKEN_KEY)) || ''
    })).data;



    if (responseBack.success) {
      return { ...responseBack }
    }

  }
  catch (err) {

    const serverError = err?.response?.data?.detail || 'ISE'
    console.log(serverError)
    return { success: false, message: serverError }
  }
}


export const WebSearchAPI = async (webQuery) => {
  try {
    const responseBack = await (await api_AI.post('/api/v1/websearch', {
      user_question: webQuery
    })).data;

    if (responseBack.success) {
      return { ...responseBack }
    }
  }
  catch (err) {
    return { success: false, message: "ISE" };
  }
}

// Export token helpers
export const tokenHelpers = {
  readSession,
  writeSession,
  clearSession,
  getTokenFromSession,
  decodeToken,
  storeTokenForLogin,
  setTokenSafely,
  clearTokenForCurrentSession
};

export default {
  api,
  api_AI,
  authApi,
  userApi,
  databaseApi,
  passwordResetApi,
  connectDBPinggy,
  ChatWithSQL_API,
  getSummarizeSQL_API,
  GetVisualizationSQL_API,
  tokenHelpers,
  formatDateTime
};