import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

const Navbar = ({ isAuthenticated, setIsAuthenticated }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to read current role from session/local storage or token payload
  const readRoleFromSession = useCallback(() => {
    try {
      const session = sessionStorage.getItem('session') || localStorage.getItem('session');
      if (session) {
        const sessionData = JSON.parse(session);
        // Prefer explicitly stored session.user.role if present (explicit authoritative field)
        if (sessionData.user?.role) {
          setRole(sessionData.user.role);
          return;
        }
        // Otherwise try to decode token payload
        let token = sessionData?.token;
        if (!token && sessionData.user?.token) token = sessionData.user.token;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload?.role) {
              setRole(payload.role);
              return;
            }
          } catch (err) {
            console.error('Error parsing token in Navbar:', err);
          }
        }
      }
      setRole(null);
    } catch (err) {
      console.error('Error reading session in Navbar:', err);
      setRole(null);
    }
  }, []);

  useEffect(() => {
    // Read role when authentication status changes
    readRoleFromSession();
  }, [isAuthenticated, readRoleFromSession]);

  // Also listen for storage changes and custom sessionUpdated events so Navbar updates immediately.
  useEffect(() => {
    const onStorage = (e) => {
      // If session changed in another tab or via code, re-read
      if (!e || e.key === 'session' || e.key === null) {
        readRoleFromSession();
      }
    };
    const onSessionUpdated = () => {
      readRoleFromSession();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('sessionUpdated', onSessionUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('sessionUpdated', onSessionUpdated);
    };
  }, [readRoleFromSession]);

  const handleLogout = () => {
    const key = ['session',process.env.REACT_APP_FASTAPITOKEN_KEY]
    key.forEach((k) => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
    setIsAuthenticated(false);
    setRole(null);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Close menu when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.mobile-menu-panel')) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  // User Management: only Admin and Super Admin
  const canAccessUserManagement = role === 'Admin' || role === 'Super Admin';

  // Database Management: Super Admin / Admin / Editor
  const canAccessDatabaseManagement = role === 'Super Admin' || role === 'Admin' || role === 'Editor';

  return (
    <nav className="sticky top-0 z-50 bg-[#5D3FD3] shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Left aligned */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="QuantaChat Logo"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-white">QuantaChat</span>
            </Link>
          </div>

          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              {/* Desktop Navigation - Right aligned */}
              <div className="hidden md:flex items-center space-x-1 ml-auto">
                <Link 
                  to="/chat" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center
                    ${isActive('/chat') ? 'text-white bg-[#7B61FF] shadow-md' : 'text-white hover:bg-[#6d4df7]'}`}
                >
                  <span className="relative">
                    Home
                    {isActive('/chat') && (
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white rounded-full"></span>
                    )}
                  </span>
                </Link>
                
                {/* QChat */}
                <Link 
                  to="/qchat" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center
                    ${isActive('/qchat') ? 'text-white bg-[#7B61FF] shadow-md' : 'text-white hover:bg-[#6d4df7]'}`}
                >
                  <span className="relative">
                    QChat
                    {isActive('/qchat') && (
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white rounded-full"></span>
                    )}
                  </span>
                </Link>
                
                {/* User Management - Only for Admin and Super Admin */}
                {canAccessUserManagement && (
                  <Link 
                    to="/user-management" 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive('/user-management') ? 'text-white bg-[#7B61FF] shadow-md' : 'text-white hover:bg-[#6d4df7]'}`}
                  >
                    <span className="relative">
                      User Management
                      {isActive('/user-management') && (
                        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white rounded-full"></span>
                      )}
                    </span>
                  </Link>
                )}
                
                {/* Database Management - For Super Admin, Admin, and Editor */}
                {canAccessDatabaseManagement && (
                  <Link 
                    to="/database-management" 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive('/database-management') ? 'text-white bg-[#7B61FF] shadow-md' : 'text-white hover:bg-[#6d4df7]'}`}
                  >
                    <span className="relative">
                      Database Management
                      {isActive('/database-management') && (
                        <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white rounded-full"></span>
                      )}
                    </span>
                  </Link>
                )}
                
                {/* Logout button - desktop */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-white text-[#5D3FD3] hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md ml-2"
                >
                  <span>Logout</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-white hover:text-gray-200 focus:outline-none p-2 rounded-lg hover:bg-[#6d4df7] transition-all duration-200"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {isAuthenticated && (
          <div className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
            {/* Overlay */}
            <div 
              className={`absolute inset-0 bg-black/50 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu panel */}
            <div className={`mobile-menu-panel absolute right-0 top-0 h-full w-64 bg-[#5D3FD3] shadow-xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-[#7B61FF]">
                  <div className="flex items-center space-x-2">
                    <img
                      src="/logo.png"
                      alt="QuantaChat Logo"
                      className="h-8 w-auto"
                    />
                    <span className="text-lg font-bold text-white">Menu</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white hover:text-gray-200 p-1 rounded-full hover:bg-[#7B61FF]"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-4 px-2">
                  <Link 
                    to="/chat" 
                    className={`flex items-center px-4 py-3 rounded-lg mx-2 text-sm font-medium transition-all duration-200 mb-1
                      ${isActive('/chat') ? 'text-white bg-[#7B61FF] font-semibold shadow-inner' : 'text-white hover:bg-[#7B61FF]'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                    {isActive('/chat') && (
                      <span className="ml-auto h-full w-1 bg-white rounded-full"></span>
                    )}
                  </Link>
                  
                  {/* QChat */}
                  <Link 
                    to="/qchat" 
                    className={`flex items-center px-4 py-3 rounded-lg mx-2 text-sm font-medium transition-all duration-200 mb-1
                      ${isActive('/qchat') ? 'text-white bg-[#7B61FF] font-semibold shadow-inner' : 'text-white hover:bg-[#7B61FF]'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    QChat
                    {isActive('/qchat') && (
                      <span className="ml-auto h-full w-1 bg-white rounded-full"></span>
                    )}
                  </Link>
                  
                  {/* User Management - Only for Admin and Super Admin */}
                  {canAccessUserManagement && (
                    <Link 
                      to="/user-management" 
                      className={`flex items-center px-4 py-3 rounded-lg mx-2 text-sm font-medium transition-all duration-200 mb-1
                        ${isActive('/user-management') ? 'text-white bg-[#7B61FF] font-semibold shadow-inner' : 'text-white hover:bg-[#7B61FF]'}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      User Management
                      {isActive('/user-management') && (
                        <span className="ml-auto h-full w-1 bg-white rounded-full"></span>
                      )}
                    </Link>
                  )}
                  
                  {/* Database Management - For Super Admin, Admin, and Editor */}
                  {canAccessDatabaseManagement && (
                    <Link 
                      to="/database-management" 
                      className={`flex items-center px-4 py-3 rounded-lg mx-2 text-sm font-medium transition-all duration-200 mb-1
                        ${isActive('/database-management') ? 'text-white bg-[#7B61FF] font-semibold shadow-inner' : 'text-white hover:bg-[#7B61FF]'}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      Database Management
                      {isActive('/database-management') && (
                        <span className="ml-auto h-full w-1 bg-white rounded-full"></span>
                      )}
                    </Link>
                  )}
                </div>
                
                <div className="p-4 border-t border-[#7B61FF]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium bg-white text-[#5D3FD3] hover:bg-gray-100 transition-all duration-200 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;