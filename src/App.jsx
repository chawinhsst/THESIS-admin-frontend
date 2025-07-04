import { Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    // This makes the login status and functions available to all child routes
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}