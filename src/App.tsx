import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ApplicationForm from './pages/ApplicationForm';
import Reports from './pages/Reports';
import VillageManagement from './pages/VillageManagement';
import { motion, AnimatePresence } from 'motion/react';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-700"></div>
  </div>;
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

import AppLayout from './components/layout/AppLayout';

function AppRoutes() {
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/apply/:type" element={
            <PrivateRoute>
              <ApplicationForm />
            </PrivateRoute>
          } />
          <Route path="/reports/:type" element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          } />
          <Route path="/admin/villages" element={
            <PrivateRoute>
              <VillageManagement />
            </PrivateRoute>
          } />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
