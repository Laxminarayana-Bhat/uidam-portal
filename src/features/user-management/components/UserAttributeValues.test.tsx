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
import UserAttributeValues from './UserAttributeValues';
import { UserService, UserAttribute, UserAttributeValue } from '../../../services/userService';

jest.mock('../../../services/userService');

const mockAttributeDefs: UserAttribute[] = [
  { name: 'department', attributeLabel: 'Department', type: 'varchar', mandatory: false, unique: false, readOnly: false, searchable: false, dynamicAttribute: true },
  { name: 'age', attributeLabel: 'Age', type: 'int8', mandatory: false, unique: false, readOnly: false, searchable: false, dynamicAttribute: true },
  { name: 'hasValidPassport', attributeLabel: 'Passport Valid', type: 'bool', mandatory: false, unique: false, readOnly: true, searchable: false, dynamicAttribute: true },
];

const mockValues: UserAttributeValue[] = [
  { name: 'age', value: '30' },
  { name: 'hasValidPassport', value: 'true' },
];

describe('UserAttributeValues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (UserService.getUserAttributeValues as jest.Mock).mockResolvedValue({ data: mockValues });
    (UserService.getUserAttributes as jest.Mock).mockResolvedValue({ data: mockAttributeDefs });
    (UserService.updateUserAttributeValues as jest.Mock).mockResolvedValue({ code: 'SUCCESS' });
    (UserService.deleteUserAttributeValue as jest.Mock).mockResolvedValue({ code: 'SUCCESS' });
  });

  it('fetches and displays the user\'s attribute values', async () => {
    render(<UserAttributeValues userId="user-1" canEdit={false} />);

    await waitFor(() => expect(UserService.getUserAttributeValues).toHaveBeenCalledWith('user-1'));
    expect(await screen.findByText('age')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('hasValidPassport')).toBeInTheDocument();
  });

  it('shows an empty state when the user has no attribute values', async () => {
    (UserService.getUserAttributeValues as jest.Mock).mockResolvedValue({ data: [] });
    render(<UserAttributeValues userId="user-1" canEdit={false} />);

    expect(await screen.findByText('No additional attribute values set for this user.')).toBeInTheDocument();
  });

  it('shows an error alert when fetching values fails', async () => {
    (UserService.getUserAttributeValues as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
    render(<UserAttributeValues userId="user-1" canEdit={false} />);

    expect(await screen.findByText('Fetch failed')).toBeInTheDocument();
  });

  it('hides the Add button and Actions column when canEdit is false', async () => {
    render(<UserAttributeValues userId="user-1" canEdit={false} />);
    await screen.findByText('age');

    expect(screen.queryByRole('button', { name: /add attribute value/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  describe('when canEdit is true', () => {
    it('only offers attribute names that do not already have a value in the Add dropdown', async () => {
      const user = userEvent.setup();
      render(<UserAttributeValues userId="user-1" canEdit={true} />);
      await screen.findByText('age');

      await user.click(screen.getByRole('button', { name: /add attribute value/i }));
      await user.click(screen.getByLabelText(/name/i));

      expect(await screen.findByRole('option', { name: 'Department' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Age' })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Passport Valid' })).not.toBeInTheDocument();
    });

    it('adds a new attribute value', async () => {
      const user = userEvent.setup();
      render(<UserAttributeValues userId="user-1" canEdit={true} />);
      await screen.findByText('age');

      await user.click(screen.getByRole('button', { name: /add attribute value/i }));
      await user.click(screen.getByLabelText(/name/i));
      await user.click(await screen.findByRole('option', { name: 'Department' }));
      await user.type(await screen.findByLabelText(/^value/i), 'Engineering');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(UserService.updateUserAttributeValues).toHaveBeenCalledWith('user-1', [
          { name: 'department', value: 'Engineering' },
        ]);
      });
      expect(await screen.findByText('Attribute value added successfully')).toBeInTheDocument();
      expect(UserService.getUserAttributeValues).toHaveBeenCalledTimes(2);
    });

    it('renders a number input when editing a Number-typed value', async () => {
      const user = userEvent.setup();
      render(<UserAttributeValues userId="user-1" canEdit={true} />);
      await screen.findByText('age');

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]); // "age" row is rendered first

      expect(await screen.findByText('Edit Attribute Value — age')).toBeInTheDocument();
      const valueInput = screen.getByLabelText(/^value/i) as HTMLInputElement;
      expect(valueInput).toHaveAttribute('type', 'number');
      expect(valueInput).toHaveValue(30);
    });

    it('disables the Edit action for a read-only attribute', async () => {
      render(<UserAttributeValues userId="user-1" canEdit={true} />);
      await screen.findByText('hasValidPassport');

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      // "hasValidPassport" is the second row and is marked read-only in the definition
      expect(editButtons[1]).toBeDisabled();
    });

    it('deletes an attribute value after confirmation', async () => {
      const user = userEvent.setup();
      render(<UserAttributeValues userId="user-1" canEdit={true} />);
      await screen.findByText('age');

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteButtons[0]);

      expect(await screen.findByText('Delete Attribute Value')).toBeInTheDocument();
      const dialogDeleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(dialogDeleteButtons[dialogDeleteButtons.length - 1]);

      await waitFor(() => expect(UserService.deleteUserAttributeValue).toHaveBeenCalledWith('user-1', 'age'));
      expect(await screen.findByText('Attribute value deleted successfully')).toBeInTheDocument();
    });

    it('shows an error alert when saving fails', async () => {
      (UserService.updateUserAttributeValues as jest.Mock).mockRejectedValue(new Error('Save failed'));
      const user = userEvent.setup();
      render(<UserAttributeValues userId="user-1" canEdit={true} />);
      await screen.findByText('age');

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editButtons[0]);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Save failed')).toBeInTheDocument();
    });
  });
});
