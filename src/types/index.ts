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
// User Management Types (based on UIDAM User Management APIs)
export interface User {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  isExternalUser: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  accounts?: UserAccount[];
  roles?: Role[];
  metadata?: Record<string, any>;
}

export interface UserV2 extends User {
  accountRoleMappings: AccountRoleMapping[];
}

export interface UserAccount {
  id: string;
  name: string;
  description?: string;
  status: AccountStatus;
}

export interface AccountRoleMapping {
  accountId: string;
  accountName: string;
  roleIds: string[];
  roleNames: string[];
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  isExternalUser?: boolean;
  metadata?: Record<string, any>;
  accountRoleMappings?: AccountRoleMapping[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
  metadata?: Record<string, any>;
  accountRoleMappings?: AccountRoleMapping[];
}

export interface UserFilterRequest {
  userName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus[];
  isExternalUser?: boolean;
  isEmailVerified?: boolean;
  accountIds?: string[];
  roleIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export enum UserStatus {
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

// Role Management Types
export interface Role {
  id: number;  // API returns integer ID
  name: string;
  description: string;
  scopes: Scope[]; // Array of scope objects
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  scopeNames: string[];
}

export interface UpdateRoleRequest {
  description?: string;
  scopeNames?: string[];
}

export interface RoleFilterRequest {
  name?: string;
  description?: string;
  scopeNames?: string[];
}

// Scope Management Types
export interface Scope {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isSystemScope: boolean;
  administrative: boolean; // Actual administrative field from API
  predefined: boolean; // Predefined scopes cannot be modified or deleted
}

export interface CreateScopeRequest {
  name: string;
  description: string;
  administrative: boolean | string; // API expects string "false"/"true" or boolean
}

export interface UpdateScopeRequest {
  description?: string;
  administrative?: boolean | string; // Allow updating administrative field
}

export interface ScopeFilterRequest {
  name?: string;
  description?: string;
  isSystemScope?: boolean;
}

// Account Management Types (based on UIDAM API specification)
export interface Account {
  id: string;
  accountName: string;
  parentId?: string;
  roles: string[];
  status: AccountStatus;
  createdBy: string;
  createDate: string;
  updatedBy?: string;
  updateDate?: string;
  description?: string;
  type?: 'ROOT' | 'ORGANIZATION' | 'DEPARTMENT' | 'TEAM';
  children?: Account[];
}

export interface CreateAccountRequest {
  accountName: string;
  parentId?: string;
  roles: string[];
}

export interface UpdateAccountRequest {
  parentId?: string;
  roles: string[];
  status: AccountStatus; // Use enum instead of string
}

export interface AccountFilterRequest {
  ids?: number[];
  accountNames?: string[];
  parentIds?: number[];
  roles?: string[];
  status?: string[];
}

export interface AccountRole {
  id: string;
  name: string;
  description?: string;
  accountId: string;
}

export interface CreateAccountRoleRequest {
  name: string;
  description?: string;
  accountId: string;
}

export interface UpdateAccountRoleRequest {
  name?: string;
  description?: string;
}

// Client Management Types
export interface OAuthClient {
  clientId: string;
  clientName: string;
  clientSecret?: string;
  grantTypes: string[];
  scopes: string[];
  redirectUris: string[];
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  clientId: string;
  clientName: string;
  clientSecret?: string;
  grantTypes: string[];
  scopes: string[];
  redirectUris: string[];
}

export interface UpdateClientRequest {
  clientName?: string;
  clientSecret?: string;
  grantTypes?: string[];
  scopes?: string[];
  redirectUris?: string[];
  status?: ClientStatus;
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// Approval Workflow Types
export interface PendingApproval {
  id: string;
  type: ApprovalType;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  data: any;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export enum ApprovalType {
  USER_REGISTRATION = 'USER_REGISTRATION',
  ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
  SCOPE_ASSIGNMENT = 'SCOPE_ASSIGNMENT',
  ACCOUNT_ACCESS = 'ACCOUNT_ACCESS',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Common Types
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterParams {
  page: number;
  size: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchType?: 'CONTAINS' | 'PREFIX' | 'SUFFIX';
  ignoreCase?: boolean;
}

export interface BulkAction {
  action: string;
  selectedIds: string[];
  payload?: any;
}

// Authentication Types
export interface AuthUser {
  id: string;
  userName: string;
  email?: string;
  firstName: string;
  lastName: string;
  roles?: string[];
  scopes?: string[];
  accounts?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  details?: any;
  timestamp: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface TableState<T> {
  data: T[];
  loading: boolean;
  error?: string;
  totalCount: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: Record<string, any>;
  selectedRows: string[];
}

export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data?: any;
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  blockedUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  pendingAccounts: number;
  totalRoles: number;
  totalScopes: number;
  externalUsers: number;
  federatedUsers: number;
  userAccountMappings: number;
  recentActivity: ActivityItem[];
}

export interface UserStatusDistribution {
  activePercentage: number;
  pendingPercentage: number;
  blockedPercentage: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user: string;
  timestamp: string;
}

// Active Sessions Types
export interface ActiveSession {
  sessionId: string;
  deviceInfo: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  loginTime: string;
  lastActivity: string;
  isCurrent: boolean;
  userAgent?: string;
}

export interface SessionsResponse {
  sessions: ActiveSession[];
  totalCount: number;
}

export interface TerminateSessionRequest {
  sessionId: string;
  reason?: string;
}
