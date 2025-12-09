import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial auth status
    const session = localStorage.getItem('session') || sessionStorage.getItem('session');
    setIsLoggedIn(!!session);
  }, []);

  const login = () => {
    setIsLoggedIn(true);
  };

  const logout = () => {
    const key = ['session',process.env.REACT_APP_FASTAPITOKEN_KEY]
    key.forEach((k) => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })

    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);