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
import { SessionsResponse } from '@/types';

jest.mock('@config/runtimeConfig', () => ({
  getConfig: jest.fn().mockReturnValue({ REACT_APP_SESSION_API_PREFIX: '/sdp' }),
}));

jest.mock('@config/app.config', () => ({
  API_CONFIG: {
    AUTH_SERVER_URL: 'https://localhost:9443',
    API_TIMEOUT: 30000,
  },
  OAUTH_CONFIG: {
    TOKEN_STORAGE_KEY: 'uidam_admin_token',
    REFRESH_TOKEN_STORAGE_KEY: 'uidam_admin_refresh_token',
  },
}));

import { SessionService } from './sessionService';

const BASE_URL = 'https://localhost:9443'; // Service always uses full auth server URL directly
const SELF_TOKENS_PATH = '/sdp/self/tokens';
const ADMIN_TOKENS_PATH = '/sdp/admin/tokens';
const MOCK_TOKEN = 'mock-bearer-token';

// Set up global fetch mock at module level (same pattern as userService.test.ts)
global.fetch = jest.fn();

// Mock localStorage using the same closure pattern as userService.test.ts
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, configurable: true });

// Raw API shapes (what the backend actually returns)
const mockRawSelfResponse = {
  status: 'success',
  data: {
    tokens: [
      {
        id: 'session-1',
        clientName: 'uidam-portal',
        accessTokenIssuedAt: '2026-02-19T10:00:00Z',
        accessTokenExpiresAt: '2026-02-19T11:00:00Z',
        deviceInfo: 'Chrome on Windows',
        isCurrentSession: true,
      },
    ],
    totalTokens: 1,
  },
};

const mockRawAdminResponse = {
  status: 'success',
  data: {
    tokens: [
      {
        id: 'session-2',
        clientName: 'uidam-portal',
        accessTokenIssuedAt: '2026-02-20T08:00:00Z',
        accessTokenExpiresAt: '2026-02-20T09:00:00Z',
        deviceInfo: 'Firefox on Linux',
        isCurrentSession: false,
      },
    ],
    totalTokens: 1,
  },
};

// Mapped shapes (what SessionService returns after transformation)
const mockSelfSessionsResponse: SessionsResponse = {
  sessions: [
    {
      sessionId: 'session-1',
      deviceInfo: 'Chrome on Windows',
      loginTime: '2026-02-19T10:00:00Z',
      lastActivity: '2026-02-19T11:00:00Z',
      isCurrent: true,
      ipAddress: undefined,
      browser: undefined,
      os: undefined,
      location: undefined,
      userAgent: undefined,
    },
  ],
  totalCount: 1,
};

const mockAdminSessionsResponse: SessionsResponse = {
  sessions: [
    {
      sessionId: 'session-2',
      deviceInfo: 'Firefox on Linux',
      loginTime: '2026-02-20T08:00:00Z',
      lastActivity: '2026-02-20T09:00:00Z',
      isCurrent: false,
      ipAddress: undefined,
      browser: undefined,
      os: undefined,
      location: undefined,
      userAgent: undefined,
    },
  ],
  totalCount: 1,
};

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.setItem('uidam_admin_token', MOCK_TOKEN);
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('getActiveSessions', () => {
    it('should fetch and map active sessions for current user successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawSelfResponse,
      });

      const result = await SessionService.getActiveSessions();

      expect(global.fetch).toHaveBeenCalledWith(
        `${BASE_URL}${SELF_TOKENS_PATH}/active`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        })
      );
      expect(result).toEqual(mockSelfSessionsResponse);
    });

    it('should map token id to sessionId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawSelfResponse,
      });
      const result = await SessionService.getActiveSessions();
      expect(result.sessions[0].sessionId).toBe('session-1');
    });

    it('should map isCurrentSession to isCurrent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawSelfResponse,
      });
      const result = await SessionService.getActiveSessions();
      expect(result.sessions[0].isCurrent).toBe(true);
    });

    it('should map accessTokenIssuedAt to loginTime', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawSelfResponse,
      });
      const result = await SessionService.getActiveSessions();
      expect(result.sessions[0].loginTime).toBe('2026-02-19T10:00:00Z');
    });

    it('should map accessTokenExpiresAt to lastActivity', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawSelfResponse,
      });
      const result = await SessionService.getActiveSessions();
      expect(result.sessions[0].lastActivity).toBe('2026-02-19T11:00:00Z');
    });

    it('should map totalTokens to totalCount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawSelfResponse,
      });
      const result = await SessionService.getActiveSessions();
      expect(result.totalCount).toBe(1);
    });

    it('should return empty sessions when data.tokens is missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'success', data: {} }),
      });
      const result = await SessionService.getActiveSessions();
      expect(result.sessions).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle errors when fetching sessions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(SessionService.getActiveSessions()).rejects.toThrow('Session API error 500');
    });
  });

  describe('terminateSessions', () => {
    it('should invalidate specified token IDs for current user', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
      });

      await SessionService.terminateSessions(['token-1', 'token-2']);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BASE_URL}${SELF_TOKENS_PATH}/invalidate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ tokenIds: ['token-1', 'token-2'] }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        })
      );
    });

    it('should handle errors when terminating sessions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Termination failed',
      });

      await expect(SessionService.terminateSessions(['token-1'])).rejects.toThrow('Session API error 400');
    });
  });

  describe('getAdminActiveSessions', () => {
    it('should fetch and map active sessions for a specific user (admin)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRawAdminResponse,
      });

      const result = await SessionService.getAdminActiveSessions('testuser');

      expect(global.fetch).toHaveBeenCalledWith(
        `${BASE_URL}${ADMIN_TOKENS_PATH}/active`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser' }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        })
      );
      expect(result).toEqual(mockAdminSessionsResponse);
    });

    it('should handle errors when fetching admin sessions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Admin fetch failed',
      });

      await expect(SessionService.getAdminActiveSessions('testuser')).rejects.toThrow('Session API error 403');
    });
  });

  describe('terminateAdminSessions', () => {
    it('should invalidate specified token IDs for a given user (admin)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
      });

      await SessionService.terminateAdminSessions('testuser', ['token-3', 'token-4']);

      expect(global.fetch).toHaveBeenCalledWith(
        `${BASE_URL}${ADMIN_TOKENS_PATH}/invalidate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', tokenIds: ['token-3', 'token-4'] }),
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_TOKEN}`,
          }),
        })
      );
    });

    it('should handle errors when terminating admin sessions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Admin termination failed',
      });

      await expect(SessionService.terminateAdminSessions('testuser', ['token-3'])).rejects.toThrow('Session API error 403');
    });
  });
});
