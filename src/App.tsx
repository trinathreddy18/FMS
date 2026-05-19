import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { FMSManager } from './pages/FMSManager';
import { FlowDesigner } from './pages/FlowDesigner';
import { IMSManager } from './pages/IMSManager';
import { TaskManager } from './pages/TaskManager';
import { EmployeeManager } from './pages/EmployeeManager';
import { Settings } from './pages/Settings';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="fms" element={<FMSManager />} />
            <Route path="fms/design" element={<FlowDesigner />} />
            <Route path="ims" element={<IMSManager />} />
            <Route path="tasks" element={<TaskManager />} />
            <Route path="employees" element={<EmployeeManager />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
