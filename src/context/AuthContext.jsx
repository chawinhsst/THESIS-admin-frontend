import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  // We check localStorage for a saved token to see if the user was already logged in.
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken"));

  const login = async (username, password) => {
    try {
      // We no longer need the CSRF handshake. We just send the username and password to the new login view.
      const response = await fetch(`${API_BASE_URL}/api-auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("authToken", data.token); // Save the token from the backend
        setAuthToken(data.token);
        navigate('/dashboard');
        return null;
      } else {
        return "Invalid username or password.";
      }
    } catch (err) {
      return "Could not connect to the server.";
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setAuthToken(null);
    navigate('/login', { replace: true });
  };

  // The 'isAuthenticated' value is now based on whether the authToken exists.
  const value = { isAuthenticated: !!authToken, authToken, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Helper hook to easily use the context in other components
export function useAuth() {
  return useContext(AuthContext);
}