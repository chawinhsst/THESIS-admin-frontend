import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VolunteerListPage from './pages/VolunteerListPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // App is the main wrapper providing the context
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        // All routes nested inside here are protected by the "security guard"
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'volunteers',
            element: <VolunteerListPage />,
          },
        ]
      },
      {
        // If a user visits the root path, redirect them to the login page
        index: true,
        element: <Navigate to="/login" replace />,
      }
    ]
  }
]);

export default router;