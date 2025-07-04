import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from './AdminLayout';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AdminLayout />;
}