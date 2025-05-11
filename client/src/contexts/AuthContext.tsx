import React, { createContext, useContext } from "react";
import { useAuth as useReplitAuth } from "../hooks/useAuth";

// Adjusted User interface to match Replit Auth's user structure
interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useReplitAuth();

  // Replit Auth login handler - redirects to Replit's login page
  const login = () => {
    window.location.href = "/api/login";
  };

  // Replit Auth logout handler - redirects to the logout endpoint
  const logout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
