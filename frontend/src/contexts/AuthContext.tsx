import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService, { LoginRequest, RegisterRequest, LoginResponse, RegisterResponse } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ success: boolean; message: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user && apiService.isAuthenticated();

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          // Try to refresh token if needed
          const isValid = await apiService.ensureValidToken();
          if (isValid) {
            // In a real app, you might want to fetch user details from the backend
            // For now, we'll just set a basic user object
            const token = apiService.getAccessToken();
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({
                  id: payload.userId,
                  email: payload.email,
                  firstName: 'User', // You'd fetch this from the backend
                  lastName: 'Name'
                });
              } catch (error) {
                console.error('Error parsing token:', error);
                apiService.clearTokens();
              }
            }
          } else {
            apiService.clearTokens();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        apiService.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      const response: LoginResponse = await apiService.login(credentials);
      
      if (response.success && response.user && response.tokens) {
        // Store tokens
        apiService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        
        // Set user state
        setUser(response.user);
        
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      const response: RegisterResponse = await apiService.register(userData);
      
      if (response.success) {
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Registration failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = apiService.getRefreshToken();
      if (refreshToken) {
        await apiService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state regardless of API call success
      apiService.clearTokens();
      setUser(null);
      navigate('/login');
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      const isValid = await apiService.ensureValidToken();
      if (!isValid) {
        await logout();
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
