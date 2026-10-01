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
  UserService,
  User,
  CreateUserV1Request,
  CreateUserV2Request,
  ExternalUserRequest,
  FederatedUserRequest,
  UsersFilterV1,
  UsersFilterV2,
  UserStatusChangeRequest,
  UserMetaDataRequest
} from './userService';
import { JsonPatchOperation } from '../utils/jsonPatchUtils';
import { API_CONFIG } from '@/config/app.config';

// Mock the tokenManager module
jest.mock('@/utils/tokenManager', () => ({
  handleTokenRefresh: jest.fn().mockResolvedValue('mock-refreshed-token'),
  shouldRefreshToken: jest.fn().mockReturnValue(false),
  getValidToken: jest.fn().mockResolvedValue('mock-valid-token'),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('UserService', () => {
  beforeEach(() => {
    // Setup mock token in localStorage
    mockLocalStorage.setItem('uidam_admin_token', 'mock-token');
    mockLocalStorage.setItem('uidam_token_expires_at', String(Date.now() + 3600000)); // 1 hour from now
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  const mockUser: User = {
    id: '1',
    userName: 'testuser',
    status: 'ACTIVE',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phoneNumber: '+1234567890',
    country: 'US',
    state: 'CA',
    city: 'San Francisco',
    address1: '123 Main St',
    postalCode: '94105',
    locale: 'en-US',
    timeZone: 'America/Los_Angeles'
  };

  const mockUsers: User[] = [
    mockUser,
    {
      id: '2',
      userName: 'testuser2',
      status: 'PENDING',
      firstName: 'Another',
      lastName: 'User',
      email: 'another@example.com',
      locale: 'en-US'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('V1 User APIs', () => {
    describe('createUserV1', () => {
      it('should create user with all fields', async () => {
        const createRequest: CreateUserV1Request = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          userName: 'johndoe',
          password: 'password123',
          roles: ['ADMIN']
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.createUserV1(createRequest);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(createRequest)
          })
        );
      });

      it('should create user with minimal fields', async () => {
        const createRequest: CreateUserV1Request = {
          firstName: 'John',
          email: 'john@example.com',
          userName: 'johndoe',
          password: 'password123',
          roles: []
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.createUserV1(createRequest);

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users`,
          expect.anything()
        );
      });

      it('should handle API error response', async () => {
        const createRequest: CreateUserV1Request = {
          firstName: 'John',
          email: 'john@example.com',
          userName: 'johndoe',
          password: 'password123',
          roles: []
        };

        const mockError = {
          code: 'ERROR',
          message: 'User already exists'
        };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockError
        });

        const result = await UserService.createUserV1(createRequest);

        expect(result.code).toBe('ERROR');
      });
    });

    describe('getUserV1', () => {
      it('should fetch user by id', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse)
        });

        const result = await UserService.getUserV1('1');

        expect(result.data).toEqual(mockUser);
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1`,
          expect.objectContaining({
            method: 'GET'
          })
        );
      });

      it('should handle user not found', async () => {
        const mockError = {
          code: 'NOT_FOUND',
          message: 'User not found'
        };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockError,
          text: async () => JSON.stringify(mockError)
        });

        const result = await UserService.getUserV1('999');

        expect(result.code).toBe('NOT_FOUND');
      });
    });

    describe('updateUserV1', () => {
      it('should update user with patches', async () => {
        const patches = [
          { op: 'replace', path: '/firstName', value: 'Updated' } as const
        ];

        const mockResponse = { code: 'SUCCESS', data: { ...mockUser, firstName: 'Updated' } };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.updateUserV1('1', patches);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(patches)
          })
        );
      });

      it('should handle update error', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patches: any[] = [];
        const mockError = {
          code: 'INVALID_PATCH',
          message: 'Invalid patch operation'
        };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockError
        });

        const result = await UserService.updateUserV1('1', patches);

        expect(result.code).toBe('INVALID_PATCH');
      });
    });

    describe('deleteUserV1', () => {
      it('should delete user by id', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          ok: true,
          text: async () => ''
        });

        await UserService.deleteUserV1('1');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/users/1'),
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });

      it('should delete external user when flag is true', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          ok: true,
          text: async () => ''
        });

        await UserService.deleteUserV1('1', true);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('external_user=true'),
          expect.anything()
        );
      });
    });

    describe('filterUsersV1', () => {
      it('should filter users with search params', async () => {
        const filter: UsersFilterV1 = {
          userNames: ['testuser'],
          status: ['ACTIVE']
        };
        const params = {
          pageNumber: 0,
          pageSize: 10
        };

        const mockResponse = { code: 'SUCCESS', data: mockUsers };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.filterUsersV1(filter, params);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/users/filter'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(filter)
          })
        );
      });

      it('should filter users without params', async () => {
        const filter: UsersFilterV1 = {
          roles: ['ADMIN']
        };

        const mockResponse = { code: 'SUCCESS', data: mockUsers };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.filterUsersV1(filter);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/users/filter'),
          expect.anything()
        );
      });

      it('should handle filter error', async () => {
        const filter: UsersFilterV1 = {};
        const mockError = {
          code: 'ERROR',
          message: 'Filter failed'
        };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockError
        });

        const result = await UserService.filterUsersV1(filter);

        expect(result.code).toBe('ERROR');
      });

      it('should include all search params in URL', async () => {
        const filter: UsersFilterV1 = {};
        const params = {
          pageNumber: 1,
          pageSize: 20,
          sortBy: 'USER_NAMES' as const,
          sortOrder: 'ASC' as const,
          ignoreCase: true,
          searchType: 'CONTAINS' as const
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ code: 'SUCCESS', data: [] })
        });

        await UserService.filterUsersV1(filter, params);

        const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(callUrl).toContain('pageNumber=1');
        expect(callUrl).toContain('pageSize=20');
        expect(callUrl).toContain('sortBy=USER_NAMES');
        expect(callUrl).toContain('sortOrder=ASC');
      });
    });
  });

  describe('V2 User APIs', () => {
    describe('createUserV2', () => {
      it('should create user with accounts', async () => {
        const createRequest: CreateUserV2Request = {
          firstName: 'John',
          email: 'john@example.com',
          userName: 'johndoe',
          password: 'password123',
          roles: ['ADMIN'],
          accounts: [
            { account: 'account1', roles: ['ADMIN'] }
          ]
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          ok: true,
          text: async () => ''
        });

        const result = await UserService.createUserV2(createRequest);

        expect(result.code).toBe('SUCCESS');
      });

      it('should handle V2 API error', async () => {
        const createRequest: CreateUserV2Request = {
          firstName: 'John',
          email: 'john@example.com',
          userName: 'johndoe',
          password: 'password123',
          roles: [],
          accounts: []
        };

        const mockError = { code: 'INVALID_ACCOUNT' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockError,
          ok: true,
          text: async () => ''
        });

        const result = await UserService.createUserV2(createRequest);

        expect(result.code).toBe('INVALID_ACCOUNT');
      });
    });

    describe('getUserV2', () => {
      it('should fetch user via V2 API', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse)
        });

        const result = await UserService.getUserV2('1');

        expect(result.data).toEqual(mockUser);
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v2/users/1`,
          expect.anything()
        );
      });
    });

    describe('updateUserV2', () => {
      it('should update user via V2 API', async () => {
        const patches = [
          { op: 'replace', path: '/status', value: 'BLOCKED' } as const
        ];

        const mockResponse = { code: 'SUCCESS', data: { ...mockUser, status: 'BLOCKED' } };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          ok: true,
          text: async () => ''
        });

        const result = await UserService.updateUserV2('1', patches);

        expect(result.code).toBe('SUCCESS');
      });
    });

    describe('filterUsersV2', () => {
      it('should filter users with account names', async () => {
        const filter: UsersFilterV2 = {
          accountNames: ['account1'],
          status: ['ACTIVE']
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockUsers,
          ok: true,
          text: async () => JSON.stringify(mockUsers)
        });

        const result = await UserService.filterUsersV2(filter);

        expect(result).toEqual(mockUsers);
      });

      it('should handle filter error with message', async () => {
        const filter: UsersFilterV2 = {};

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 403,
          text: async () => 'Forbidden'
        });

        await expect(UserService.filterUsersV2(filter))
          .rejects.toThrow('You do not have permission to view users');
      });

      it('should handle 401 error', async () => {
        const filter: UsersFilterV2 = {};

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized'
        });

        await expect(UserService.filterUsersV2(filter))
          .rejects.toThrow('Authentication failed');
      });

      it('should handle 405 error', async () => {
        const filter: UsersFilterV2 = {};

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 405,
          text: async () => 'Method not allowed'
        });

        await expect(UserService.filterUsersV2(filter))
          .rejects.toThrow('Server configuration error');
      });

      it('should handle 404 error', async () => {
        const filter: UsersFilterV2 = {};

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => 'Not found'
        });

        await expect(UserService.filterUsersV2(filter))
          .rejects.toThrow('User service not found');
      });

      it('should handle 500 error', async () => {
        const filter: UsersFilterV2 = {};

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => 'Internal error'
        });

        await expect(UserService.filterUsersV2(filter))
          .rejects.toThrow('Server error');
      });
    });
  });

  describe('Special User Types', () => {
    describe('createExternalUser', () => {
      it('should create external user without password', async () => {
        const externalRequest: ExternalUserRequest = {
          firstName: 'External',
          email: 'external@example.com',
          userName: 'externaluser',
          roles: ['USER']
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.createExternalUser(externalRequest);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/external`,
          expect.anything()
        );
      });
    });

    describe('createFederatedUser', () => {
      it('should create federated user with IDP', async () => {
        const federatedRequest: FederatedUserRequest = {
          firstName: 'Federated',
          email: 'federated@example.com',
          userName: 'feduser',
          identity_provider_name: 'oauth-provider',
          roles: ['USER']
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.createFederatedUser(federatedRequest);

        expect(result.code).toBe('SUCCESS');
      });
    });

    describe('getExternalUser', () => {
      it('should fetch external user', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.getExternalUser('1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/external/1`,
          expect.anything()
        );
      });
    });

    describe('updateExternalUser', () => {
      it('should update external user', async () => {
        const patches = [{ op: 'replace', path: '/email', value: 'new@example.com' } as const];

        const mockResponse = { code: 'SUCCESS', data: { ...mockUser, email: 'new@example.com' } };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.updateExternalUser('1', patches);

        expect(result.code).toBe('SUCCESS');
      });
    });

    describe('deleteExternalUser', () => {
      it('should delete external user', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.deleteExternalUser('1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/external/1`,
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });
  });

  describe('User Status Management', () => {
    describe('changeUserStatus', () => {
      it('should approve user status change', async () => {
        const request: UserStatusChangeRequest = {
          ids: ['1', '2'],
          approved: true
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.changeUserStatus(request);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/status`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(request)
          })
        );
      });

      it('should reject user status change', async () => {
        const request: UserStatusChangeRequest = {
          ids: ['3'],
          approved: false
        };

        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.changeUserStatus(request);

        const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(callBody.approved).toBe(false);
      });
    });

    describe('deleteUsersByFilter', () => {
      it('should delete users by filter', async () => {
        const filter = { ids: [1, 2, 3] };

        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.deleteUsersByFilter(filter);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users`,
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify(filter)
          })
        );
      });
    });
  });

  describe('User-Account-Role Mapping', () => {
    describe('associateAccountAndRoles', () => {
      it('should associate account and roles', async () => {
        const operations = [
          { op: 'ADD' as const, path: '/account/1/ADMIN', value: 'ADMIN' }
        ];

        const mockResponse = {
          code: 'SUCCESS',
          data: {
            accounts: [{ account: 'account1', roles: ['ADMIN'] }]
          }
        };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.associateAccountAndRoles('1', operations);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1/accountRoleMapping`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(operations)
          })
        );
      });

      it('should handle multiple role operations', async () => {
        const operations = [
          { op: 'ADD' as const, path: '/account/1/ADMIN' },
          { op: 'REMOVE' as const, path: '/account/2/USER' }
        ];

        const mockResponse = { code: 'SUCCESS', data: { accounts: [] } };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.associateAccountAndRoles('1', operations);

        const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(callBody.length).toBe(2);
      });
    });
  });

  describe('Self-Service APIs', () => {
    describe('getSelfUser', () => {
      it('should fetch current user', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.getSelfUser();

        expect(result.data).toEqual(mockUser);
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/self`,
          expect.anything()
        );
      });

      it('should throw when no token is stored', async () => {
        mockLocalStorage.removeItem('uidam_admin_token');
        await expect(UserService.getSelfUser()).rejects.toThrow('Authentication token not found');
      });

      it('should add user-id header when JWT contains user_id claim', async () => {
        const payload = btoa(JSON.stringify({ user_id: 'uid-42' }));
        const fakeJwt = `header.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', fakeJwt);

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({ json: async () => mockResponse });

        await UserService.getSelfUser();

        const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers as Record<string, string>;
        expect(callHeaders['user-id']).toBe('uid-42');
      });

      it('should omit user-id header when JWT is malformed', async () => {
        mockLocalStorage.setItem('uidam_admin_token', 'not.a.valid.jwt.at.all');

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({ json: async () => mockResponse });

        // Should not throw
        const result = await UserService.getSelfUser();
        expect(result.code).toBe('SUCCESS');
      });
    });

    describe('updateSelfUser', () => {
      it('should update current user', async () => {
        const patches = [{ op: 'replace', path: '/locale', value: 'fr-FR' } as const];

        const mockResponse = { code: 'SUCCESS', data: { ...mockUser, locale: 'fr-FR' } };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.updateSelfUser(patches);

        expect(result.code).toBe('SUCCESS');
      });

      it('should throw when no token is stored', async () => {
        mockLocalStorage.removeItem('uidam_admin_token');
        const patches = [{ op: 'replace', path: '/firstName', value: 'X' } as const];
        await expect(UserService.updateSelfUser(patches)).rejects.toThrow('Authentication token not found');
      });

      it('should send PATCH to /v1/users/self', async () => {
        const patches = [{ op: 'replace', path: '/email', value: 'new@test.com' } as const];
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({ json: async () => mockResponse });

        await UserService.updateSelfUser(patches);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/users/self'),
          expect.objectContaining({ method: 'PATCH', body: JSON.stringify(patches) })
        );
      });
    });

    describe('deleteSelfUser', () => {
      it('should delete current user', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.deleteSelfUser();

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v2/users/self'),
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });

      it('should delete self as external user', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.deleteSelfUser(true);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('external_user=true'),
          expect.anything()
        );
      });
    });
  });

  describe('User Attributes', () => {
    describe('getUserAttributes', () => {
      it('should fetch additional user attributes', async () => {
        const mockAttributes = [
          { name: 'department', mandatory: true },
          { name: 'location', mandatory: false }
        ];
        const mockResponse = { code: 'SUCCESS', data: mockAttributes };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        });

        const result = await UserService.getUserAttributes();

        expect(result.data).toEqual(mockAttributes);
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/attributes/additional`,
          expect.anything()
        );
      });
    });

    describe('updateUserAttributes', () => {
      it('should update user attributes', async () => {
        const attributes: UserMetaDataRequest[] = [
          { name: 'department', mandatory: true, searchable: true }
        ];

        const mockResponse = { code: 'SUCCESS', data: attributes };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        });

        const result = await UserService.updateUserAttributes(attributes);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/attributes`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(attributes)
          })
        );
      });
    });

    describe('deleteUserAttribute', () => {
      it('should delete an attribute by name', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          ok: true,
          text: async () => ''
        });

        await UserService.deleteUserAttribute('department');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/attributes/department`,
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      it('should throw a descriptive error when the delete fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => JSON.stringify({ message: 'Attribute not found' })
        });

        await expect(UserService.deleteUserAttribute('missing')).rejects.toThrow('Attribute not found');
      });
    });
  });

  describe('Per-user Attribute Values', () => {
    describe('getUserAttributeValues', () => {
      it('should fetch a user\'s attribute values as an array', async () => {
        const mockValues = [{ name: 'department', value: 'Engineering' }];
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify(mockValues)
        });

        const result = await UserService.getUserAttributeValues('1');

        expect(result.data).toEqual(mockValues);
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1/attributes/values`,
          expect.objectContaining({ method: 'GET' })
        );
      });

      it('should normalize a plain name->value map into an array of pairs', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify({ department: 'Engineering', location: 'BLR' })
        });

        const result = await UserService.getUserAttributeValues('1');

        expect(result.data).toEqual([
          { name: 'department', value: 'Engineering' },
          { name: 'location', value: 'BLR' },
        ]);
      });

      it('should pass through an already-enveloped response', async () => {
        const mockResponse = { code: 'SUCCESS', data: [{ name: 'department', value: 'Engineering' }] };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify(mockResponse)
        });

        const result = await UserService.getUserAttributeValues('1');

        expect(result).toEqual(mockResponse);
      });

      it('should throw a descriptive error instead of treating an error body as attribute values', async () => {
        const problemDetails = { detail: 'No static resource v1/users/attributes/values.', status: 404, title: 'Not Found' };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => JSON.stringify(problemDetails)
        });

        await expect(UserService.getUserAttributeValues('1')).rejects.toThrow('No static resource v1/users/attributes/values.');
      });
    });

    describe('updateUserAttributeValues', () => {
      it('should PUT the attribute values for a user', async () => {
        const values = [{ name: 'department', value: 'Engineering' }];
        const mockResponse = { code: 'SUCCESS', data: values };
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        });

        const result = await UserService.updateUserAttributeValues('1', values);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1/attributes/values`,
          // The array of {name, value} pairs is converted to a name->value map before sending
          expect.objectContaining({ method: 'PUT', body: JSON.stringify({ department: 'Engineering' }) })
        );
      });

      it('should throw instead of reporting success when the backend rejects the update', async () => {
        const values = [{ name: 'department', value: 'Engineering' }];
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ message: 'Invalid attribute value' })
        });

        await expect(UserService.updateUserAttributeValues('1', values)).rejects.toThrow('Invalid attribute value');
      });
    });

    describe('deleteUserAttributeValue', () => {
      it('should delete a stored value by attribute name', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          text: async () => ''
        });

        await UserService.deleteUserAttributeValue('1', 'department');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1/attributes/values/department`,
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      it('should throw a descriptive error when the delete fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ message: 'Server error' })
        });

        await expect(UserService.deleteUserAttributeValue('1', 'department')).rejects.toThrow('Server error');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getUserByUserName', () => {
      it('should fetch user by username', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.getUserByUserName('testuser');

        expect(result.data).toEqual(mockUser);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/users/testuser/byUserName'),
          expect.anything()
        );
      });

      it('should fetch user by username and account', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.getUserByUserName('testuser', 'account1');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('accountName=account1'),
          expect.anything()
        );
      });
    });
  });

  describe('User Events', () => {
    describe('addUserEvent', () => {
      it('should add user event', async () => {
        const event = { type: 'LOGIN', timestamp: new Date().toISOString() };

        const mockResponse = { code: 'SUCCESS', data: 'event-id-123' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const result = await UserService.addUserEvent('1', event);

        expect(result.code).toBe('SUCCESS');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/1/events`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(event)
          })
        );
      });
    });
  });

  describe('Data Validation', () => {
    it('should handle user with all account roles', async () => {
      const userWithAccounts: User = {
        ...mockUser,
        accounts: [
          { account: 'account1', roles: ['ADMIN', 'USER'] },
          { account: 'account2', roles: ['USER'] }
        ],
        roles: ['ADMIN', 'USER']
      };

      const mockResponse = { code: 'SUCCESS', data: userWithAccounts };
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await UserService.getUserV1('1');

      expect(result.data?.accounts).toHaveLength(2);
      expect(result.data?.accounts?.[0].roles).toContain('ADMIN');
    });

    it('should handle user with different statuses', async () => {
      const statuses: User['status'][] = ['PENDING', 'BLOCKED', 'REJECTED', 'ACTIVE', 'DELETED', 'DEACTIVATED'];

      for (const status of statuses) {
        const userWithStatus: User = { ...mockUser, status };
        const mockResponse = { code: 'SUCCESS', data: userWithStatus };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse)
        });

        const result = await UserService.getUserV1('1');

        expect(result.data?.status).toBe(status);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('HTTP Error Status Codes', () => {
      it('should handle 401 Unauthorized response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ code: 'UNAUTHORIZED', message: 'Authentication required' }),
          text: async () => JSON.stringify({ code: 'UNAUTHORIZED', message: 'Authentication required' })
        });

        const result = await UserService.getUserV1('1');
        expect(result.code).toBe('UNAUTHORIZED');
      });

      it('should handle 403 Forbidden response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({ code: 'FORBIDDEN', message: 'Access denied' }),
          text: async () => JSON.stringify({ code: 'FORBIDDEN', message: 'Access denied' })
        });

        const result = await UserService.getUserV1('1');
        expect(result.code).toBe('FORBIDDEN');
      });

      it('should handle 404 Not Found response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({ code: 'NOT_FOUND', message: 'User not found' })
        });

        const result = await UserService.createUserV1({
          firstName: 'Test',
          email: 'test@test.com',
          userName: 'test',
          password: 'pass',
          roles: []
        });
        expect(result.code).toBe('NOT_FOUND');
      });

      it('should handle 500 Internal Server Error', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ code: 'SERVER_ERROR', message: 'Internal server error' })
        });

        const result = await UserService.filterUsersV1({});
        expect(result.code).toBe('SERVER_ERROR');
      });

      it('should handle 409 Conflict response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 409,
          json: async () => ({ code: 'CONFLICT', message: 'User already exists' })
        });

        const result = await UserService.createUserV1({
          firstName: 'Duplicate',
          email: 'dup@test.com',
          userName: 'duplicate',
          password: 'pass',
          roles: []
        });
        expect(result.code).toBe('CONFLICT');
      });
    });

    describe('Network and Exception Handling', () => {
      it('should handle network error in fetch', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        await expect(UserService.getUserV1('1')).rejects.toThrow('Network error');
      });

      it('should handle JSON parse error', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          text: async () => { throw new Error('Invalid JSON'); }
        });

        await expect(UserService.getUserV1('1')).rejects.toThrow('Invalid JSON');
      });

      it('should handle non-Error exception', async () => {
        (global.fetch as jest.Mock).mockRejectedValue('String error');

        await expect(UserService.createUserV1({
          firstName: 'Test',
          email: 'test@test.com',
          userName: 'test',
          password: 'pass',
          roles: []
        })).rejects.toBe('String error');
      });

      it('should handle timeout error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Request timeout'));

        await expect(UserService.filterUsersV1({})).rejects.toThrow('Request timeout');
      });
    });

    describe('Response Format Variations', () => {
      it('should handle response without data field', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ code: 'SUCCESS', message: 'Operation completed' }),
          text: async () => JSON.stringify({ code: 'SUCCESS', message: 'Operation completed' })
        });

        const result = await UserService.getUserV1('1');
        expect(result.code).toBe('SUCCESS');
        expect(result.data).toBeUndefined();
      });

      it('should handle empty users array in filter response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ code: 'SUCCESS', data: [] })
        });

        const result = await UserService.filterUsersV1({ userNames: ['nonexistent'] });
        expect(result.data).toEqual([]);
      });

      it('should handle null response data', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ code: 'SUCCESS', data: null }),
          text: async () => JSON.stringify({ code: 'SUCCESS', data: null })
        });

        const result = await UserService.getUserV1('999');
        expect(result.data).toBeNull();
      });

      it('should handle response with only httpStatus', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ httpStatus: '200 OK' }),
          text: async () => JSON.stringify({ httpStatus: '200 OK' })
        });

        const result = await UserService.getUserV1('1');
        expect(result.httpStatus).toBe('200 OK');
      });
    });

    describe('Edge Cases for Filter Parameters', () => {
      it('should handle empty array filters', async () => {
        const mockResponse = { code: 'SUCCESS', data: [] };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const filter: UsersFilterV1 = {
          ids: [],
          userNames: [],
          emails: []
        };

        await UserService.filterUsersV1(filter);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should handle filter with all optional parameters', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUsers };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const filter: UsersFilterV1 = {
          ids: [1],
          userNames: ['test'],
          roles: ['ADMIN'],
          firstNames: ['Test'],
          lastNames: ['User'],
          countries: ['US'],
          states: ['CA'],
          cities: ['SF'],
          address1: ['123 Main'],
          address2: ['Apt 1'],
          postalCodes: ['94105'],
          phoneNumbers: ['+1234567890'],
          emails: ['test@test.com'],
          locales: ['en-US'],
          gender: ['MALE'],
          devIds: ['dev1'],
          status: ['ACTIVE'],
          additionalAttributes: { key: ['value'] }
        };

        await UserService.filterUsersV1(filter);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should handle special characters in filter values', async () => {
        const mockResponse = { code: 'SUCCESS', data: [] };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const filter: UsersFilterV1 = {
          userNames: ['user@test', 'user#123', 'user&name'],
          emails: ['test+tag@domain.com']
        };

        await UserService.filterUsersV1(filter);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('Edge Cases for User Creation', () => {
      it('should handle user creation with empty optional fields', async () => {
        const createRequest: CreateUserV1Request = {
          firstName: '',
          lastName: '',
          email: 'test@test.com',
          userName: 'testuser',
          password: 'password',
          roles: []
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.createUserV1(createRequest);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should handle user creation with undefined optional fields', async () => {
        const createRequest: CreateUserV1Request = {
          firstName: 'Test',
          lastName: undefined,
          country: undefined,
          email: 'test@test.com',
          userName: 'testuser',
          password: 'password',
          roles: []
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.createUserV1(createRequest);
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should handle user creation with maximum field lengths', async () => {
        const createRequest: CreateUserV1Request = {
          firstName: 'A'.repeat(100),
          lastName: 'B'.repeat(100),
          email: 'test@test.com',
          userName: 'C'.repeat(50),
          password: 'D'.repeat(100),
          roles: ['ROLE1', 'ROLE2', 'ROLE3']
        };

        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.createUserV1(createRequest);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('Edge Cases for User Updates', () => {
      it('should handle empty patches array', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.updateUserV1('1', []);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify([])
          })
        );
      });

      it('should handle patch with null value', async () => {
        const mockResponse = { code: 'SUCCESS', data: mockUser };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        const patches: JsonPatchOperation[] = [
          { op: 'replace', path: '/lastName', value: undefined }
        ];

        await UserService.updateUserV1('1', patches);
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('Edge Cases for User Deletion', () => {
      it.skip('should handle deletion with ID 0', async () => {
        const mockResponse = { code: 'SUCCESS' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.deleteUserV1('0');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/0?isExternalUser=false`,
          expect.anything()
        );
      });

      it.skip('should handle deletion with negative ID', async () => {
        const mockResponse = { code: 'ERROR', message: 'Invalid ID' };
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse
        });

        await UserService.deleteUserV1('-1');
        expect(global.fetch).toHaveBeenCalledWith(
          `${API_CONFIG.API_BASE_URL}/v1/users/-1?isExternalUser=false`,
          expect.anything()
        );
      });
    });
  });

  // Password Reset Request Tests
  describe('Password Reset Request', () => {
    beforeEach(() => {
      // Clear localStorage and mocks before each test
      mockLocalStorage.clear();
      jest.clearAllMocks();
    });

    describe('requestPasswordReset', () => {
      it('should extract user_id from JWT token and add to headers', async () => {
        // Create a mock JWT token with user_id claim
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({ user_id: '12345', username: 'testuser', exp: Date.now() + 3600000 }));
        const mockToken = `${header}.${payload}.signature`;
        
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'success', message: 'Password reset email sent' }),
        });

        await UserService.requestPasswordReset();

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/users/self/recovery/resetpassword'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'user-id': '12345',
              'Content-Type': 'application/json'
            })
          })
        );
      });

      it('should call password reset API successfully', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '999', username: 'admin' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        const mockResponse = {
          status: 'success',
          message: 'Password reset email sent successfully'
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await UserService.requestPasswordReset();

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should show user-friendly error for SMTP failures (500 with mail server error)', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '123' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        const mockErrorResponse = {
          status: 'error',
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Mail server connection failed. Failed messages: org.eclipse.angus.mail.util.MailConnectException: Couldn\'t connect to host, port: smtp.gmail.com, 587'
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => mockErrorResponse,
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Email service is temporarily unavailable'
        );
      });

      it('should handle rate limiting (429)', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '123' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Too many password reset requests. Please try again later.' }),
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Too many password reset requests. Please try again later.'
        );
      });

      it('should handle JWT decoding failures', async () => {
        // Set an invalid JWT token (not base64 encoded properly)
        mockLocalStorage.setItem('uidam_admin_token', 'invalid.token.here');

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Failed to extract user ID from authentication token'
        );
      });

      it('should handle missing user_id claim in token', async () => {
        // Create a token without user_id claim
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ username: 'testuser', email: 'test@example.com' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Failed to extract user ID from authentication token'
        );
      });

      it('should handle user not found (404)', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '999' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ message: 'User account not found.' }),
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'User account not found.'
        );
      });

      it('should handle invalid request (400)', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '123' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ message: 'Invalid request. Please try again.' }),
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Invalid request. Please try again.'
        );
      });

      it('should throw error when token is missing from localStorage', async () => {
        // localStorage is empty (cleared in beforeEach)
        
        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Authentication token not found'
        );

        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should handle INTERNAL_SERVER_ERROR code specifically', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '123' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error'
          }),
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Server error occurred. Please contact your system administrator.'
        );
      });

      it('should handle non-JSON error responses', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '123' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => { throw new Error('Not JSON'); },
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Server error occurred. Please contact your system administrator.'
        );
      });

      it('should handle SMTP-specific error message', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const payload = btoa(JSON.stringify({ user_id: '456' }));
        const mockToken = `${header}.${payload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            message: 'SMTP authentication failed'
          }),
        });

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Email service is temporarily unavailable'
        );
      });

      it('should handle token with only 2 parts (invalid format)', async () => {
        // JWT should have 3 parts: header.payload.signature
        const invalidToken = 'header.payload';
        mockLocalStorage.setItem('uidam_admin_token', invalidToken);

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Failed to extract user ID from authentication token'
        );
      });

      it('should handle token with more than 3 parts', async () => {
        const invalidToken = 'part1.part2.part3.part4';
        mockLocalStorage.setItem('uidam_admin_token', invalidToken);

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Failed to extract user ID from authentication token'
        );
      });

      it('should handle token with malformed base64 payload', async () => {
        const mockToken = 'valid-header.invalid-base64!@#$.valid-signature';
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Failed to extract user ID from authentication token'
        );
      });

      it('should handle token with invalid JSON in payload', async () => {
        const header = btoa(JSON.stringify({ alg: 'HS256' }));
        const invalidPayload = btoa('{ invalid json }');
        const mockToken = `${header}.${invalidPayload}.signature`;
        mockLocalStorage.setItem('uidam_admin_token', mockToken);

        await expect(UserService.requestPasswordReset()).rejects.toThrow(
          'Failed to extract user ID from authentication token'
        );
      });
    });
  });
});
