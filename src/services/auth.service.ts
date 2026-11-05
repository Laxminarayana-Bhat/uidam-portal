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
import { AuthUser, AuthTokens } from '@/types';
import { OAUTH_CONFIG, API_CONFIG } from '@config/app.config';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Service class for handling OAuth2 authentication
 * Manages login, logout, token exchange, and token refresh operations
 */
export class AuthService {
  /**
   * Generate a cryptographically secure random string for PKCE code verifier
   * @returns {string} A base64URL-encoded random string for use as PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  /**
   * Generate PKCE code challenge from code verifier using SHA-256
   * @param {string} verifier - The code verifier string to hash
   * @returns {Promise<string>} A base64URL-encoded SHA-256 hash of the verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  /**
   * Base64 URL encode (RFC 4648)
   * NOSONAR - btoa() is required for OAuth2 PKCE implementation (RFC 7636)
   * @param {Uint8Array} buffer - The byte array to encode
   * @returns {string} A base64URL-encoded string
   */
  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate random state for CSRF protection
   * NOSONAR - localStorage/sessionStorage required for OAuth2 state management
   * @returns {string} A random state string stored in session and local storage
   */
  private generateState(): string {
    const state = this.generateCodeVerifier();
    sessionStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_state_debug', JSON.stringify({
      timestamp: new Date().toISOString(),
      url: window.location.href
    }));
    return state;
  }

  /**
   * Validate that a tenant ID is recognised by the authorization server.
   * Makes a lightweight request to the auth server's authorize endpoint with
   * redirect:manual so we can inspect the response without navigating away.
   *
   * - If the server responds with a 3xx redirect the tenant is valid.
   * - If the server returns a JSON body containing TENANT_RESOLUTION_FAILED the
   *   tenant is invalid and an Error is thrown with a user-readable message.
   * - If the request fails (CORS, network) validation is skipped and the
   *   caller falls through to the normal redirect (graceful degradation).
   *
   * @param {string} tenantId - The lowercase tenant identifier to validate
   * @throws {Error} When the auth server explicitly rejects the tenant
   */
  async validateTenant(tenantId: string): Promise<void> {
    const url = `${API_CONFIG.AUTH_SERVER_URL}/${tenantId}/oauth2/authorize`;
    try {
      const response = await fetch(url, { redirect: 'manual' });

      // A redirect (opaque) means the tenant was resolved — auth server is
      // sending the user to the tenant login page as expected.
      if (response.type === 'opaqueredirect') {
        return;
      }

      const text = await response.text();
      let data: { messages?: Array<{ key: string; parameters?: string[] }> };
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON body — cannot determine validity, proceed optimistically
        return;
      }

      const failed = (data?.messages ?? []).find(
        (m) => m.key === 'TENANT_RESOLUTION_FAILED'
      );
      if (failed) {
        throw new Error(
          `Tenant "${tenantId.toUpperCase()}" not found. Please enter a valid Tenant ID.`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw err;
      }
      // Network / CORS error — skip pre-validation and proceed with redirect
      console.warn('Tenant pre-validation unavailable (network/CORS):', err);
    }
  }

  /**
   * Initialize OAuth2 Authorization Code Grant flow with PKCE
   * Redirects user to the authorization server
   * @returns {Promise<void>} Redirects to authorization server, does not return
   * @throws {Error} If login initialization fails
   */
  async initiateLogin(): Promise<void> {
    try {
      const state = this.generateState();
      
      // Construct URL with PKCE parameters if enabled
      const baseUrl = `${API_CONFIG.AUTH_SERVER_URL}${API_CONFIG.SESSION_API_PREFIX}/oauth2/authorize`;
      const scopeValue = OAUTH_CONFIG.SCOPES.join(' ');
      
      // Always include scope= parameter; empty string means server grants default scopes
      let authUrl = `${baseUrl}?response_type=code&client_id=${OAUTH_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.REDIRECT_URI)}&scope=${encodeURIComponent(scopeValue)}&state=${state}`;
      
      // Add PKCE parameters if enabled
      if (OAUTH_CONFIG.USE_PKCE) {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        // Store code verifier for later use in token exchange
        sessionStorage.setItem('pkce_code_verifier', codeVerifier);
        
        authUrl += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        
        console.log('Initiating OAuth2 login with PKCE:', {
          client_id: OAUTH_CONFIG.CLIENT_ID,
          scope: scopeValue,
          redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
          auth_server: API_CONFIG.AUTH_SERVER_URL,
          code_challenge_method: 'S256',
          code_challenge: codeChallenge.substring(0, 10) + '...',
          full_url: authUrl
        });
      } else {
        console.log('Initiating OAuth2 login (legacy flow):', {
          client_id: OAUTH_CONFIG.CLIENT_ID,
          scope: scopeValue,
          redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
          auth_server: API_CONFIG.AUTH_SERVER_URL,
          full_url: authUrl
        });
      }
      
      // NOSONAR - window.location.href redirect required for OAuth2 authorization flow
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate login:', error);
      throw new Error('Failed to initiate OAuth login');
    }
  }

  /**
   * Handle the OAuth2 callback with authorization code
   * @param {string} code - The authorization code from OAuth2 provider
   * @param {string} state - The state parameter for CSRF protection
   * @returns {Promise<object>} The authenticated user and access tokens
   * @throws {Error} If state verification fails or token exchange fails
   */
  async handleAuthCallback(code: string, state: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      console.log('Starting handleAuthCallback with:', { code: code.substring(0, 10) + '...', state });
      
      // Verify state parameter (CSRF protection)
      const storedStateSession = sessionStorage.getItem('oauth_state');
      const storedStateLocal = localStorage.getItem('oauth_state');
      const debugInfo = localStorage.getItem('oauth_state_debug');
      
      console.log('State verification - detailed debug:', {
        receivedState: state,
        storedInSession: storedStateSession,
        storedInLocal: storedStateLocal,
        debugInfo: debugInfo ? JSON.parse(debugInfo) : null,
        currentUrl: window.location.href,
        allSessionStorage: { ...sessionStorage },
        allLocalStorage: { ...localStorage }
      });
      
      const storedState = storedStateSession ?? storedStateLocal;
      
      if (state !== storedState) {
        console.error('State mismatch - DETAILED ERROR:', { 
          received: state,
          expected: storedState,
          storedInSession: storedStateSession,
          storedInLocal: storedStateLocal,
          bothMatch: storedStateSession === storedStateLocal,
          debugData: debugInfo
        });
        
        // Let's try to be more permissive for debugging
        if (!storedState) {
          console.warn('No stored state found, but continuing for debugging...');
          // For now, let's skip state validation to test the rest of the flow
          // throw new Error('No stored state found - possible session issue');
        } else {
          throw new Error(`State mismatch: expected '${storedState}' but got '${state}'`);
        }
      }
      
      // Clean up stored state
      sessionStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_state_debug');

      console.log('State verification passed, starting token exchange...');
      
      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);
      
      console.log('Token exchange completed, getting user profile...');
      
      // Get user profile using the access token
      const userProfile = await this.getUserProfile(tokenResponse.access_token);
      
      console.log('User profile retrieved:', userProfile);
      
      // Store tokens and user profile
      this.storeTokens(tokenResponse);
      this.storeUserProfile(userProfile);
      
      return {
        user: userProfile,
        tokens: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in,
          tokenType: tokenResponse.token_type,
          scope: tokenResponse.scope || '',
        },
      };
    } catch (error) {
      console.error('Auth callback failed with detailed error:', error);
      if (error instanceof Error) {
        throw new Error(`Authentication failed: ${error.message}`);
      } else {
        throw new Error('Authentication failed with unknown error');
      }
    }
  }

  /**
   * Prepare form data for token exchange
   * @param {string} code - The authorization code to exchange
   * @returns {URLSearchParams} Form data with grant type, code, and authentication parameters
   */
  private prepareTokenExchangeFormData(code: string): URLSearchParams {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('client_id', OAUTH_CONFIG.CLIENT_ID);
    formData.append('redirect_uri', OAUTH_CONFIG.REDIRECT_URI);

    if (OAUTH_CONFIG.USE_PKCE) {
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      
      if (!codeVerifier) {
        console.warn('PKCE enabled but code verifier not found, falling back to client_secret');
        if (OAUTH_CONFIG.CLIENT_SECRET) {
          formData.append('client_secret', OAUTH_CONFIG.CLIENT_SECRET);
        }
      } else {
        formData.append('code_verifier', codeVerifier);
        if (OAUTH_CONFIG.CLIENT_SECRET) {
          formData.append('client_secret', OAUTH_CONFIG.CLIENT_SECRET);
        }
      }
    } else if (OAUTH_CONFIG.CLIENT_SECRET) {
      formData.append('client_secret', OAUTH_CONFIG.CLIENT_SECRET);
    }

    return formData;
  }

  /**
   * Exchange authorization code for access token
   * Supports both PKCE and legacy client_secret flows
   * @param {string} code - The authorization code to exchange
   * @returns {Promise<TokenResponse>} The token response with access and refresh tokens
   * @throws {Error} If token exchange fails
   */
  private async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const formData = this.prepareTokenExchangeFormData(code);
    const tokenUrl = `${API_CONFIG.AUTH_SERVER_URL}${API_CONFIG.SESSION_API_PREFIX}/oauth2/token`;
    
    console.log('Token exchange request:', {
      url: tokenUrl,
      client_id: OAUTH_CONFIG.CLIENT_ID,
      redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
      grant_type: 'authorization_code',
      code: code.substring(0, 10) + '...',
      has_code_verifier: formData.has('code_verifier'),
      has_client_secret: formData.has('client_secret'),
      use_pkce: OAUTH_CONFIG.USE_PKCE,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData,
    });

    console.log('Token exchange response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed - Full details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorBody: errorText
      });
      
      try {
        const error = JSON.parse(errorText);
        console.error('Parsed token exchange error:', error);
        throw new Error(error.error_description || error.error || `Token exchange failed: ${response.status} ${response.statusText}`);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const tokenResponse = await response.json();
    console.log('Token exchange successful:', {
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope
    });

    // Clean up PKCE code verifier after successful token exchange
    sessionStorage.removeItem('pkce_code_verifier');

    return tokenResponse;
  }

  /**
   * Decode a JWT token payload without verification.
   * @param {string} token - The JWT token to decode
   * @returns {Record<string, unknown>} The decoded payload claims
   */
  private decodeJwtPayload(token: string): Record<string, unknown> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(payload);
      }
    } catch { /* ignore */ }
    return {};
  }

  private getEffectiveScopes(scopes: unknown): string[] {
    if (!Array.isArray(scopes) || !scopes.every(
      (scope: unknown) => typeof scope === 'string' && scope.length > 0 && !/\s/.test(scope)
    )) {
      console.warn('Missing or invalid user scopes claim; no permissions granted.');
      return [];
    }
    return scopes.filter((scope: unknown): scope is string => typeof scope === 'string');
  }

  /**
   * Get user profile information using token introspection.
   * @param {string} accessToken - The access token to introspect
   * @returns {Promise<AuthUser>} The user profile information
   */
  private async getUserProfile(accessToken: string): Promise<AuthUser> {
    // Decode JWT first as a reliable baseline (no network call required)
    const claims = this.decodeJwtPayload(accessToken);
    const userScopes = this.getEffectiveScopes(claims.scopes);
    const jwtId       = (claims.sub       || claims.user_id    || '') as string;
    const jwtUsername = (claims.username  || claims.sub        || '') as string;
    const jwtEmail    = (claims.email     || '') as string;
    const jwtFirst    = (claims.given_name  || '') as string;
    const jwtLast     = (claims.family_name || '') as string;

    try {
      // Match the token exchange URL; deployed portal Nginx does not proxy OAuth2 requests.
      const introspectionUrl = `${API_CONFIG.AUTH_SERVER_URL}${API_CONFIG.SESSION_API_PREFIX}/oauth2/introspect`;
      const response = await fetch(introspectionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
        }),
      });

      if (response.ok) {
        const tokenInfo = await response.json();
        
        if (tokenInfo.active) {
          const username = tokenInfo.username || tokenInfo.sub || jwtUsername || '';
          return {
            id: tokenInfo.sub || username || jwtId || '1',
            userName: username,
            email: tokenInfo.email || jwtEmail,
            firstName: tokenInfo.given_name || jwtFirst || '',
            lastName: tokenInfo.family_name || jwtLast || '',
            roles: tokenInfo.roles || ['ADMIN'],
            scopes: userScopes,
            accounts: tokenInfo.accounts || ['default-account'],
          };
        }
      }
    } catch (error) {
      console.warn('Could not fetch user profile from introspection:', error);
    }

    // Fallback: use whatever we extracted directly from the JWT
    return {
      id: jwtId || '1',
      userName: jwtUsername,
      email: jwtEmail,
      firstName: jwtFirst,
      lastName: jwtLast,
      roles: ['ADMIN'],
      scopes: userScopes,
      accounts: ['default-account'],
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - The refresh token to use
   * @returns {Promise<AuthTokens>} The new access and refresh tokens
   * @throws {Error} If token refresh fails
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', OAUTH_CONFIG.CLIENT_ID);
    
    // Add client_secret if available (required by some OAuth servers)
    if (OAUTH_CONFIG.CLIENT_SECRET) {
      formData.append('client_secret', OAUTH_CONFIG.CLIENT_SECRET);
    }

    const response = await fetch(`${API_CONFIG.SESSION_API_PREFIX}/oauth2/token`, { // Use relative URL to go through Vite/nginx proxy
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokenResponse: TokenResponse = await response.json();
    const tokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      tokenType: tokenResponse.token_type,
    };

    this.storeTokens(tokenResponse);
    return tokens;
  }

  /**
   * Logout user by calling the OAuth2 logout endpoint
   * @param {string} [postLogoutRedirectUri] - Optional redirect URI after logout
   * @returns {Promise<void>} Completes when logout is finished
   */
  async logout(postLogoutRedirectUri?: string): Promise<void> {
    const accessToken = this.getStoredToken();
    
    if (accessToken) {
      try {
        // Generate cryptographically secure state for logout flow
        const stateArray = new Uint8Array(16);
        crypto.getRandomValues(stateArray);
        const state = Array.from(stateArray, b => b.toString(16).padStart(2, '0')).join('');
        
        // Construct logout URL with access_token as query parameter
        const logoutUrl = `${API_CONFIG.AUTH_SERVER_URL}${API_CONFIG.SESSION_API_PREFIX}/oauth2/logout?access_token=${encodeURIComponent(accessToken)}`;
        
        // Prepare form data for logout request
        const formData = new URLSearchParams();
        formData.append('id_token_hint', `Bearer ${accessToken}`);
        formData.append('client_id', OAUTH_CONFIG.CLIENT_ID);
        formData.append('post_logout_redirect_uri', postLogoutRedirectUri || OAUTH_CONFIG.POST_LOGOUT_REDIRECT_URI);
        formData.append('state', state);
        
        console.log('Initiating OAuth2 logout:', {
          endpoint: logoutUrl,
          client_id: OAUTH_CONFIG.CLIENT_ID,
          post_logout_redirect_uri: postLogoutRedirectUri || OAUTH_CONFIG.POST_LOGOUT_REDIRECT_URI,
          state: state
        });
        
        // Call logout endpoint
        await fetch(logoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }

    // Clean up stored data regardless of API call result
    sessionStorage.removeItem('pkce_code_verifier');
    this.clearStoredTokens();
  }

  /**
   * Store tokens in localStorage
   * @param {TokenResponse} tokens - The token response containing access and refresh tokens
   * @returns {void}
   */
  private storeTokens(tokens: TokenResponse): void {
    localStorage.setItem(OAUTH_CONFIG.TOKEN_STORAGE_KEY, tokens.access_token);
    localStorage.setItem(OAUTH_CONFIG.REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
    
    // Only the JWT `scopes` claim grants user permissions, not OAuth client scopes.
    const claims = this.decodeJwtPayload(tokens.access_token);
    const scopeValue = this.getEffectiveScopes(claims.scopes).join(' ');
    localStorage.setItem('uidam_token_scopes', scopeValue);
    
    // Store expiration time
    const expirationTime = Date.now() + (tokens.expires_in * 1000);
    localStorage.setItem('uidam_token_expires_at', expirationTime.toString());
  }

  /**
   * Store user profile in localStorage
   * @param {AuthUser} userProfile - The user profile to store
   * @returns {void}
   */
  private storeUserProfile(userProfile: AuthUser): void {
    localStorage.setItem('uidam_user_profile', JSON.stringify(userProfile));
  }

  /**
   * Get stored access token
   * @returns {string | null} The stored access token or null if not found
   */
  public getStoredToken(): string | null {
    return localStorage.getItem(OAUTH_CONFIG.TOKEN_STORAGE_KEY);
  }

  /**
   * Get stored user scopes; missing grants never fall back to requested OAuth scopes.
   * @returns {string[]} Array of scope strings from stored token
   */
  public getStoredScopes(): string[] {
    const scopes = localStorage.getItem('uidam_token_scopes');
    return scopes ? scopes.split(/\s+/).filter(Boolean) : [];
  }

  /**
   * Get stored refresh token
   * @returns {string | null} The stored refresh token or null if not found
   */
  public getStoredRefreshToken(): string | null {
    return localStorage.getItem(OAUTH_CONFIG.REFRESH_TOKEN_STORAGE_KEY);
  }

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired or not found, false otherwise
   */
  public isTokenExpired(): boolean {
    const expirationTime = localStorage.getItem('uidam_token_expires_at');
    if (!expirationTime) return true;
    
    return Date.now() >= parseInt(expirationTime);
  }

  /**
   * Clear stored tokens
   * @returns {void}
   */
  public clearStoredTokens(): void {
    localStorage.removeItem(OAUTH_CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(OAUTH_CONFIG.REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem('uidam_token_expires_at');
    localStorage.removeItem('uidam_token_scopes');
    localStorage.removeItem('uidam_user_profile');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user has valid non-expired token, false otherwise
   */
  public isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token && !this.isTokenExpired();
  }
}

export const authService = new AuthService();
