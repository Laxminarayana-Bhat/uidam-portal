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
import { ClientRegistrationService } from './clientRegistrationService';
import { userManagementApi } from './api-client';
import { ClientFormData } from '../types/client';

jest.mock('./api-client');

describe('ClientRegistrationService', () => {
  const mockClientFormData: ClientFormData = {
    clientId: 'test-client',
    clientName: 'Test Client',
    clientSecret: 'secret123',
    authorizationGrantTypes: ['authorization_code', 'refresh_token'],
    redirectUris: ['https://example.com/callback', 'https://example.com/callback2'],
    postLogoutRedirectUris: ['https://example.com/logout'],
    scopes: ['openid', 'profile', 'email'],
    clientAuthenticationMethods: ['client_secret_basic'],
    accessTokenValidity: 3600,
    refreshTokenValidity: 7200,
    authorizationCodeValidity: 300,
    requireAuthorizationConsent: true,
    status: 'approved',
    createdBy: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create a client successfully', async () => {
      const mockResponse = { success: true, message: 'Client created' };
      (userManagementApi.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ClientRegistrationService.createClient(mockClientFormData);

      expect(userManagementApi.post).toHaveBeenCalledWith(
        '/v1/oauth2/client',
        expect.objectContaining({
          clientId: 'test-client',
          clientName: 'Test Client',
          redirectUris: ['https://example.com/callback', 'https://example.com/callback2'],
          scopes: ['openid', 'profile', 'email'],
        }),
        { headers: { scope: 'OAuth2ClientMgmt' } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should filter out empty redirect URIs', async () => {
      const mockResponse = { success: true };
      (userManagementApi.post as jest.Mock).mockResolvedValue(mockResponse);

      const dataWithEmptyUris = {
        ...mockClientFormData,
        redirectUris: ['https://example.com', '', '  ', 'https://example2.com'],
      };

      await ClientRegistrationService.createClient(dataWithEmptyUris);

      const callArgs = (userManagementApi.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.redirectUris).toEqual(['https://example.com', 'https://example2.com']);
    });

    it('should filter out empty post logout redirect URIs', async () => {
      const mockResponse = { success: true };
      (userManagementApi.post as jest.Mock).mockResolvedValue(mockResponse);

      const dataWithEmptyUris = {
        ...mockClientFormData,
        postLogoutRedirectUris: ['https://logout.com', '', 'https://logout2.com'],
      };

      await ClientRegistrationService.createClient(dataWithEmptyUris);

      const callArgs = (userManagementApi.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.postLogoutRedirectUris).toEqual(['https://logout.com', 'https://logout2.com']);
    });

    it('should set default createdBy if not provided', async () => {
      const mockResponse = { success: true };
      (userManagementApi.post as jest.Mock).mockResolvedValue(mockResponse);

      const dataWithoutCreatedBy = { ...mockClientFormData, createdBy: undefined };

      await ClientRegistrationService.createClient(dataWithoutCreatedBy);

      const callArgs = (userManagementApi.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.createdBy).toBe('web-admin');
    });
  });

  describe('getClient', () => {
    it('should get client by ID', async () => {
      const mockResponse = { data: mockClientFormData };
      (userManagementApi.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ClientRegistrationService.getClient('test-client');

      expect(userManagementApi.get).toHaveBeenCalledWith(
        '/v1/oauth2/client/test-client',
        { params: {}, headers: { scope: 'OAuth2ClientMgmt', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get client by ID with status filter', async () => {
      const mockResponse = { data: mockClientFormData };
      (userManagementApi.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ClientRegistrationService.getClient('test-client', 'approved');

      expect(userManagementApi.get).toHaveBeenCalledWith(
        '/v1/oauth2/client/test-client',
        { params: { status: 'approved' }, headers: { scope: 'OAuth2ClientMgmt', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateClient', () => {
    it('should update client successfully', async () => {
      const mockResponse = { success: true, message: 'Client updated' };
      (userManagementApi.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ClientRegistrationService.updateClient('test-client', mockClientFormData);

      expect(userManagementApi.put).toHaveBeenCalledWith(
        '/v1/oauth2/client/test-client',
        expect.objectContaining({
          clientId: 'test-client',
          clientName: 'Test Client',
        }),
        { headers: { scope: 'OAuth2ClientMgmt' } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should filter empty URIs when updating', async () => {
      const mockResponse = { success: true };
      (userManagementApi.put as jest.Mock).mockResolvedValue(mockResponse);

      const dataWithEmptyUris = {
        ...mockClientFormData,
        redirectUris: ['https://example.com', '', 'https://example2.com'],
        postLogoutRedirectUris: ['', 'https://logout.com'],
      };

      await ClientRegistrationService.updateClient('test-client', dataWithEmptyUris);

      const callArgs = (userManagementApi.put as jest.Mock).mock.calls[0][1];
      expect(callArgs.redirectUris).toEqual(['https://example.com', 'https://example2.com']);
      expect(callArgs.postLogoutRedirectUris).toEqual(['https://logout.com']);
    });
  });

  describe('deleteClient', () => {
    it('should delete client successfully', async () => {
      const mockResponse = { success: true, message: 'Client deleted' };
      (userManagementApi.delete as jest.Mock).mockResolvedValue(mockResponse);

      const result = await ClientRegistrationService.deleteClient('test-client');

      expect(userManagementApi.delete).toHaveBeenCalledWith(
        '/v1/oauth2/client/test-client',
        { headers: { scope: 'OAuth2ClientMgmt' } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('filterClients', () => {
    it('should POST to the filter endpoint with query params and scope header', async () => {
      const mockClients = [{ clientId: 'c1', clientName: 'Client 1', status: 'approved', authorizationGrantTypes: [], scopes: [] }];
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: { clients: mockClients } });

      const result = await ClientRegistrationService.filterClients(
        { clientNames: ['Client 1'] },
        { pageNumber: 0, pageSize: 10, sortBy: 'CLIENT_NAME', sortOrder: 'ASC', ignoreCase: true, searchType: 'CONTAINS' }
      );

      expect(userManagementApi.post).toHaveBeenCalledWith(
        '/v1/oauth2/client/filter',
        { clientNames: ['Client 1'] },
        {
          params: { pageNumber: 0, pageSize: 10, sortBy: 'CLIENT_NAME', sortOrder: 'ASC', ignoreCase: true, searchType: 'CONTAINS' },
          headers: { scope: 'OAuth2ClientMgmt' },
        }
      );
      expect(result).toEqual(mockClients);
    });

    it('should default to an empty filter and no explicit params', async () => {
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: { clients: [] } });

      await ClientRegistrationService.filterClients();

      expect(userManagementApi.post).toHaveBeenCalledWith(
        '/v1/oauth2/client/filter',
        {},
        expect.objectContaining({ headers: { scope: 'OAuth2ClientMgmt' } })
      );
    });

    it('should handle a response where data is a bare array', async () => {
      const mockClients = [{ clientId: 'c1', clientName: 'Client 1', status: 'approved', authorizationGrantTypes: [], scopes: [] }];
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: mockClients });

      const result = await ClientRegistrationService.filterClients();
      expect(result).toEqual(mockClients);
    });

    it('should handle a response using a "content" field', async () => {
      const mockClients = [{ clientId: 'c1', clientName: 'Client 1', status: 'approved', authorizationGrantTypes: [], scopes: [] }];
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: { content: mockClients } });

      const result = await ClientRegistrationService.filterClients();
      expect(result).toEqual(mockClients);
    });

    it('should fall back to the first array-valued field for an unrecognized response shape', async () => {
      const mockClients = [{ clientId: 'c1', clientName: 'Client 1', status: 'approved', authorizationGrantTypes: [], scopes: [] }];
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: { someUnknownField: mockClients, totalRecords: 1 } });

      const result = await ClientRegistrationService.filterClients();
      expect(result).toEqual(mockClients);
    });

    it('should return an empty array when the response has no recognizable client list', async () => {
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: {} });

      const result = await ClientRegistrationService.filterClients();
      expect(result).toEqual([]);
    });
  });

  describe('getClients', () => {
    it('should delegate to filterClients with an empty filter and default pagination', async () => {
      const mockClients = [{ clientId: 'c1', clientName: 'Client 1', status: 'approved', authorizationGrantTypes: [], scopes: [] }];
      (userManagementApi.post as jest.Mock).mockResolvedValue({ data: { clients: mockClients } });

      const result = await ClientRegistrationService.getClients();

      expect(userManagementApi.post).toHaveBeenCalledWith(
        '/v1/oauth2/client/filter',
        {},
        expect.objectContaining({
          params: expect.objectContaining({ pageNumber: 0, pageSize: 100 }),
          headers: { scope: 'OAuth2ClientMgmt' },
        })
      );
      expect(result).toEqual(mockClients);
    });
  });

  describe('validateClientData', () => {
    it('should return no errors for valid data', () => {
      const errors = ClientRegistrationService.validateClientData(mockClientFormData);
      expect(errors).toEqual([]);
    });

    it('should return error if clientId is missing', () => {
      const invalidData = { ...mockClientFormData, clientId: '' };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('Client ID is required');
    });

    it('should return error if clientName is missing', () => {
      const invalidData = { ...mockClientFormData, clientName: '   ' };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('Client Name is required');
    });

    it('should return error if authorizationGrantTypes is empty', () => {
      const invalidData = { ...mockClientFormData, authorizationGrantTypes: [] };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('At least one authorization grant type is required');
    });

    it('should return error if authorization_code flow has no redirect URIs', () => {
      const invalidData = {
        ...mockClientFormData,
        authorizationGrantTypes: ['authorization_code'],
        redirectUris: [],
      };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('Redirect URIs are required for authorization code flow');
    });

    it('should validate redirect URI format', () => {
      const invalidData = {
        ...mockClientFormData,
        redirectUris: ['https://valid.com', 'invalid-uri', 'ftp://also-invalid.com'],
      };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('All redirect URIs must be valid HTTP/HTTPS URLs');
    });

    it('should validate post-logout redirect URI format', () => {
      const invalidData = {
        ...mockClientFormData,
        postLogoutRedirectUris: ['https://valid.com', 'invalid-uri'],
      };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('All post-logout redirect URIs must be valid HTTP/HTTPS URLs');
    });

    it('should allow empty strings in URI arrays', () => {
      const dataWithEmptyStrings = {
        ...mockClientFormData,
        redirectUris: ['https://valid.com', '', '  '],
        postLogoutRedirectUris: ['', 'https://logout.com', '  '],
      };
      const errors = ClientRegistrationService.validateClientData(dataWithEmptyStrings);
      expect(errors).toEqual([]);
    });

    it('should validate negative accessTokenValidity', () => {
      const invalidData = { ...mockClientFormData, accessTokenValidity: -100 };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('Access token validity must be a positive number');
    });

    it('should validate negative refreshTokenValidity', () => {
      const invalidData = { ...mockClientFormData, refreshTokenValidity: -200 };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('Refresh token validity must be a positive number');
    });

    it('should validate negative authorizationCodeValidity', () => {
      const invalidData = { ...mockClientFormData, authorizationCodeValidity: -50 };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors).toContain('Authorization code validity must be a positive number');
    });

    it('should allow undefined validity values', () => {
      const dataWithUndefined = {
        ...mockClientFormData,
        accessTokenValidity: undefined,
        refreshTokenValidity: undefined,
        authorizationCodeValidity: undefined,
      } as unknown as ClientFormData;
      const errors = ClientRegistrationService.validateClientData(dataWithUndefined);
      expect(errors).toEqual([]);
    });

    it('should return multiple errors for multiple issues', () => {
      const invalidData = {
        ...mockClientFormData,
        clientId: '',
        clientName: '',
        authorizationGrantTypes: [],
        accessTokenValidity: -100,
      };
      const errors = ClientRegistrationService.validateClientData(invalidData);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Client ID is required');
      expect(errors).toContain('Client Name is required');
      expect(errors).toContain('At least one authorization grant type is required');
      expect(errors).toContain('Access token validity must be a positive number');
    });
  });

  describe('getDefaultClientData', () => {
    it('should return default client data', () => {
      const defaultData = ClientRegistrationService.getDefaultClientData();

      expect(defaultData).toEqual({
        clientId: '',
        clientName: '',
        clientSecret: '',
        authorizationGrantTypes: ['authorization_code'],
        redirectUris: [''],
        postLogoutRedirectUris: [''],
        scopes: ['openid', 'profile'],
        clientAuthenticationMethods: ['client_secret_basic'],
        accessTokenValidity: 3600,
        refreshTokenValidity: 3600,
        authorizationCodeValidity: 300,
        requireAuthorizationConsent: true,
        additionalInformation: '',
        status: 'approved',
        createdBy: 'web-admin',
      });
    });

    it('should return new object instance each time', () => {
      const data1 = ClientRegistrationService.getDefaultClientData();
      const data2 = ClientRegistrationService.getDefaultClientData();

      expect(data1).not.toBe(data2); // Different references
      expect(data1).toEqual(data2); // Same values
    });
  });
});
