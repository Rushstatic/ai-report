/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import SetupInstructions from './components/SetupInstructions';
import MainLayout from './layouts/MainLayout';
import Dashboard from './features/dashboard/Dashboard';
import FormBuilder from './features/forms/FormBuilder';
import ReportSubmission from './features/reports/ReportSubmission';
import MyReports from './features/reports/MyReports';

export default function App() {
  if (!isSupabaseConfigured()) {
    return <SetupInstructions />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="reports/my" element={<MyReports />} />
          <Route path="forms/builder" element={<FormBuilder />} />
          <Route path="reports/submit/:formId" element={<ReportSubmission />} />
          {/* Add other routes here */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
