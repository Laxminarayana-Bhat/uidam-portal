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
// OAuth2 Client Registration Types

export interface RegisteredClientDetails {
  clientId: string;
  clientSecret?: string;
  clientName: string;
  clientAuthenticationMethods: string[];
  authorizationGrantTypes: string[];
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  scopes: Set<string> | string[]; // Backend converts to Set
  accessTokenValidity?: number;
  refreshTokenValidity?: number;
  authorizationCodeValidity?: number;
  additionalInformation?: string;
  requireAuthorizationConsent?: boolean;
  status?: string;
  requestedBy?: string;
  createdBy?: string; // Backend uses createdBy
  updatedBy?: string;
}

export interface BaseResponse {
  code: string;
  message: string;
  data?: any;
  httpStatus: string;
}

export interface ClientFormData {
  clientId: string;
  clientName: string;
  clientSecret?: string;
  authorizationGrantTypes: string[];
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  scopes: string[];
  clientAuthenticationMethods: string[];
  accessTokenValidity: number;
  refreshTokenValidity: number;
  authorizationCodeValidity: number;
  requireAuthorizationConsent: boolean;
  additionalInformation?: string;
  status: string;
  createdBy?: string;
}

export interface ClientListItem {
  clientId: string;
  clientName: string;
  status: string;
  authorizationGrantTypes: string[];
  scopes: string[];
  requestedBy?: string;
  createdAt?: string;
  // The filter endpoint's response already includes these details, so the View dialog
  // can render directly from a list item instead of making a separate getClient() call.
  clientAuthenticationMethods?: string[];
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  accessTokenValidity?: number;
  refreshTokenValidity?: number;
  authorizationCodeValidity?: number;
  requireAuthorizationConsent?: boolean;
  additionalInformation?: string;
  createdBy?: string;
  updatedBy?: string;
}

// Filter criteria for POST /v1/oauth2/client/filter. Leave all fields empty/undefined to get all clients.
export interface ClientFilterDto {
  clientIds?: string[];
  clientNames?: string[];
  statuses?: string[];
}

// Query parameters accepted by the client filter endpoint
export interface ClientFilterParams {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  ignoreCase?: boolean;
  searchType?: 'PREFIX' | 'SUFFIX' | 'CONTAINS' | 'EQUAL';
}

// Common OAuth2 constants
export const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  CLIENT_CREDENTIALS: 'client_credentials',
  REFRESH_TOKEN: 'refresh_token',
  IMPLICIT: 'implicit',
  PASSWORD: 'password' // NOSONAR (typescript:S2068) - OAuth2 Resource Owner Password Credentials grant type name (RFC 6749), not a credential
} as const;

export const AUTH_METHODS = {
  CLIENT_SECRET_BASIC: 'client_secret_basic',
  CLIENT_SECRET_POST: 'client_secret_post',
  NONE: 'none'
} as const;

export const CLIENT_STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending', 
  REGISTERED: 'registered',
  REJECTED: 'rejected',
  DELETED: 'deleted',
  SUSPENDED: 'suspended'
} as const;

// Statuses fetched by default when no explicit status filter is selected. Deleted clients are excluded by default.
export const CLIENT_FILTER_STATUSES = [
  CLIENT_STATUS.APPROVED,
  CLIENT_STATUS.REGISTERED,
  CLIENT_STATUS.REJECTED,
] as const;

// All statuses selectable in the Client Management filter dropdown. Deleted is only
// fetched/displayed when the user explicitly selects it here.
export const CLIENT_STATUS_FILTER_OPTIONS = [
  ...CLIENT_FILTER_STATUSES,
  CLIENT_STATUS.DELETED,
] as const;

export type GrantType = typeof GRANT_TYPES[keyof typeof GRANT_TYPES];
export type AuthMethod = typeof AUTH_METHODS[keyof typeof AUTH_METHODS];
export type ClientStatus = typeof CLIENT_STATUS[keyof typeof CLIENT_STATUS];
