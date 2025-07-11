import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VolunteerListPage from './pages/VolunteerListPage';
import VolunteerDetailPage from './pages/VolunteerDetailPage'; // 1. Import the detail page

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
        // All routes nested inside here are protected
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
          // 2. ADD THIS NEW ROUTE for individual volunteers
          {
            path: 'volunteers/:volunteerId',
            element: <VolunteerDetailPage />,
          },
        ],
      },
      {
        // If a user visits the root path, redirect them
        index: true,
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);

export default router;