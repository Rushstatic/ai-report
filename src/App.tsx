/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import SetupInstructions from './components/SetupInstructions';
import MainLayout from './layouts/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import FormBuilder from './features/forms/FormBuilder';
import ReportSubmission from './features/reports/ReportSubmission';
import MyReports from './features/reports/MyReports';
import DataEntryList from './features/reports/DataEntryList';
import PendingReports from './features/reports/PendingReports';
import EmployeeManager from './features/employees/EmployeeManager';
import HierarchyManager from './features/hierarchy/HierarchyManager';
import Login from './features/auth/Login';
import ChangePassword from './features/auth/ChangePassword';
import { Loader2 } from 'lucide-react';


function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { employee } = useAuth();
  const role = employee?.employee_type || '';
  
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { session, initialized, needsPasswordChange } = useAuth();

  if (!isSupabaseConfigured()) {
    return <SetupInstructions />;
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }
  
  if (needsPasswordChange) {
    return <ChangePassword />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="reports/entry" element={<DataEntryList />} />
          <Route path="reports/my" element={<MyReports />} />
          <Route path="reports/submit/:formId/:submissionId?" element={<ReportSubmission />} />
          
          <Route path="reports/pending" element={
            <ProtectedRoute allowedRoles={['DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER']}>
              <PendingReports />
            </ProtectedRoute>
          } />
          
          <Route path="forms/builder" element={
            <ProtectedRoute allowedRoles={['DISTRICT_CONTROLLER']}>
              <FormBuilder />
            </ProtectedRoute>
          } />
          
          <Route path="employees" element={
            <ProtectedRoute allowedRoles={['DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER']}>
              <EmployeeManager />
            </ProtectedRoute>
          } />
          
          <Route path="hierarchy" element={
            <ProtectedRoute allowedRoles={['DISTRICT_CONTROLLER', 'TALUKA_CONTROLLER', 'PHC_CONTROLLER']}>
              <HierarchyManager />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
