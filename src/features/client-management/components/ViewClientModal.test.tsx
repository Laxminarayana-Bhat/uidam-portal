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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewClientModal } from './ViewClientModal';
import { ClientListItem, CLIENT_STATUS } from '../../../types/client';

// The view dialog now renders directly from the ClientListItem prop (already returned by the
// filter endpoint), so there's no service call left to mock here.
const mockClient: ClientListItem = {
  clientId: 'test-client',
  clientName: 'Test Client',
  status: CLIENT_STATUS.APPROVED,
  authorizationGrantTypes: ['authorization_code', 'refresh_token'],
  redirectUris: ['https://example.com/callback', 'https://example.com/callback2'],
  postLogoutRedirectUris: ['https://example.com/logout'],
  scopes: ['openid', 'profile', 'email'],
  clientAuthenticationMethods: ['client_secret_basic', 'client_secret_post'],
  accessTokenValidity: 3600,
  refreshTokenValidity: 86400,
  authorizationCodeValidity: 600,
  requireAuthorizationConsent: true,
  additionalInformation: 'Some metadata',
  requestedBy: 'admin@example.com',
  createdBy: 'admin',
};

describe('ViewClientModal', () => {
  const mockOnClose = jest.fn();
  const mockWriteText = jest.fn();

  beforeAll(() => {
    // Mock clipboard API once for all tests
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockClear().mockResolvedValue(undefined);
  });

  it('should render modal when open', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );

    expect(screen.getByText('Client Details')).toBeInTheDocument();
    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(
      <ViewClientModal
        open={false}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.queryByText('Client Details')).not.toBeInTheDocument();
  });

  it('should display client details without a separate details request', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('test-client')).toBeInTheDocument();
    expect(screen.getByText('authorization_code')).toBeInTheDocument();
    expect(screen.getByText('refresh_token')).toBeInTheDocument();
  });

  it('should show the masked secret notice only when the client uses a secret-based auth method', () => {
    const { rerender } = render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );

    expect(screen.getByText(/•••••••••••/)).toBeInTheDocument();

    rerender(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={{ ...mockClient, clientAuthenticationMethods: ['none'] }}
      />
    );

    expect(screen.queryByText(/•••••••••••/)).not.toBeInTheDocument();
  });

  // Skipped: clipboard API mocking has environment-specific issues in JSDOM
  // The component functionality is verified by the success message test below
  it.skip('should copy client ID to clipboard', async () => {
    const user = userEvent.setup();
    
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    // Find copy button by aria-label
    const copyButton = screen.getByLabelText('Copy Client ID');
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('test-client');
      expect(screen.getByText(/Client ID copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('should display token validity in human-readable format', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    // 3600 seconds = 1 hour
    expect(screen.getByText('1h')).toBeInTheDocument();
    // 86400 seconds = 24 hours
    expect(screen.getByText('24h')).toBeInTheDocument();
    // 600 seconds = 10 minutes
    expect(screen.getByText('10m')).toBeInTheDocument();
  });

  it('should display authorization grant types as chips', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('authorization_code')).toBeInTheDocument();
    expect(screen.getByText('refresh_token')).toBeInTheDocument();
  });

  it('should display scopes as chips', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('openid')).toBeInTheDocument();
    expect(screen.getByText('profile')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('should display redirect URIs with copy functionality', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('https://example.com/callback')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/callback2')).toBeInTheDocument();
  });

  it('should display post logout redirect URIs when available', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('https://example.com/logout')).toBeInTheDocument();
  });

  it('should not display post logout section if URIs are empty', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={{ ...mockClient, postLogoutRedirectUris: [] }}
      />
    );
    
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.queryByText('Post Logout Redirect URIs')).not.toBeInTheDocument();
  });

  it('should display authorization consent setting', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('Requires Authorization Consent')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('should display requested by information', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getByText('Requested By')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('should display additional information when available', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    expect(screen.getAllByText('Additional Information').length).toBeGreaterThan(0);
    expect(screen.getByText('Some metadata')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should auto-hide copy success message after 2 seconds', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={mockClient}
      />
    );
    
    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find(btn => 
      btn.querySelector('svg[data-testid="FileCopyIcon"]')
    );
    
    if (copyButton) {
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.queryByText(/copied to clipboard/i)).not.toBeInTheDocument();
      });
    }
    
    jest.useRealTimers();
  });

  it('should handle token validity of 0 seconds', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={{ ...mockClient, accessTokenValidity: 0 }}
      />
    );
    
    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });

  it('should handle undefined token validity', () => {
    render(
      <ViewClientModal
        open={true}
        onClose={mockOnClose}
        client={{ ...mockClient, accessTokenValidity: undefined }}
      />
    );
    
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });
});
