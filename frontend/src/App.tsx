import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/Layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VaultPage from './pages/VaultPage';
import InheritancePage from './pages/InheritancePage';
import SearchPage from './pages/SearchPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  // TODO: Implement authentication state management
  const isAuthenticated = false; // This will be replaced with actual auth state

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />} 
        >
          <Route index element={<DashboardPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="inheritance" element={<InheritancePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* Legacy routes for direct access */}
        <Route path="/vault" element={isAuthenticated ? <DashboardLayout><VaultPage /></DashboardLayout> : <Navigate to="/login" replace />} />
        <Route path="/inheritance" element={isAuthenticated ? <DashboardLayout><InheritancePage /></DashboardLayout> : <Navigate to="/login" replace />} />
        <Route path="/search" element={isAuthenticated ? <DashboardLayout><SearchPage /></DashboardLayout> : <Navigate to="/login" replace />} />
        <Route path="/audit" element={isAuthenticated ? <DashboardLayout><AuditPage /></DashboardLayout> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={isAuthenticated ? <DashboardLayout><SettingsPage /></DashboardLayout> : <Navigate to="/login" replace />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
