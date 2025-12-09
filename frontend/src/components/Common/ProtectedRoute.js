import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';

const ProtectedRoute = ({ redirectPath = '/', isAllowed, allowedRoles }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!isAllowed) {
        setAllowed(false);
        setChecking(false);
        return;
      }
      try {
        const response = await api.get('/api/auth/me');
        const user = response.data?.user;
        // If allowedRoles not provided, allow any authenticated user
        let roleAllowed = true;
        if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
          roleAllowed = allowedRoles.includes(user.role);
        }
        if (roleAllowed) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch (err) {
        // Not allowed / unauthorized
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [isAllowed, allowedRoles]);

  if (checking) return null;

  if (!allowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;