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
import { userManagementApi } from './api-client';
import { 
  RegisteredClientDetails, 
  BaseResponse, 
  ClientFormData, 
  ClientListItem,
  ClientFilterDto,
  ClientFilterParams,
} from '../types/client';

/**
 * Service class for managing OAuth2 client registration
 * Handles CRUD operations for OAuth2 clients and validation
 */
export class ClientRegistrationService {
  private static readonly BASE_PATH = '/v1/oauth2/client';

  /**
   * Create a new OAuth2 client
   * @param {ClientFormData} clientData - The client registration data
   * @returns {Promise<BaseResponse>} The API response with created client details
   * @throws {Error} If client creation fails
   */
  static async createClient(clientData: ClientFormData): Promise<BaseResponse> {
    const payload: RegisteredClientDetails = {
      ...clientData,
      // Ensure arrays are properly formatted
      redirectUris: clientData.redirectUris.filter(uri => uri.trim() !== ''),
      postLogoutRedirectUris: clientData.postLogoutRedirectUris?.filter(uri => uri.trim() !== '') ?? [],
      scopes: clientData.scopes.filter(scope => scope.trim() !== ''),
      authorizationGrantTypes: clientData.authorizationGrantTypes,
      clientAuthenticationMethods: clientData.clientAuthenticationMethods,
      createdBy: clientData.createdBy ?? 'web-admin', // Default creator
    };

    const response = await userManagementApi.post<BaseResponse>(this.BASE_PATH, payload, {
      headers: { scope: 'OAuth2ClientMgmt' }
    });
    return response;
  }

  /**
   * Get client details by clientId
   * @param {string} clientId - The unique client identifier
   * @param {string} [status] - Optional status filter for the client
   * @returns {Promise<BaseResponse>} The API response with client details
   * @throws {Error} If client retrieval fails
   */
  static async getClient(clientId: string, status?: string): Promise<BaseResponse> {
    const params = status ? { status } : {};
    const response = await userManagementApi.get<BaseResponse>(`${this.BASE_PATH}/${clientId}`, { 
      params,
      // Prevent the browser from serving a stale cached response for this client's details
      headers: { scope: 'OAuth2ClientMgmt', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    return response;
  }

  /**
   * Update existing client
   * @param {string} clientId - The unique client identifier
   * @param {ClientFormData} clientData - The updated client data
   * @returns {Promise<BaseResponse>} The API response with updated client details
   * @throws {Error} If client update fails
   */
  static async updateClient(clientId: string, clientData: ClientFormData): Promise<BaseResponse> {
    const payload: RegisteredClientDetails = {
      ...clientData,
      redirectUris: clientData.redirectUris.filter(uri => uri.trim() !== ''),
      postLogoutRedirectUris: clientData.postLogoutRedirectUris?.filter(uri => uri.trim() !== '') ?? [],
      scopes: clientData.scopes.filter(scope => scope.trim() !== ''),
      authorizationGrantTypes: clientData.authorizationGrantTypes,
      clientAuthenticationMethods: clientData.clientAuthenticationMethods,
      createdBy: clientData.createdBy ?? 'web-admin', // For update operations
    };

    const response = await userManagementApi.put<BaseResponse>(`${this.BASE_PATH}/${clientId}`, payload, {
      headers: { scope: 'OAuth2ClientMgmt' }
    });
    return response;
  }

  /**
   * Delete client
   * @param {string} clientId - The unique client identifier to delete
   * @returns {Promise<BaseResponse>} The API response confirming deletion
   * @throws {Error} If client deletion fails
   */
  static async deleteClient(clientId: string): Promise<BaseResponse> {
    const response = await userManagementApi.delete<BaseResponse>(`${this.BASE_PATH}/${clientId}`, {
      headers: { scope: 'OAuth2ClientMgmt' }
    });
    return response;
  }

  /**
   * Filters registered clients by criteria (POST /v1/oauth2/client/filter)
   * @param {ClientFilterDto} [filter] - Filter criteria; leave empty to match all clients
   * @param {ClientFilterParams} [params] - Pagination, sorting, and search behavior parameters
   * @returns {Promise<ClientListItem[]>} The list of clients matching the criteria
   * @throws {Error} If the filter request fails
   */
  static async filterClients(
    filter: ClientFilterDto = {},
    params: ClientFilterParams = {}
  ): Promise<ClientListItem[]> {
    const response = await userManagementApi.post<BaseResponse>(`${this.BASE_PATH}/filter`, filter, {
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ignoreCase: params.ignoreCase,
        searchType: params.searchType,
      },
      headers: { scope: 'OAuth2ClientMgmt' }
    });

    console.log('POST /v1/oauth2/client/filter response:', response);

    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      // Check the field names we expect first
      const candidate = data.clients ?? data.content ?? data.results ?? data.clientDetailsList ?? data.clientList;
      if (Array.isArray(candidate)) {
        return candidate;
      }
      // Backend response field name for the client list is unconfirmed;
      // fall back to the first array found anywhere in the response body
      const firstArray = Object.values(data).find((value): value is unknown[] => Array.isArray(value));
      if (firstArray) {
        return firstArray as ClientListItem[];
      }
    }
    return [];
  }

  /**
   * Get list of all clients
   * @returns {Promise<ClientListItem[]>} The list of registered clients
   */
  static async getClients(): Promise<ClientListItem[]> {
    return this.filterClients({}, { pageNumber: 0, pageSize: 100 });
  }

  /**
   * Validate client form data
   * @param {ClientFormData} data - The client data to validate
   * @returns {string[]} Array of validation error messages (empty if valid)
   */
  static validateClientData(data: ClientFormData): string[] {
    const errors: string[] = [];

    if (!data.clientId?.trim()) {
      errors.push('Client ID is required');
    }

    if (!data.clientName?.trim()) {
      errors.push('Client Name is required');
    }

    if (!data.authorizationGrantTypes?.length) {
      errors.push('At least one authorization grant type is required');
    }

    if (data.authorizationGrantTypes?.includes('authorization_code') && !data.redirectUris?.length) {
      errors.push('Redirect URIs are required for authorization code flow');
    }

    // Validate URI formats
    const urlPattern = /^https?:\/\/.+/;
    const invalidRedirectUris = data.redirectUris?.filter(uri => uri.trim() && !urlPattern.test(uri));
    if (invalidRedirectUris?.length) {
      errors.push('All redirect URIs must be valid HTTP/HTTPS URLs');
    }

    const invalidLogoutUris = data.postLogoutRedirectUris?.filter(uri => uri.trim() && !urlPattern.test(uri));
    if (invalidLogoutUris?.length) {
      errors.push('All post-logout redirect URIs must be valid HTTP/HTTPS URLs');
    }

    // Validate token validity values
    if (data.accessTokenValidity !== undefined && data.accessTokenValidity < 0) {
      errors.push('Access token validity must be a positive number');
    }

    if (data.refreshTokenValidity !== undefined && data.refreshTokenValidity < 0) {
      errors.push('Refresh token validity must be a positive number');
    }

    if (data.authorizationCodeValidity !== undefined && data.authorizationCodeValidity < 0) {
      errors.push('Authorization code validity must be a positive number');
    }

    return errors;
  }

  /**
   * Generate default client data for forms
   * @returns {ClientFormData} Default client configuration with standard OAuth2 settings
   */
  static getDefaultClientData(): ClientFormData {
    return {
      clientId: '',
      clientName: '',
      clientSecret: '',
      authorizationGrantTypes: ['authorization_code'],
      redirectUris: [''],
      postLogoutRedirectUris: [''],
      scopes: ['openid', 'profile'],
      clientAuthenticationMethods: ['client_secret_basic'],
      accessTokenValidity: 3600, // 1 hour (backend default)
      refreshTokenValidity: 3600, // 1 hour (backend default) 
      authorizationCodeValidity: 300, // 5 minutes (backend default)
      requireAuthorizationConsent: true,
      additionalInformation: '',
      status: 'approved', // Backend default status
      createdBy: 'web-admin'
    };
  }
}
