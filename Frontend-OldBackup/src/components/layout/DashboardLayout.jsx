import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-dark-bg transition-colors duration-200">
      {/* Full-height sidebar */}
      <Sidebar />
      
      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">
        {/* Minimal inline Top bar */}
        <Navbar />
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
