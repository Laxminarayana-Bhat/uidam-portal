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
import {
  GRANT_TYPES,
  AUTH_METHODS,
  CLIENT_STATUS,
  type GrantType,
  type AuthMethod,
  type ClientStatus,
  type RegisteredClientDetails,
  type ClientFormData,
  type ClientListItem,
} from './client';

describe('client.ts types and constants', () => {
  describe('GRANT_TYPES', () => {
    it('should have correct grant type values', () => {
      expect(GRANT_TYPES.AUTHORIZATION_CODE).toBe('authorization_code');
      expect(GRANT_TYPES.CLIENT_CREDENTIALS).toBe('client_credentials');
      expect(GRANT_TYPES.REFRESH_TOKEN).toBe('refresh_token');
      expect(GRANT_TYPES.IMPLICIT).toBe('implicit');
      expect(GRANT_TYPES.PASSWORD).toBe('password');
    });

    it('should contain all expected grant types', () => {
      const grantTypes = Object.values(GRANT_TYPES);
      expect(grantTypes).toHaveLength(5);
      expect(grantTypes).toContain('authorization_code');
      expect(grantTypes).toContain('client_credentials');
      expect(grantTypes).toContain('refresh_token');
      expect(grantTypes).toContain('implicit');
      expect(grantTypes).toContain('password');
    });
  });

  describe('AUTH_METHODS', () => {
    it('should have correct auth method values', () => {
      expect(AUTH_METHODS.CLIENT_SECRET_BASIC).toBe('client_secret_basic');
      expect(AUTH_METHODS.CLIENT_SECRET_POST).toBe('client_secret_post');
      expect(AUTH_METHODS.NONE).toBe('none');
    });

    it('should contain all expected auth methods', () => {
      const authMethods = Object.values(AUTH_METHODS);
      expect(authMethods).toHaveLength(3);
      expect(authMethods).toContain('client_secret_basic');
      expect(authMethods).toContain('client_secret_post');
      expect(authMethods).toContain('none');
    });
  });

  describe('CLIENT_STATUS', () => {
    it('should have correct status values', () => {
      expect(CLIENT_STATUS.APPROVED).toBe('approved');
      expect(CLIENT_STATUS.PENDING).toBe('pending');
      expect(CLIENT_STATUS.REGISTERED).toBe('registered');
      expect(CLIENT_STATUS.REJECTED).toBe('rejected');
      expect(CLIENT_STATUS.DELETED).toBe('deleted');
      expect(CLIENT_STATUS.SUSPENDED).toBe('suspended');
    });

    it('should contain all expected status values', () => {
      const statuses = Object.values(CLIENT_STATUS);
      expect(statuses).toHaveLength(6);
      expect(statuses).toContain('approved');
      expect(statuses).toContain('pending');
      expect(statuses).toContain('registered');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('deleted');
      expect(statuses).toContain('suspended');
    });
  });

  describe('Type compatibility', () => {
    it('should allow valid GrantType values', () => {
      const grantType: GrantType = 'authorization_code';
      expect(grantType).toBe('authorization_code');
    });

    it('should allow valid AuthMethod values', () => {
      const authMethod: AuthMethod = 'client_secret_basic';
      expect(authMethod).toBe('client_secret_basic');
    });

    it('should allow valid ClientStatus values', () => {
      const status: ClientStatus = 'approved';
      expect(status).toBe('approved');
    });
  });

  describe('RegisteredClientDetails interface', () => {
    it('should accept valid client details with required fields', () => {
      const client: RegisteredClientDetails = {
        clientId: 'test-client',
        clientName: 'Test Client',
        clientAuthenticationMethods: ['client_secret_basic'],
        authorizationGrantTypes: ['authorization_code'],
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['read', 'write'],
      };

      expect(client.clientId).toBe('test-client');
      expect(client.clientName).toBe('Test Client');
      expect(client.authorizationGrantTypes).toContain('authorization_code');
    });

    it('should accept client details with optional fields', () => {
      const client: RegisteredClientDetails = {
        clientId: 'test-client',
        clientName: 'Test Client',
        clientSecret: 'secret123',
        clientAuthenticationMethods: ['client_secret_basic'],
        authorizationGrantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: ['http://localhost:3000/callback'],
        postLogoutRedirectUris: ['http://localhost:3000/logout'],
        scopes: new Set(['read', 'write']),
        accessTokenValidity: 3600,
        refreshTokenValidity: 86400,
        authorizationCodeValidity: 300,
        additionalInformation: 'Test client',
        requireAuthorizationConsent: true,
        status: 'approved',
        requestedBy: 'admin',
        createdBy: 'system',
        updatedBy: 'admin',
      };

      expect(client.clientSecret).toBe('secret123');
      expect(client.accessTokenValidity).toBe(3600);
      expect(client.requireAuthorizationConsent).toBe(true);
    });

    it('should accept scopes as both array and Set', () => {
      const clientWithArray: RegisteredClientDetails = {
        clientId: 'test1',
        clientName: 'Test',
        clientAuthenticationMethods: [],
        authorizationGrantTypes: [],
        redirectUris: [],
        scopes: ['read', 'write'],
      };

      const clientWithSet: RegisteredClientDetails = {
        clientId: 'test2',
        clientName: 'Test',
        clientAuthenticationMethods: [],
        authorizationGrantTypes: [],
        redirectUris: [],
        scopes: new Set(['read', 'write']),
      };

      expect(clientWithArray.scopes).toEqual(['read', 'write']);
      expect(clientWithSet.scopes).toEqual(new Set(['read', 'write']));
    });
  });

  describe('ClientFormData interface', () => {
    it('should accept valid form data', () => {
      const formData: ClientFormData = {
        clientId: 'form-client',
        clientName: 'Form Client',
        authorizationGrantTypes: ['authorization_code'],
        redirectUris: ['http://localhost:3000'],
        postLogoutRedirectUris: ['http://localhost:3000/logout'],
        scopes: ['read'],
        clientAuthenticationMethods: ['client_secret_basic'],
        accessTokenValidity: 3600,
        refreshTokenValidity: 86400,
        authorizationCodeValidity: 300,
        requireAuthorizationConsent: false,
        status: 'pending',
      };

      expect(formData.clientId).toBe('form-client');
      expect(formData.requireAuthorizationConsent).toBe(false);
    });

    it('should accept form data with optional fields', () => {
      const formData: ClientFormData = {
        clientId: 'form-client',
        clientName: 'Form Client',
        clientSecret: 'secret',
        authorizationGrantTypes: [],
        redirectUris: [],
        postLogoutRedirectUris: [],
        scopes: [],
        clientAuthenticationMethods: [],
        accessTokenValidity: 3600,
        refreshTokenValidity: 86400,
        authorizationCodeValidity: 300,
        requireAuthorizationConsent: true,
        additionalInformation: 'Additional info',
        status: 'approved',
        createdBy: 'admin',
      };

      expect(formData.clientSecret).toBe('secret');
      expect(formData.additionalInformation).toBe('Additional info');
      expect(formData.createdBy).toBe('admin');
    });
  });

  describe('ClientListItem interface', () => {
    it('should accept valid list item with required fields', () => {
      const listItem: ClientListItem = {
        clientId: 'list-client',
        clientName: 'List Client',
        status: 'approved',
        authorizationGrantTypes: ['authorization_code'],
        scopes: ['read', 'write'],
      };

      expect(listItem.clientId).toBe('list-client');
      expect(listItem.scopes).toEqual(['read', 'write']);
    });

    it('should accept list item with optional fields', () => {
      const listItem: ClientListItem = {
        clientId: 'list-client',
        clientName: 'List Client',
        status: 'pending',
        authorizationGrantTypes: ['client_credentials'],
        scopes: ['admin'],
        requestedBy: 'user@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(listItem.requestedBy).toBe('user@example.com');
      expect(listItem.createdAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('BaseResponse interface', () => {
    it('should accept valid base response', () => {
      const response: { code: string; message: string; data?: { id: number }; httpStatus: string } = {
        code: '200',
        message: 'Success',
        data: { id: 1 },
        httpStatus: 'OK',
      };

      expect(response.code).toBe('200');
      expect(response.message).toBe('Success');
      expect(response.httpStatus).toBe('OK');
    });

    it('should accept response without optional data field', () => {
      const response: { code: string; message: string; data?: unknown; httpStatus: string } = {
        code: '404',
        message: 'Not Found',
        httpStatus: 'NOT_FOUND',
      };

      expect(response.code).toBe('404');
      expect(response.data).toBeUndefined();
    });
  });
});
