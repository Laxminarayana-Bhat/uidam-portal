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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserAttributesModal from './UserAttributesModal';
import { UserService, UserAttribute } from '../../../services/userService';

jest.mock('../../../services/userService');

const mockHasScope = jest.fn();
jest.mock('@hooks/useScopes', () => ({
  useScopes: () => ({ hasScope: mockHasScope }),
}));

const mockAttribute: UserAttribute = {
  id: '1',
  name: 'department',
  attributeLabel: 'Department',
  mandatory: true,
  unique: false,
  readOnly: false,
  searchable: true,
  dynamicAttribute: true,
  type: 'int8',
  regex: '.*',
};

describe('UserAttributesModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasScope.mockReturnValue(false);
    (UserService.getUserAttributes as jest.Mock).mockResolvedValue({ data: [mockAttribute] });
    (UserService.updateUserAttributes as jest.Mock).mockResolvedValue({ code: 'SUCCESS' });
    (UserService.deleteUserAttribute as jest.Mock).mockResolvedValue({ code: 'SUCCESS' });
  });

  it('does not render when closed', () => {
    render(<UserAttributesModal open={false} onClose={mockOnClose} />);
    expect(screen.queryByText('User Attributes')).not.toBeInTheDocument();
  });

  it('fetches and displays attribute definitions when opened', async () => {
    render(<UserAttributesModal open={true} onClose={mockOnClose} />);

    await waitFor(() => expect(UserService.getUserAttributes).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('department')).toBeInTheDocument();
    // Raw type "int8" is displayed using its business-friendly label
    expect(screen.getByText('Number')).toBeInTheDocument();
  });

  it('shows an empty state when there are no attribute definitions', async () => {
    (UserService.getUserAttributes as jest.Mock).mockResolvedValue({ data: [] });
    render(<UserAttributesModal open={true} onClose={mockOnClose} />);

    expect(await screen.findByText('No additional attribute definitions found.')).toBeInTheDocument();
  });

  it('shows an error alert when fetching fails', async () => {
    (UserService.getUserAttributes as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<UserAttributesModal open={true} onClose={mockOnClose} />);

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserAttributesModal open={true} onClose={mockOnClose} />);
    await screen.findByText('department');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('re-fetches attributes when Refresh is clicked', async () => {
    const user = userEvent.setup();
    render(<UserAttributesModal open={true} onClose={mockOnClose} />);
    await screen.findByText('department');

    await user.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(UserService.getUserAttributes).toHaveBeenCalledTimes(2));
  });

  describe('read-only view (no ManageUsers scope)', () => {
    beforeEach(() => {
      mockHasScope.mockReturnValue(false);
    });

    it('hides the Add button and Edit/Delete actions', async () => {
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      expect(screen.queryByRole('button', { name: /add attribute/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('still allows viewing full attribute details in a read-only form', async () => {
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: 'View Details' }));

      expect(await screen.findByText('Attribute Details — department')).toBeInTheDocument();
      expect(screen.getByLabelText(/label/i)).toHaveValue('Department');
      expect(screen.getByLabelText(/label/i)).toBeDisabled();
      expect(screen.getByLabelText(/^name/i)).toBeDisabled();
      // Save/Cancel are replaced by a single Close action in read-only mode
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('management actions (ManageUsers scope)', () => {
    beforeEach(() => {
      mockHasScope.mockReturnValue(true);
    });

    it('creates a new attribute with default type and regex', async () => {
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: /add attribute/i }));
      await user.type(screen.getByLabelText(/name/i), 'nickName');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(UserService.updateUserAttributes).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'nickName', type: 'varchar', regex: '.*', dynamicAttribute: true }),
        ]);
      });
      expect(await screen.findByText('Attribute created successfully')).toBeInTheDocument();
      // list is refetched after a successful save
      expect(UserService.getUserAttributes).toHaveBeenCalledTimes(2);
    });

    it('shows a validation error when saving without a name', async () => {
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: /add attribute/i }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Attribute name is required')).toBeInTheDocument();
      expect(UserService.updateUserAttributes).not.toHaveBeenCalled();
    });

    it('pre-fills the edit form with the mapped type and existing regex', async () => {
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(await screen.findByText('Edit Attribute — department')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toHaveValue('department');
      // MUI's Select renders as a div[role="combobox"], which jest-dom's toBeDisabled() doesn't recognize
      expect(screen.getByLabelText(/type/i)).toHaveAttribute('aria-disabled', 'true');

      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => {
        expect(UserService.updateUserAttributes).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'department', type: 'numeric', regex: '.*' }),
        ]);
      });
    });

    it('deletes an attribute after confirmation', async () => {
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByText('Delete Attribute');
      const dialog = confirmDialog.closest('.MuiDialog-container') as HTMLElement;
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(UserService.deleteUserAttribute).toHaveBeenCalledWith('department'));
      expect(await screen.findByText('Attribute deleted successfully')).toBeInTheDocument();
    });

    it('shows the backend error inside the delete confirmation dialog instead of getting stuck', async () => {
      (UserService.deleteUserAttribute as jest.Mock).mockRejectedValue(
        new Error('Attribute is referenced by existing users and cannot be deleted')
      );
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      const confirmDialog = await screen.findByText('Delete Attribute');
      const dialog = confirmDialog.closest('.MuiDialog-container') as HTMLElement;
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      expect(await within(dialog).findByText('Attribute is referenced by existing users and cannot be deleted')).toBeInTheDocument();
      // The dialog stays open so the user can retry or cancel, instead of appearing stuck
      expect(screen.getByText('Delete Attribute')).toBeInTheDocument();
    });

    it('shows an error alert when save fails', async () => {
      (UserService.updateUserAttributes as jest.Mock).mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: /add attribute/i }));
      await user.type(screen.getByLabelText(/name/i), 'nickName');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Save failed')).toBeInTheDocument();
    });

    it('switches from the read-only view to the edit form via the Edit button', async () => {
      const user = userEvent.setup();
      render(<UserAttributesModal open={true} onClose={mockOnClose} />);
      await screen.findByText('department');

      await user.click(screen.getByRole('button', { name: 'View Details' }));
      expect(await screen.findByText('Attribute Details — department')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(await screen.findByText('Edit Attribute — department')).toBeInTheDocument();
      expect(screen.getByLabelText(/label/i)).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });
});
