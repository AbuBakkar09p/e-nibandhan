import React from 'react';
import { Navbar } from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!isAuthPage && <Navbar />}
      <div className="flex flex-1">
        {user && !isAuthPage && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
