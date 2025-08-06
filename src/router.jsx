import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VolunteerListPage from './pages/VolunteerListPage';
import VolunteerDetailPage from './pages/VolunteerDetailPage';
import SessionDetailPage, { loader as sessionDetailLoader } from './pages/SessionDetailPage';
// --- Add import for the new chart page ---
import SessionChartPage, { loader as sessionChartLoader } from './pages/SessionChartPage'; 
import SessionNotFound from './components/SessionNotFound';


const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
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
          {
            path: 'volunteers/:volunteerId',
            element: <VolunteerDetailPage />,
          },
          {
            path: 'sessions/:sessionId',
            element: <SessionDetailPage />,
            loader: sessionDetailLoader,
            errorElement: <SessionNotFound />,
          },
          // --- This is the new route for the isolated chart page ---
          {
            path: 'sessions/:sessionId/chart',
            element: <SessionChartPage />,
            loader: sessionChartLoader,
            errorElement: <SessionNotFound />,
          },
        ],
      },
      {
        index: true,
        element: <Navigate to="/dashboard" replace />, // Changed to redirect to dashboard after login
      },
    ],
  },
]);

export default router;