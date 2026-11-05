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
import { AuthService, TokenResponse } from './auth.service';
import { API_CONFIG } from '@config/app.config';

const createTestToken = (claims: Record<string, unknown>): string => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(claims)}.sig`;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the config
jest.mock('@config/app.config', () => ({
  OAUTH_CONFIG: {
    CLIENT_ID: 'test-client',
    CLIENT_SECRET: 'test-secret',
    REDIRECT_URI: 'http://localhost:3000/callback',
    SCOPES: ['openid', 'profile'],
    USE_PKCE: true,
    TOKEN_STORAGE_KEY: 'uidam_access_token',
    REFRESH_TOKEN_STORAGE_KEY: 'uidam_refresh_token',
  },
  API_CONFIG: {
    AUTH_SERVER_URL: 'http://auth.example.com',
    SESSION_API_PREFIX: '',
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockFetch: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    authService = new AuthService();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Clear storage
    sessionStorage.clear();
    localStorage.clear();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('initiateLogin', () => {
    it('should redirect to authorization URL with PKCE', async () => {
      await authService.initiateLogin();

      expect(window.location.href).toContain('http://auth.example.com/oauth2/authorize');
      expect(window.location.href).toContain('response_type=code');
      expect(window.location.href).toContain('client_id=test-client');
      expect(window.location.href).toContain('redirect_uri=');
      expect(window.location.href).toContain('scope=');
      expect(window.location.href).toContain('state=');
      expect(window.location.href).toContain('code_challenge=');
      expect(window.location.href).toContain('code_challenge_method=S256');
    });

    it('should store state in sessionStorage and localStorage', async () => {
      await authService.initiateLogin();

      const sessionState = sessionStorage.getItem('oauth_state');
      const localState = localStorage.getItem('oauth_state');
      
      expect(sessionState).toBeTruthy();
      expect(localState).toBeTruthy();
      expect(sessionState).toBe(localState);
    });

    it('should store PKCE code verifier in sessionStorage', async () => {
      await authService.initiateLogin();

      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      expect(codeVerifier).toBeTruthy();
    });

    it('should store debug info in localStorage', async () => {
      await authService.initiateLogin();

      const debugInfo = localStorage.getItem('oauth_state_debug');
      expect(debugInfo).toBeTruthy();
      
      const parsed = JSON.parse(debugInfo!);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('url');
    });
  });

  describe('handleAuthCallback', () => {
    const mockCode = 'test-auth-code';
    const mockState = 'test-state';
    const mockTokenResponse: TokenResponse = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'openid profile',
    };

    beforeEach(() => {
      sessionStorage.setItem('oauth_state', mockState);
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');
    });

    it('should successfully handle auth callback', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            active: true,
            sub: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            given_name: 'Test',
            family_name: 'User',
            roles: ['ADMIN'],
            scope: 'openid profile',
          }),
        });

      const result = await authService.handleAuthCallback(mockCode, mockState);

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('userName');
      expect(result.user).toHaveProperty('email');
      expect(result.tokens).toHaveProperty('accessToken', 'test-access-token');
      expect(result.tokens).toHaveProperty('refreshToken', 'test-refresh-token');
    });

    it('should throw error if state does not match', async () => {
      await expect(
        authService.handleAuthCallback(mockCode, 'wrong-state')
      ).rejects.toThrow('State mismatch');
    });

    it('should clear stored state after successful callback', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, mockState);

      expect(sessionStorage.getItem('oauth_state')).toBeNull();
      expect(localStorage.getItem('oauth_state')).toBeNull();
    });

    it('should store tokens in localStorage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, mockState);

      expect(localStorage.getItem('uidam_access_token')).toBe('test-access-token');
      expect(localStorage.getItem('uidam_refresh_token')).toBe('test-refresh-token');
    });

    it('should handle token exchange failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: 'invalid_grant', error_description: 'Code expired' }),
        headers: new Map(),
      });

      await expect(
        authService.handleAuthCallback(mockCode, mockState)
      ).rejects.toThrow('Authentication failed');
    });

    it('should use fallback user profile if introspection fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const result = await authService.handleAuthCallback(mockCode, mockState);

      // Fallback uses JWT-decoded values; test token has no valid JWT payload so returns empty strings
      expect(result.user).toBeDefined();
      expect(typeof result.user.userName).toBe('string');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse: TokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await authService.refreshToken('old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockFetch).toHaveBeenCalledWith(
        '/oauth2/token',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error if refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow('Token refresh failed');
    });
  });

  describe('logout', () => {
    it('should call OAuth2 logout endpoint with access token and clear storage', async () => {
      localStorage.setItem('uidam_access_token', 'test-access-token');
      localStorage.setItem('uidam_refresh_token', 'test-refresh');

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://auth.example.com/oauth2/logout?access_token='),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Verify form data contains required parameters
      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;
      
      expect(formData.get('id_token_hint')).toBe('Bearer test-access-token');
      expect(formData.get('client_id')).toBe('test-client');
      expect(formData.get('post_logout_redirect_uri')).toBeTruthy();
      expect(formData.get('state')).toBeTruthy();

      // Verify storage cleared
      expect(localStorage.getItem('uidam_access_token')).toBeNull();
      expect(localStorage.getItem('uidam_refresh_token')).toBeNull();
    });

    it('should use custom post_logout_redirect_uri when provided', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({ ok: true });

      const customUri = 'http://localhost:3000/custom-logout';
      await authService.logout(customUri);

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;

      expect(formData.get('post_logout_redirect_uri')).toBe(customUri);
    });

    it('should clear storage even if logout request fails', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');
      localStorage.setItem('uidam_refresh_token', 'test-refresh');

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await authService.logout();

      // Storage should still be cleared
      expect(localStorage.getItem('uidam_access_token')).toBeNull();
      expect(localStorage.getItem('uidam_refresh_token')).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Logout request failed:',
        expect.any(Error)
      );
    });

    it('should not call logout endpoint if no token exists', async () => {
      await authService.logout();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(localStorage.getItem('uidam_access_token')).toBeNull();
    });

    it('should clear pkce_code_verifier from sessionStorage on logout', async () => {
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');
      localStorage.setItem('uidam_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      expect(sessionStorage.getItem('pkce_code_verifier')).toBeNull();
    });

    it('should log logout details to console', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Initiating OAuth2 logout:',
        expect.objectContaining({
          client_id: 'test-client',
          state: expect.any(String),
        })
      );
    });

    it('should handle logout with 302 redirect status', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');

      // Mock 302 response (redirect)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: new Headers({
          Location: 'http://localhost:3000/login',
        }),
      });

      await authService.logout();

      // Should still clear storage
      expect(localStorage.getItem('uidam_access_token')).toBeNull();
    });
  });

  describe('getUserProfile - additional edge cases', () => {
    it.each(['', '/ecsp', '/sdp'])(
      'should introspect against the auth server with tenant prefix "%s"',
      async (prefix) => {
        const authUrl = jest.replaceProperty(API_CONFIG, 'AUTH_SERVER_URL', 'https://auth.example.com:9443');
        const tenantPrefix = jest.replaceProperty(API_CONFIG, 'SESSION_API_PREFIX', prefix);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'test-user' }),
        });

        try {
          const profile = await (authService as any).getUserProfile('test-token');

          expect(mockFetch).toHaveBeenCalledTimes(1);
          expect(mockFetch).toHaveBeenCalledWith(
            `https://auth.example.com:9443${prefix}/oauth2/introspect`,
            {
              method: 'POST',
              headers: {
                Authorization: expect.any(String),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ token: 'test-token' }),
            }
          );
          expect(profile.id).toBe('test-user');
        } finally {
          authUrl.restore();
          tenantPrefix.restore();
        }
      }
    );

    it('should use username fallback for email if email missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          username: 'testuser',
          // email missing
        }),
      });

      const user = await (authService as any).getUserProfile('test-token');
      
      // No email construction — empty string when email is absent
      expect(user.email).toBe('');
      expect(user.userName).toBe('testuser');
    });

    it('should use sub for userId if username missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          sub: 'subject123',
          // username missing
        }),
      });

      const user = await (authService as any).getUserProfile('test-token');
      
      expect(user.id).toBe('subject123');
      expect(user.userName).toBe('subject123');
    });

    it('should use user scopes from the JWT instead of client scopes from introspection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          sub: 'user1',
          scope: 'read write admin',
        }),
      });

      const user = await (authService as any).getUserProfile(
        createTestToken({ scope: 'read write admin', scopes: ['ViewUsers', 'SelfManage'] })
      );
      
      expect(user.scopes).toEqual(['ViewUsers', 'SelfManage']);
    });

    it('should use default accounts array if accounts missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          sub: 'user1',
          username: 'testuser',
          // accounts missing
        }),
      });

      const user = await (authService as any).getUserProfile('test-token');
      
      expect(user.accounts).toEqual(['default-account']);
    });
  });

  describe('Token Management', () => {
    it('should get stored token', () => {
      localStorage.setItem('uidam_access_token', 'test-token');
      
      const token = authService.getStoredToken();
      
      expect(token).toBe('test-token');
    });

    it('should get stored refresh token', () => {
      localStorage.setItem('uidam_refresh_token', 'refresh-token');
      
      const token = authService.getStoredRefreshToken();
      
      expect(token).toBe('refresh-token');
    });

    it('should get stored scopes', () => {
      localStorage.setItem('uidam_token_scopes', 'openid profile email');
      
      const scopes = authService.getStoredScopes();
      
      expect(scopes).toEqual(['openid', 'profile', 'email']);
    });

    it('should return no scopes if none stored', () => {
      const scopes = authService.getStoredScopes();
      
      expect(scopes).toEqual([]);
    });

    it('should check if token is expired', () => {
      const futureTime = Date.now() + 10000;
      localStorage.setItem('uidam_token_expires_at', futureTime.toString());
      
      expect(authService.isTokenExpired()).toBe(false);
    });

    it('should return true if token expiration time has passed', () => {
      const pastTime = Date.now() - 10000;
      localStorage.setItem('uidam_token_expires_at', pastTime.toString());
      
      expect(authService.isTokenExpired()).toBe(true);
    });

    it('should return true if no expiration time stored', () => {
      expect(authService.isTokenExpired()).toBe(true);
    });

    it('should check if user is authenticated', () => {
      const futureTime = Date.now() + 10000;
      localStorage.setItem('uidam_access_token', 'test-token');
      localStorage.setItem('uidam_token_expires_at', futureTime.toString());
      
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false if no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false if token is expired', () => {
      const pastTime = Date.now() - 10000;
      localStorage.setItem('uidam_access_token', 'test-token');
      localStorage.setItem('uidam_token_expires_at', pastTime.toString());
      
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should clear all stored tokens', () => {
      localStorage.setItem('uidam_access_token', 'token');
      localStorage.setItem('uidam_refresh_token', 'refresh');
      localStorage.setItem('uidam_token_expires_at', '12345');
      localStorage.setItem('uidam_token_scopes', 'openid');
      localStorage.setItem('uidam_user_profile', '{}');
      
      authService.clearStoredTokens();
      
      expect(localStorage.getItem('uidam_access_token')).toBeNull();
      expect(localStorage.getItem('uidam_refresh_token')).toBeNull();
      expect(localStorage.getItem('uidam_token_expires_at')).toBeNull();
      expect(localStorage.getItem('uidam_token_scopes')).toBeNull();
      expect(localStorage.getItem('uidam_user_profile')).toBeNull();
    });
  });

  describe('initiateLogin - without PKCE', () => {
    beforeEach(() => {
      // Override config to disable PKCE
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OAUTH_CONFIG } = require('@config/app.config');
      OAUTH_CONFIG.USE_PKCE = false;
    });

    afterEach(() => {
      // Reset PKCE back to true
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OAUTH_CONFIG } = require('@config/app.config');
      OAUTH_CONFIG.USE_PKCE = true;
    });

    it('should redirect to authorization URL without PKCE parameters', async () => {
      await authService.initiateLogin();

      expect(window.location.href).toContain('http://auth.example.com/oauth2/authorize');
      expect(window.location.href).toContain('response_type=code');
      expect(window.location.href).toContain('client_id=test-client');
      expect(window.location.href).not.toContain('code_challenge=');
      expect(window.location.href).not.toContain('code_challenge_method=');
    });

    it('should not store code verifier when PKCE is disabled', async () => {
      await authService.initiateLogin();

      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      expect(codeVerifier).toBeNull();
    });

    it('should log legacy flow message when PKCE disabled', async () => {
      await authService.initiateLogin();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initiating OAuth2 login (legacy flow)'),
        expect.any(Object)
      );
    });
  });

  describe('initiateLogin - error handling', () => {
    it('should handle errors during code challenge generation', async () => {
      // Mock crypto to throw an error
      const originalGetRandomValues = global.crypto.getRandomValues;
      jest.spyOn(global.crypto, 'getRandomValues').mockImplementation(() => {
        throw new Error('Crypto API unavailable');
      });

      await expect(authService.initiateLogin()).rejects.toThrow('Failed to initiate OAuth login');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initiate login:', expect.any(Error));

      // Restore original function
      global.crypto.getRandomValues = originalGetRandomValues;
    });
  });

  describe('handleAuthCallback - state validation edge cases', () => {
    const mockCode = 'test-auth-code';
    const mockTokenResponse: TokenResponse = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'openid profile',
    };

    it('should continue with warning when no state is stored', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      // No state stored - should warn but continue
      const result = await authService.handleAuthCallback(mockCode, 'some-state');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No stored state found, but continuing for debugging...'
      );
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should use localStorage state if sessionStorage is empty', async () => {
      const state = 'test-state-local';
      localStorage.setItem('oauth_state', state);
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      const result = await authService.handleAuthCallback(mockCode, state);

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should log detailed debug info during state verification', async () => {
      const state = 'test-state';
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');
      localStorage.setItem('oauth_state_debug', JSON.stringify({ timestamp: '2023-01-01', url: 'http://test.com' }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, state);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'State verification - detailed debug:',
        expect.objectContaining({
          receivedState: state,
          storedInSession: state,
        })
      );
    });

    it('should remove pkce_code_verifier from sessionStorage after successful exchange', async () => {
      const state = 'test-state';
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, state);

      expect(sessionStorage.getItem('pkce_code_verifier')).toBeNull();
    });

    it('should remove oauth_state_debug after successful callback', async () => {
      const state = 'test-state';
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');
      localStorage.setItem('oauth_state_debug', '{"test": "data"}');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, state);

      expect(localStorage.getItem('oauth_state_debug')).toBeNull();
    });
  });

  describe('exchangeCodeForTokens - PKCE flow', () => {
    const mockCode = 'test-code';
    const mockState = 'test-state';

    it('should include code_verifier when PKCE is enabled and verifier exists', async () => {
      sessionStorage.setItem('oauth_state', mockState);
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openid',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, mockState);

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;
      
      expect(formData.get('code_verifier')).toBe('test-verifier');
      expect(formData.get('client_secret')).toBe('test-secret');
    });

    it('should fallback to client_secret when code_verifier is missing', async () => {
      sessionStorage.setItem('oauth_state', mockState);
      // No code verifier stored

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openid',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ active: true, sub: 'user123' }),
        });

      await authService.handleAuthCallback(mockCode, mockState);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'PKCE enabled but code verifier not found, falling back to client_secret'
      );

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;
      
      expect(formData.get('code_verifier')).toBeNull();
      expect(formData.get('client_secret')).toBe('test-secret');
    });
  });

  describe('exchangeCodeForTokens - error responses', () => {
    const mockCode = 'test-code';
    const mockState = 'test-state';

    it('should handle token exchange with error JSON response', async () => {
      sessionStorage.setItem('oauth_state', mockState);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Authorization code has expired'
        }),
        headers: new Headers(),
      });

      await expect(
        authService.handleAuthCallback(mockCode, mockState)
      ).rejects.toThrow('Authentication failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Parsed token exchange error:',
        expect.objectContaining({
          error: 'invalid_grant',
          error_description: 'Authorization code has expired'
        })
      );
    });

    it('should handle token exchange with non-JSON error response', async () => {
      sessionStorage.setItem('oauth_state', mockState);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server is down',
        headers: new Headers(),
      });

      await expect(
        authService.handleAuthCallback(mockCode, mockState)
      ).rejects.toThrow('Authentication failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Could not parse error response:',
        expect.any(Error)
      );
    });

    it('should handle token exchange with error object (no description)', async () => {
      sessionStorage.setItem('oauth_state', mockState);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ error: 'unauthorized' }),
        headers: new Headers(),
      });

      await expect(
        authService.handleAuthCallback(mockCode, mockState)
      ).rejects.toThrow('Authentication failed');
    });

    it('should log detailed error information on token exchange failure', async () => {
      sessionStorage.setItem('oauth_state', mockState);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
        headers: new Headers({ 'content-type': 'text/plain' }),
      });

      await expect(
        authService.handleAuthCallback(mockCode, mockState)
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Token exchange failed - Full details:',
        expect.objectContaining({
          status: 403,
          statusText: 'Forbidden',
        })
      );
    });
  });

  describe('getUserProfile - comprehensive coverage', () => {
    it.each(['active', 'inactive', 'network-error'])(
      'should retain only user scopes when introspection is %s',
      async (status) => {
        const accessToken = createTestToken({
          scope: 'ManageUsers ManageAccounts',
          scopes: ['ViewUsers', 'SelfManage'],
        });
        if (status === 'network-error') {
          mockFetch.mockRejectedValueOnce(new Error('Network error'));
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              active: status === 'active',
              scope: 'ManageUsers ManageAccounts',
            }),
          });
        }

        const profile = await (authService as any).getUserProfile(accessToken);

        expect(profile.scopes).toEqual(['ViewUsers', 'SelfManage']);
      }
    );

    it.each([
      { name: 'missing', scopes: undefined },
      { name: 'empty', scopes: [] },
      { name: 'malformed', scopes: 'ManageUsers' },
    ])('should grant no profile scopes for a $name user claim', async ({ scopes }) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, scope: 'ManageUsers ManageAccounts' }),
      });

      const profile = await (authService as any).getUserProfile(
        createTestToken({ scope: 'ManageUsers ManageAccounts', scopes })
      );

      expect(profile.scopes).toEqual([]);
    });

    it('should handle introspection response with all fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          sub: 'user-sub-123',
          username: 'testuser',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          roles: ['ADMIN', 'USER'],
          scope: 'openid profile email',
          accounts: ['account1', 'account2'],
        }),
      });

      const profile = await (authService as any).getUserProfile(
        createTestToken({ scopes: ['openid', 'profile', 'email'] })
      );

      expect(profile).toEqual({
        id: 'user-sub-123',
        userName: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['ADMIN', 'USER'],
        scopes: ['openid', 'profile', 'email'],
        accounts: ['account1', 'account2'],
      });
    });

    it('should handle inactive token in introspection response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: false,
          sub: 'user123',
        }),
      });

      const profile = await (authService as any).getUserProfile('test-token');

      // Inactive token → fallback uses JWT claims; test token is not a real JWT so empty strings
      expect(profile).toBeDefined();
      expect(typeof profile.userName).toBe('string');
    });

    it('should handle network errors during introspection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const profile = await (authService as any).getUserProfile('test-token');

      // Falls back to JWT-decoded values; test token is not real JWT so empty strings
      expect(profile).toBeDefined();
      expect(typeof profile.userName).toBe('string');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not fetch user profile from introspection:',
        expect.any(Error)
      );
    });

    it('should use default values for missing optional fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          sub: 'minimal-user',
          // All other fields missing
        }),
      });

      const profile = await (authService as any).getUserProfile('test-token');

      expect(profile).toEqual({
        id: 'minimal-user',
        userName: 'minimal-user',
        email: '',          // No email in introspection or JWT → empty string
        firstName: '',      // No given_name → empty string
        lastName: '',       // No family_name → empty string
        roles: ['ADMIN'],
        scopes: expect.any(Array),
        accounts: ['default-account'],
      });
    });

    it('should use empty email when email missing from introspection and JWT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active: true,
          sub: 'user1',
          username: 'johndoe',
        }),
      });

      const profile = await (authService as any).getUserProfile('test-token');

      // Email not constructed from username — remains empty when not present
      expect(profile.email).toBe('');
      expect(profile.userName).toBe('johndoe');
    });
  });

  describe('decodeJwtPayload', () => {
    it('should decode a valid JWT payload', () => {
      // Build a minimal JWT: header.payload.signature (payload is base64url-encoded JSON)
      const payload = { sub: 'user1', username: 'john', email: 'john@example.com' };
      const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const fakeJwt = `header.${encoded}.signature`;

      const claims = (authService as any).decodeJwtPayload(fakeJwt);

      expect(claims.sub).toBe('user1');
      expect(claims.username).toBe('john');
      expect(claims.email).toBe('john@example.com');
    });

    it('should return empty object for non-JWT string', () => {
      const claims = (authService as any).decodeJwtPayload('not-a-jwt');
      expect(claims).toEqual({});
    });

    it('should return empty object for malformed JWT payload', () => {
      const claims = (authService as any).decodeJwtPayload('header.!!!invalid!!!.signature');
      expect(claims).toEqual({});
    });

    it('should use JWT claims as baseline when introspection returns partial data', async () => {
      const payload = { sub: 'jwt-user', username: 'jwtname', email: 'jwt@example.com', given_name: 'JWT', family_name: 'Token' };
      const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const fakeJwt = `header.${encoded}.signature`;

      // Introspection returns active but no name fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ active: true, sub: 'jwt-user', username: 'jwtname' }),
      });

      const profile = await (authService as any).getUserProfile(fakeJwt);

      // JWT baseline fills in missing fields from introspection
      expect(profile.email).toBe('jwt@example.com');
      expect(profile.firstName).toBe('JWT');
      expect(profile.lastName).toBe('Token');
    });

    it('should use JWT fallback when introspection fails', async () => {
      const payload = { sub: 'fallback-user', username: 'fbuser', email: 'fb@example.com' };
      const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const fakeJwt = `header.${encoded}.signature`;

      mockFetch.mockRejectedValueOnce(new Error('Network down'));

      const profile = await (authService as any).getUserProfile(fakeJwt);

      expect(profile.id).toBe('fallback-user');
      expect(profile.userName).toBe('fbuser');
      expect(profile.email).toBe('fb@example.com');
    });
  });

  describe('refreshToken - comprehensive coverage', () => {
    it('should include client_secret in refresh request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid',
        }),
      });

      await authService.refreshToken('old-refresh-token');

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;

      expect(formData.get('grant_type')).toBe('refresh_token');
      expect(formData.get('refresh_token')).toBe('old-refresh-token');
      expect(formData.get('client_id')).toBe('test-client');
      expect(formData.get('client_secret')).toBe('test-secret');
    });

    it('should store new tokens after refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'refreshed-token',
          refresh_token: 'refreshed-refresh',
          expires_in: 7200,
          token_type: 'Bearer',
          scope: 'openid profile',
        }),
      });

      await authService.refreshToken('old-token');

      expect(localStorage.getItem('uidam_access_token')).toBe('refreshed-token');
      expect(localStorage.getItem('uidam_refresh_token')).toBe('refreshed-refresh');
    });

    it('should handle refresh without client_secret', async () => {
      // Temporarily remove client secret
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OAUTH_CONFIG } = require('@config/app.config');
      const originalSecret = OAUTH_CONFIG.CLIENT_SECRET;
      OAUTH_CONFIG.CLIENT_SECRET = undefined;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid',
        }),
      });

      await authService.refreshToken('refresh-token');

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;

      expect(formData.get('client_secret')).toBeNull();

      // Restore client secret
      OAUTH_CONFIG.CLIENT_SECRET = originalSecret;
    });
  });

  describe('logout - comprehensive coverage', () => {
    it('should include all required OAuth2 logout parameters', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      const callArgs = mockFetch.mock.calls[0];
      const endpoint = callArgs[0];
      const formData = callArgs[1].body as URLSearchParams;

      // Verify endpoint has access_token query parameter
      expect(endpoint).toContain('access_token=test-token');

      // Verify POST body parameters
      expect(formData.get('id_token_hint')).toBe('Bearer test-token');
      expect(formData.get('client_id')).toBe('test-client');
      expect(formData.get('post_logout_redirect_uri')).toBeTruthy();
      expect(formData.get('state')).toBeTruthy();
    });

    it('should generate unique state for each logout request', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');

      mockFetch.mockResolvedValue({ ok: true });

      await authService.logout();
      const state1 = (mockFetch.mock.calls[0][1].body as URLSearchParams).get('state');

      mockFetch.mockClear();
      localStorage.setItem('uidam_access_token', 'test-token');

      await authService.logout();
      const state2 = (mockFetch.mock.calls[0][1].body as URLSearchParams).get('state');

      expect(state1).not.toBe(state2);
    });

    it('should clear all token-related items from storage', async () => {
      // Setup storage with multiple items
      localStorage.setItem('uidam_access_token', 'test-token');
      localStorage.setItem('uidam_refresh_token', 'test-refresh');
      localStorage.setItem('uidam_token_expires_at', '123456789');
      localStorage.setItem('uidam_token_scopes', 'openid profile');
      localStorage.setItem('uidam_user_profile', JSON.stringify({ id: '1' }));
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      expect(localStorage.getItem('uidam_access_token')).toBeNull();
      expect(localStorage.getItem('uidam_refresh_token')).toBeNull();
      expect(localStorage.getItem('uidam_token_expires_at')).toBeNull();
      expect(localStorage.getItem('uidam_token_scopes')).toBeNull();
      expect(localStorage.getItem('uidam_user_profile')).toBeNull();
      expect(sessionStorage.getItem('pkce_code_verifier')).toBeNull();
    });

    it('should use POST_LOGOUT_REDIRECT_URI from config', async () => {
      localStorage.setItem('uidam_access_token', 'test-token');

      // Mock the config to have POST_LOGOUT_REDIRECT_URI
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OAUTH_CONFIG } = require('@config/app.config');
      OAUTH_CONFIG.POST_LOGOUT_REDIRECT_URI = 'http://localhost:3000/logout-success';

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      const callArgs = mockFetch.mock.calls[0];
      const formData = callArgs[1].body as URLSearchParams;

      expect(formData.get('post_logout_redirect_uri')).toBe('http://localhost:3000/logout-success');
    });

    it('should construct correct logout URL with encoded access token', async () => {
      const tokenWithSpecialChars = 'test-token+/=';
      localStorage.setItem('uidam_access_token', tokenWithSpecialChars);

      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      const endpoint = mockFetch.mock.calls[0][0];
      
      expect(endpoint).toContain('http://auth.example.com/oauth2/logout');
      expect(endpoint).toContain('access_token=');
      // URL encoded version should be present
      expect(endpoint).toContain(encodeURIComponent(tokenWithSpecialChars));
    });
  });

  describe('storeTokens - comprehensive coverage', () => {
    it.each([
      { name: 'missing', scopes: undefined },
      { name: 'empty', scopes: [] },
      { name: 'null', scopes: null },
      { name: 'string', scopes: 'ManageUsers' },
      { name: 'object', scopes: { ManageUsers: true } },
      { name: 'mixed array', scopes: ['ViewUsers', 42] },
      { name: 'blank scope', scopes: [''] },
      { name: 'whitespace scope', scopes: ['ViewUsers ManageUsers'] },
    ])('should fail closed for a $name user scopes claim', ({ scopes }) => {
      localStorage.setItem('uidam_token_scopes', 'ManageUsers ManageAccounts');

      (authService as any).storeTokens({
        access_token: createTestToken({ scope: 'ManageUsers ManageAccounts', scopes }),
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'ManageUsers ManageAccounts',
      });

      expect(localStorage.getItem('uidam_token_scopes')).toBe('');
      expect(authService.getStoredScopes()).toEqual([]);
      if (!Array.isArray(scopes) || scopes.length > 0) {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Missing or invalid user scopes claim; no permissions granted.'
        );
      }
    });

    it('should discard client scopes for an undecodable access token', () => {
      (authService as any).storeTokens({
        access_token: 'invalid-token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'ManageUsers ManageAccounts',
      });

      expect(authService.getStoredScopes()).toEqual([]);
    });

    it('should clear previous permissions when a refreshed token has no user scopes', async () => {
      localStorage.setItem('uidam_token_scopes', 'ViewUsers ManageUsers');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: createTestToken({ scope: 'ManageUsers ManageAccounts' }),
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'ManageUsers ManageAccounts',
        }),
      });

      await authService.refreshToken('refresh');

      expect(localStorage.getItem('uidam_token_scopes')).toBe('');
      expect(authService.getStoredScopes()).toEqual([]);
    });

    it('should store token with scope and expiration', () => {
      const tokenResponse: TokenResponse = {
        access_token: createTestToken({ scopes: ['openid', 'profile', 'email'] }),
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      (authService as any).storeTokens(tokenResponse);

      expect(localStorage.getItem('uidam_access_token')).toBe(tokenResponse.access_token);
      expect(localStorage.getItem('uidam_refresh_token')).toBe('refresh');
      expect(localStorage.getItem('uidam_token_scopes')).toBe('openid profile email');
      
      const expiresAt = localStorage.getItem('uidam_token_expires_at');
      expect(expiresAt).toBeTruthy();
      expect(parseInt(expiresAt!)).toBeGreaterThan(Date.now());
    });

    it('should prefer the user scopes claim over client scope claim and token response scope', () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const accessToken = `${b64({ alg: 'none' })}.${b64({
        scope: 'UIDAMSystem ViewUsers ManageUsers ManageUserRolesAndPermissions',
        scopes: ['ViewUsers', 'SelfManage'],
      })}.sig`;

      (authService as any).storeTokens({
        access_token: accessToken,
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'UIDAMSystem ViewUsers ManageUsers ManageUserRolesAndPermissions',
      });

      expect(localStorage.getItem('uidam_token_scopes')).toBe('ViewUsers SelfManage');
      expect(authService.getStoredScopes()).not.toContain('ManageUsers');
    });

    it('should store empty scopes if scope not in token response', () => {
      const tokenResponse: TokenResponse = {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '',
      };

      (authService as any).storeTokens(tokenResponse);

      expect(localStorage.getItem('uidam_token_scopes')).toBe('');
    });
  });

  describe('storeUserProfile', () => {
    it('should store user profile as JSON', () => {
      const profile = {
        id: '1',
        userName: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['ADMIN'],
        scopes: ['openid'],
        accounts: ['account1'],
      };

      (authService as any).storeUserProfile(profile);

      const stored = localStorage.getItem('uidam_user_profile');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(profile);
    });
  });

  describe('PKCE helper methods', () => {
    it('should generate code verifier with correct format', () => {
      const verifier = (authService as any).generateCodeVerifier();

      expect(verifier).toBeTruthy();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(40);
      // Should be base64 URL encoded (no +, /, =)
      expect(verifier).not.toMatch(/[+/=]/);
    });

    it('should generate code challenge from verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge = await (authService as any).generateCodeChallenge(verifier);

      expect(challenge).toBeTruthy();
      expect(typeof challenge).toBe('string');
      // Should be base64 URL encoded
      expect(challenge).not.toMatch(/[+/=]/);
    });

    it('should base64 URL encode correctly', () => {
      const input = new Uint8Array([255, 254, 253]);
      const encoded = (authService as any).base64URLEncode(input);

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      expect(encoded).not.toMatch(/[+/=]/);
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle very long token expiration time', () => {
      const veryFutureTime = Date.now() + 999999999999;
      localStorage.setItem('uidam_token_expires_at', veryFutureTime.toString());
      localStorage.setItem('uidam_access_token', 'token');

      expect(authService.isTokenExpired()).toBe(false);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should handle token expiration at exact boundary', () => {
      const now = Date.now();
      localStorage.setItem('uidam_token_expires_at', now.toString());
      localStorage.setItem('uidam_access_token', 'token');

      expect(authService.isTokenExpired()).toBe(true);
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should handle invalid expiration time string', () => {
      localStorage.setItem('uidam_token_expires_at', 'invalid');
      localStorage.setItem('uidam_access_token', 'token');

      // parseInt('invalid') returns NaN, NaN >= Date.now() is false
      expect(authService.isTokenExpired()).toBe(false);
    });

    it('should handle empty token storage', () => {
      localStorage.setItem('uidam_access_token', '');

      expect(authService.getStoredToken()).toBe('');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return no scopes when scopes string is empty', () => {
      localStorage.setItem('uidam_token_scopes', '');

      const scopes = authService.getStoredScopes();
      expect(scopes).toEqual([]);
    });
  });

  describe('State management', () => {
    it('should generate state with proper format', () => {
      const state = (authService as any).generateState();

      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(40);
    });

    it('should store state in both session and local storage', () => {
      const state = (authService as any).generateState();

      expect(sessionStorage.getItem('oauth_state')).toBe(state);
      expect(localStorage.getItem('oauth_state')).toBe(state);
    });

    it('should store debug info with timestamp and URL', () => {
      (authService as any).generateState();

      const debugInfo = localStorage.getItem('oauth_state_debug');
      expect(debugInfo).toBeTruthy();

      const parsed = JSON.parse(debugInfo!);
      expect(parsed.timestamp).toBeTruthy();
      expect(parsed.url).toBe('');
    });
  });

  describe('Token exchange form data preparation', () => {
    it('should prepare form data with all required fields', () => {
      sessionStorage.setItem('pkce_code_verifier', 'test-verifier');

      const formData = (authService as any).prepareTokenExchangeFormData('auth-code');

      expect(formData.get('grant_type')).toBe('authorization_code');
      expect(formData.get('code')).toBe('auth-code');
      expect(formData.get('client_id')).toBe('test-client');
      expect(formData.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(formData.get('code_verifier')).toBe('test-verifier');
      expect(formData.get('client_secret')).toBe('test-secret');
    });

    it('should handle PKCE disabled', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OAUTH_CONFIG } = require('@config/app.config');
      OAUTH_CONFIG.USE_PKCE = false;

      const formData = (authService as any).prepareTokenExchangeFormData('auth-code');

      expect(formData.get('code_verifier')).toBeNull();
      expect(formData.get('client_secret')).toBe('test-secret');

      OAUTH_CONFIG.USE_PKCE = true;
    });

    it('should handle missing code verifier with warning', () => {
      // Don't set code verifier
      const formData = (authService as any).prepareTokenExchangeFormData('auth-code');

      expect(formData.get('code_verifier')).toBeNull();
      expect(formData.get('client_secret')).toBe('test-secret');
    });
  });
});
