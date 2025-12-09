import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Common/Navbar';
import Login from './components/Login/Login';
import ForgotPassword from './components/Login/ForgotPassword';
import Chat from './components/Home/Chat';
import UserManagement from './components/UserManagement/UserManagement';
import DatabaseManagement from './components/DatabaseManagement/DatabaseManagement';
import DocChat from './components/DocChat/DocChat';
import DocManagement from './components/DocManagement/DocManagement';
import ProtectedRoute from './components/Common/ProtectedRoute';
import AuthRoute from './components/Common/AuthRoute';
import SessionIDProvider from './context/SessionIDContext';
import WebChatComponent from "./components/WebChat/WebChatComponent"
import ScrollVisableProvider, { ScrollVisableContext } from './context/ScrollVisableProvider';

function AppRoutes() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    !!localStorage.getItem('session') || !!sessionStorage.getItem('session')
  );

  const {scrollStyle} = useContext(ScrollVisableContext)


  useEffect(() => {
    function initmethod() {
      try {
        const SESSIONKEY = process.env.REACT_APP_SESSIONID_KEY;
        const isThere = localStorage.getItem(SESSIONKEY);

        const VOICEKEY = process.env.REACT_APP_VOICECONTROLVALUE;
        const isThereVoice = localStorage.getItem(VOICEKEY);

        

        if (!isThere) localStorage.setItem(SESSIONKEY, JSON.stringify([]));
        if (!isThereVoice) localStorage.setItem(VOICEKEY, JSON.stringify({ lang_accent: "en-IN", gender: "female", speed: 1 }));
      } catch (err) {
        throw err;
      }
    }
    initmethod();
  }, []);

  return (
    <>
      <style>
        {scrollStyle}
      </style>
      <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Routes for authenticated users */}
          <Route element={<ProtectedRoute isAllowed={isAuthenticated} />}>
            <Route path="/chat" element={<Chat />} />
            <Route path="/qchat" element={<WebChatComponent />} />
            <Route path="/doc-chat" element={<DocChat />} />
            <Route path="/doc-management" element={<DocManagement />} />
            {/* Database management: only Super Admin, Admin and Editor */}
            <Route element={<ProtectedRoute isAllowed={isAuthenticated} allowedRoles={['Super Admin', 'Admin', 'Editor']} />}>
              <Route path="/database-management" element={<DatabaseManagement />} />
            </Route>

            {/* User management: only Admin and Super Admin allowed */}
            <Route element={<ProtectedRoute isAllowed={isAuthenticated} allowedRoles={['Admin', 'Super Admin']} />}>
              <Route
                path="/user-management"
                element={<UserManagement setIsAuthenticated={setIsAuthenticated} />}
              />
            </Route>
          </Route>

          {/* Routes for non-authenticated users */}
          <Route element={<AuthRoute isAllowed={isAuthenticated} />}>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/chat" replace />
                ) : (
                  <Login setIsAuthenticated={setIsAuthenticated} />
                )
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Catch-all route */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to="/chat" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <ScrollVisableProvider>
      <SessionIDProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SessionIDProvider>
    </ScrollVisableProvider>
    
  );
}