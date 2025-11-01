import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VaultPage from './pages/VaultPage';
import InheritancePage from './pages/InheritancePage';
import SearchPage from './pages/SearchPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import CryptoDemo from './components/CryptoDemo';
import PackagesPage from './pages/PackagesPage';
import ContractsPage from './pages/ContractsPage';
import ESignaturePage from './pages/ESignaturePage';
import CorporatePage from './pages/CorporatePage';
import PricingPage from './pages/PricingPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/pricing" 
            element={<PricingPage />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<DashboardPage />} />
            <Route path="vault" element={<VaultPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="inheritance" element={<InheritancePage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="esignature" element={<ESignaturePage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="corporate" element={<CorporatePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="crypto-demo" element={<CryptoDemo />} />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
