/********************************************************************************
* Copyright (c) 2025 Harman International
*
* <p>Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* <p>http://www.apache.org/licenses/LICENSE-2.0  
*
* <p> Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* <p>SPDX-License-Identifier: Apache-2.0
********************************************************************************/
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// ReactQueryDevtools removed - no floating debug icon needed
import { Provider } from 'react-redux';

import { store } from '@store/index';
import { useTheme } from '@hooks/useTheme';
import { getTheme } from '@/theme';
import Layout from '@components/Layout';
import ProtectedRoute from '@components/ProtectedRoute';
import { FEATURE_FLAGS } from '@config/app.config';
import { useScopes } from '@hooks/useScopes';

// All nav items with their feature flag and required scopes (mirrors Layout.tsx).
// This is the single source of truth for which page to land on after login.
const TENANT_ID_STORAGE_KEY = 'uidam_tenant_id';

const getNavItems = (tenantId: string) => [
  { path: `/uidam/${tenantId}/dashboard`, feature: FEATURE_FLAGS.DASHBOARD, requiredScopes: ['ManageAccounts', 'TenantAdmin'] },
  { path: `/uidam/${tenantId}/users`,     feature: FEATURE_FLAGS.USER_MANAGEMENT,    requiredScopes: ['ViewUsers', 'ManageUsers'] },
  { path: `/uidam/${tenantId}/accounts`,  feature: FEATURE_FLAGS.ACCOUNT_MANAGEMENT, requiredScopes: ['ViewAccounts', 'ManageAccounts'] },
  { path: `/uidam/${tenantId}/roles`,     feature: FEATURE_FLAGS.ROLE_MANAGEMENT,    requiredScopes: ['ManageUserRolesAndPermissions'] },
  { path: `/uidam/${tenantId}/scopes`,    feature: FEATURE_FLAGS.SCOPE_MANAGEMENT,   requiredScopes: ['ManageScopes'] },
  { path: `/uidam/${tenantId}/approvals`, feature: FEATURE_FLAGS.APPROVAL_WORKFLOW,  requiredScopes: ['ManageApprovals'] },
  { path: `/uidam/${tenantId}/clients`,   feature: FEATURE_FLAGS.CLIENT_MANAGEMENT,  requiredScopes: ['ManageClients', 'OAuth2ClientMgmt'] },
];

// Feature components (lazy loaded)
const Dashboard = React.lazy(() => import('@features/dashboard/Dashboard'));
const UserManagement = React.lazy(() => import('@features/user-management/UserManagement'));
const Profile = React.lazy(() => import('@features/user-management/Profile'));
const AccountManagement = React.lazy(() => import('@features/account-management/AccountManagement'));
const RoleManagement = React.lazy(() => import('@features/role-management/RoleManagement'));
const ScopeManagement = React.lazy(() => import('@features/scope-management/ScopeManagement'));
const ApprovalWorkflow = React.lazy(() => import('@features/approval-workflow/ApprovalWorkflow'));
const ClientManagement = React.lazy(() => import('@features/client-management/ClientManagement'));
const Assistant = React.lazy(() => import('@features/assistant/Assistant'));
const ActiveSessionsManagement = React.lazy(() => import('@features/session-management/ActiveSessionsManagement'));
const Login = React.lazy(() => import('@features/auth/Login'));
const AuthCallback = React.lazy(() => import('@features/auth/AuthCallback'));
const ChangePassword = React.lazy(() => import('@features/auth/ChangePassword'));

// Redirects to the first nav item the user has access to.
// Falls back to /login if no tenant is stored or the user has no matching scopes.
const DefaultRedirect: React.FC = () => {
  const { hasAnyScope } = useScopes();
  const tenantId = localStorage.getItem(TENANT_ID_STORAGE_KEY) ?? '';
  if (!tenantId) return <Navigate to="/login" replace />;
  const first = getNavItems(tenantId).find(
    item => item.feature && (item.requiredScopes.length === 0 || hasAnyScope(...item.requiredScopes))
  );
  return <Navigate to={first ? first.path : '/login'} replace />;
};

// Guard: renders Dashboard only when the feature is enabled AND the user has ManageAccounts or TenantAdmin scope.
// Redirects to the first accessible page otherwise.
const DashboardGuard: React.FC = () => {
  const { hasAnyScope } = useScopes();
  if (!FEATURE_FLAGS.DASHBOARD || !hasAnyScope('ManageAccounts', 'TenantAdmin')) {
    return <DefaultRedirect />;
  }
  return <Dashboard />;
};

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { themeMode } = useTheme();
  const theme = getTheme(themeMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/:tenantId/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* Legacy redirect: bare /dashboard → first accessible page */}
            <Route path="/dashboard" element={<DefaultRedirect />} />
            <Route
              path="/uidam/:tenantId/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* /uidam (index) → first page the user has access to */}
                      <Route index element={<DefaultRedirect />} />
                      <Route path="dashboard" element={<DashboardGuard />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="change-password" element={<ChangePassword />} />
                      <Route path="users/*" element={<UserManagement />} />
                      <Route path="accounts/*" element={<AccountManagement />} />
                      <Route path="roles/*" element={<RoleManagement />} />
                      <Route path="scopes/*" element={<ScopeManagement />} />
                      <Route path="approvals/*" element={<ApprovalWorkflow />} />
                      <Route path="clients/*" element={<ClientManagement />} />
                      <Route path="assistant" element={<Assistant />} />
                      <Route path="sessions" element={<ActiveSessionsManagement />} />
                      <Route path="*" element={<DefaultRedirect />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Catch-all: redirect to first accessible page */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </React.Suspense>
      </Router>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
        {/* ReactQueryDevtools removed - no floating debug icon */}
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
