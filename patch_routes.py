import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

protected_route_code = """
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { employee } = useAuth();
  const role = employee?.employee_type || '';
  
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {"""

content = content.replace("export default function App() {", protected_route_code)

bad_routes = """        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="reports/entry" element={<DataEntryList />} />
          <Route path="reports/my" element={<MyReports />} />
          <Route path="reports/pending" element={<PendingReports />} />
          <Route path="forms/builder" element={<FormBuilder />} />
          <Route path="reports/submit/:formId/:submissionId?" element={<ReportSubmission />} />
          <Route path="employees" element={<EmployeeManager />} />
          <Route path="hierarchy" element={<HierarchyManager />} />
          {/* Add other routes here */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>"""

good_routes = """        <Route path="/" element={<MainLayout />}>
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
        </Route>"""

content = content.replace(bad_routes, good_routes)

with open('src/App.tsx', 'w') as f:
    f.write(content)

