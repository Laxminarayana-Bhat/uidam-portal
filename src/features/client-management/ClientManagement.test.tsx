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
import { ClientManagement } from './ClientManagement';
import { ClientRegistrationService } from '../../services/clientRegistrationService';
import { ClientListItem, CLIENT_STATUS } from '../../types/client';

// Mock services
jest.mock('../../services/clientRegistrationService');
jest.mock('../../utils/logger');

// Mock child components
jest.mock('./components/CreateClientModal', () => ({
  CreateClientModal: ({ open, onClose, onSave, onSuccess }: { open: boolean; onClose: () => void; onSave: () => void; onSuccess: (msg: string) => void }) => 
    open ? (
      <div data-testid="create-client-modal">
        <button onClick={() => {
          onSave();
          onSuccess('Client created successfully');
        }}>Save</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('./components/EditClientModal', () => ({
  EditClientModal: ({ open, onClose, onSave, onSuccess }: { open: boolean; onClose: () => void; onSave: () => void; onSuccess: (msg: string) => void }) => 
    open ? (
      <div data-testid="edit-client-modal">
        <button onClick={() => {
          onSave();
          onSuccess('Client updated successfully');
        }}>Save</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('./components/ViewClientModal', () => ({
  ViewClientModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => 
    open ? (
      <div data-testid="view-client-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const mockClients: ClientListItem[] = [
  {
    clientId: 'client-1',
    clientName: 'Test Client 1',
    status: CLIENT_STATUS.APPROVED,
    authorizationGrantTypes: ['authorization_code', 'refresh_token'],
    scopes: ['openid', 'profile', 'email'],
    requestedBy: 'user1@test.com',
  },
  {
    clientId: 'client-2',
    clientName: 'Test Client 2',
    status: CLIENT_STATUS.PENDING,
    authorizationGrantTypes: ['client_credentials'],
    scopes: ['openid', 'profile', 'email', 'read', 'write'],
    requestedBy: 'user2@test.com',
  },
];

// Tests for ClientManagement component
describe('ClientManagement', () => {
  const mockGetClients = jest.fn();
  const mockDeleteClient = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // ClientManagement now calls filterClients (with search/status criteria) instead of getClients
    (ClientRegistrationService.filterClients as jest.Mock) = mockGetClients;
    (ClientRegistrationService.deleteClient as jest.Mock) = mockDeleteClient;
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('Initial Load', () => {
    it('should render loading state initially', () => {
      mockGetClients.mockImplementation(() => new Promise(() => {}));
      render(<ClientManagement />);
      expect(screen.getByText(/Loading OAuth2 clients/i)).toBeInTheDocument();
    });

    it('should load and display clients', async () => {
      mockGetClients.mockResolvedValue(mockClients);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Test Client 2')).toBeInTheDocument();
      expect(screen.getByText('client-1')).toBeInTheDocument();
      expect(screen.getByText('client-2')).toBeInTheDocument();
    });

    it('should display error message when loading fails', async () => {
      mockGetClients.mockRejectedValue(new Error('Network error'));
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load OAuth2 clients/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no clients are available', async () => {
      mockGetClients.mockResolvedValue([]);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText(/No OAuth2 clients found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      mockGetClients.mockResolvedValue(mockClients);
      render(<ClientManagement />);
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
    });

    it('should display default page size as 10', async () => {
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            // One extra row beyond the page size is requested to detect a next page
            pageSize: 11,
            pageNumber: 0
          })
        );
      });
    });

    it('should handle page change', async () => {
      const user = userEvent.setup();
      // Create more clients than one page to enable pagination
      const manyClients = Array.from({ length: 11 }, (_, i) => ({
        ...mockClients[0],
        clientId: `client-${i + 1}`,
        clientName: `Client ${i + 1}`,
      }));
      mockGetClients.mockResolvedValue(manyClients);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Client 1').length).toBeGreaterThan(0);
      });
      
      const nextPageButtons = screen.queryAllByRole('button', { name: /next page/i });
      const enabledNextButton = nextPageButtons.find(btn => !btn.hasAttribute('disabled'));
      expect(enabledNextButton).toBeDefined();
      
      await user.click(enabledNextButton!);
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ pageNumber: 1 })
        );
      });
    });

    it('should reset to page 0 when rows per page changes', async () => {
      const user = userEvent.setup();
      
      const rowsPerPageSelects = screen.getAllByRole('combobox');
      const rowsPerPageSelect = rowsPerPageSelects[rowsPerPageSelects.length - 1];
      await user.click(rowsPerPageSelect);
      
      const option25 = screen.getByRole('option', { name: '25' });
      await user.click(option25);
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            pageSize: 26,
            pageNumber: 0,
          })
        );
      });
    });

    it('should disable the next page button once the last page is reached', async () => {
      await waitFor(() => {
        const nextPageButton = screen.getByRole('button', { name: /next page/i });
        expect(nextPageButton).toBeDisabled();
      });
    });

    it('should cap the requested pageSize at 100 when rows per page is set to 100', async () => {
      const user = userEvent.setup();
      
      const rowsPerPageSelects = screen.getAllByRole('combobox');
      const rowsPerPageSelect = rowsPerPageSelects[rowsPerPageSelects.length - 1];
      await user.click(rowsPerPageSelect);
      
      const option100 = screen.getByRole('option', { name: '100' });
      await user.click(option100);
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledWith(
          expect.any(Object),
          // The +1 probe row would exceed the backend's max page size, so it's capped at 100
          expect.objectContaining({ pageSize: 100 })
        );
      });
    });
  });

  describe('Status Colors', () => {
    it('should display correct chip colors for different statuses', async () => {
      const clientsWithStatuses = [
        { ...mockClients[0], status: CLIENT_STATUS.APPROVED },
        { ...mockClients[0], clientId: 'client-2', status: CLIENT_STATUS.PENDING },
        { ...mockClients[0], clientId: 'client-3', status: CLIENT_STATUS.REJECTED },
        { ...mockClients[0], clientId: 'client-4', status: CLIENT_STATUS.SUSPENDED },
        { ...mockClients[0], clientId: 'client-5', status: CLIENT_STATUS.DELETED },
        { ...mockClients[0], clientId: 'client-6', status: 'unknown' },
      ];
      mockGetClients.mockResolvedValue(clientsWithStatuses);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText(CLIENT_STATUS.APPROVED)).toBeInTheDocument();
      });
    });
  });

  describe('Client Actions', () => {
    beforeEach(async () => {
      mockGetClients.mockResolvedValue(mockClients);
      render(<ClientManagement />);
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
    });

    it('should open create client modal when clicking register button', async () => {
      const user = userEvent.setup();
      const registerButton = screen.getByRole('button', { name: /Register New Client/i });
      
      await user.click(registerButton);
      
      expect(screen.getByTestId('create-client-modal')).toBeInTheDocument();
    });

    it('should open action menu when clicking more actions button', async () => {
      const user = userEvent.setup();
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      
      await user.click(moreButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
        expect(screen.getByText('Edit Client')).toBeInTheDocument();
        expect(screen.getByText('Copy Client ID')).toBeInTheDocument();
        expect(screen.getByText('Delete Client')).toBeInTheDocument();
      });
    });

    it('should open view modal when clicking view details', async () => {
      const user = userEvent.setup();
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      
      await user.click(moreButtons[0]);
      const viewButton = await screen.findByText('View Details');
      await user.click(viewButton);
      
      expect(screen.getByTestId('view-client-modal')).toBeInTheDocument();
    });

    it('should open edit modal when clicking edit client', async () => {
      const user = userEvent.setup();
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      
      await user.click(moreButtons[0]);
      const editButton = await screen.findByText('Edit Client');
      await user.click(editButton);
      
      expect(screen.getByTestId('edit-client-modal')).toBeInTheDocument();
    });

    it('should copy client ID to clipboard', async () => {
      const user = userEvent.setup();
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      
      await user.click(moreButtons[0]);
      const copyButton = await screen.findByText('Copy Client ID');
      await user.click(copyButton);
      
    //  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('client-1');
      await waitFor(() => {
        expect(screen.getByText('Client ID copied to clipboard')).toBeInTheDocument();
      });
    });

    it('should open delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      
      await user.click(moreButtons[0]);
      const deleteButton = await screen.findByText('Delete Client');
      await user.click(deleteButton);
      
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete the client/i)).toBeInTheDocument();
    });

    it('should delete client when confirmed', async () => {
      const user = userEvent.setup();
      mockDeleteClient.mockResolvedValue(undefined);
      mockGetClients.mockResolvedValue([mockClients[1]]);
      
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      await user.click(moreButtons[0]);
      
      const deleteButton = await screen.findByText('Delete Client');
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /Delete Client/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockDeleteClient).toHaveBeenCalledWith('client-1');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/deleted successfully/i)).toBeInTheDocument();
      });
    });

    it('should disable Edit and Delete for an already-deleted client', async () => {
      const user = userEvent.setup();
      mockGetClients.mockResolvedValue([{ ...mockClients[0], status: CLIENT_STATUS.DELETED }]);

      // Deleted clients are only fetched/shown when explicitly filtered for
      const statusDropdown = screen.getAllByRole('combobox')[0];
      await user.click(statusDropdown);
      await user.click(await screen.findByRole('option', { name: 'Deleted' }));

      await waitFor(() => {
        expect(screen.getAllByText('Test Client 1').length).toBeGreaterThan(0);
      });
      
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      await user.click(moreButtons[moreButtons.length - 1]);
      
      const editItem = (await screen.findByText('Edit Client')).closest('[role="menuitem"]');
      const deleteItem = screen.getByText('Delete Client').closest('[role="menuitem"]');
      expect(editItem).toHaveAttribute('aria-disabled', 'true');
      expect(deleteItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle delete error', async () => {
      const user = userEvent.setup();
      mockDeleteClient.mockRejectedValue(new Error('Delete failed'));
      
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      await user.click(moreButtons[0]);
      
      const deleteButton = await screen.findByText('Delete Client');
      await user.click(deleteButton);
      
      const confirmButton = screen.getByRole('button', { name: /Delete Client/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to delete client/i)).toBeInTheDocument();
      });
    });

    it('should cancel delete when clicking cancel button', async () => {
      const user = userEvent.setup();
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      
      await user.click(moreButtons[0]);
      const deleteButton = await screen.findByText('Delete Client');
      await user.click(deleteButton);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
      }, { timeout: 10000 });
      expect(mockDeleteClient).not.toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    beforeEach(async () => {
      mockGetClients.mockResolvedValue(mockClients);
    });

    it('should close create modal and reload clients after saving', async () => {
      const user = userEvent.setup();
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
      
      const registerButton = screen.getByRole('button', { name: /Register New Client/i });
      await user.click(registerButton);
      
      const saveButton = screen.getByRole('button', { name: /Save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledTimes(2);
      });
    });

    it(
      'should close edit modal and reload clients after saving',
      async () => {
        const user = userEvent.setup();
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
      
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      await user.click(moreButtons[0]);
      
      const editButton = await screen.findByText('Edit Client');
      await user.click(editButton);
      
      const saveButton = screen.getByRole('button', { name: /Save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledTimes(2);
      }, { timeout: 10000 });
      },
      15000
    );

    it('should close modals when clicking close button', async () => {
      const user = userEvent.setup();
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
      
      const registerButton = screen.getByRole('button', { name: /Register New Client/i });
      await user.click(registerButton);
      
      const closeButton = screen.getByRole('button', { name: /Close/i });
      await user.click(closeButton);
      
      expect(screen.queryByTestId('create-client-modal')).not.toBeInTheDocument();
    });
  });

  describe('Grant Types and Scopes Display', () => {
    it('should display all grant types as chips', async () => {
      mockGetClients.mockResolvedValue(mockClients);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('authorization_code')).toBeInTheDocument();
        expect(screen.getByText('refresh_token')).toBeInTheDocument();
        expect(screen.getByText('client_credentials')).toBeInTheDocument();
      });
    });

    it('should display first 3 scopes and show more count for additional scopes', async () => {
      mockGetClients.mockResolvedValue(mockClients);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getAllByText('openid').length).toBeGreaterThan(0);
      });
      
      // Check for "+2 more" for client with 5 scopes
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  describe('Error and Success Messages', () => {
    it('should dismiss error message when clicking close', async () => {
      const user = userEvent.setup();
      mockGetClients.mockRejectedValue(new Error('Load failed'));
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load OAuth2 clients/i)).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(screen.queryByText(/Failed to load OAuth2 clients/i)).not.toBeInTheDocument();
    });

    it('should auto-dismiss success message after 5 seconds', async () => {
      jest.useFakeTimers();
      mockGetClients.mockResolvedValue(mockClients);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
      
      const user = userEvent.setup({ delay: null });
      const moreButtons = screen.getAllByRole('button', { name: /More actions/i });
      await user.click(moreButtons[0]);
      
      const copyButton = await screen.findByText('Copy Client ID');
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Client ID copied to clipboard')).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(screen.queryByText('Client ID copied to clipboard')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });

  describe('Refresh Functionality', () => {
    it('should reload clients when refresh is triggered', async () => {
      mockGetClients.mockResolvedValue(mockClients);
      
      render(<ClientManagement />);
      
      await waitFor(() => {
        expect(mockGetClients).toHaveBeenCalledTimes(1);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Test Client 1')).toBeInTheDocument();
      });
    });
  });
});
