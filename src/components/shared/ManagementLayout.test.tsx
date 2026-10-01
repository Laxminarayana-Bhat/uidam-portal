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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManagementLayout from './ManagementLayout';

describe('ManagementLayout', () => {
  it('renders the title, subtitle, and icon', () => {
    render(
      <ManagementLayout title="User Management" subtitle="Manage users" icon={<span>icon</span>}>
        <div>content</div>
      </ManagementLayout>
    );

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage users')).toBeInTheDocument();
    expect(screen.getByText('icon')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ManagementLayout title="Title">
        <div>page content</div>
      </ManagementLayout>
    );

    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('does not render a Refresh button when onRefresh is not provided', () => {
    render(<ManagementLayout title="Title"><div /></ManagementLayout>);
    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  });

  it('calls onRefresh when the Refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    render(
      <ManagementLayout title="Title" onRefresh={onRefresh}>
        <div />
      </ManagementLayout>
    );

    await user.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders beforeRefreshActions to the left of the Refresh button and headerActions to the right', () => {
    render(
      <ManagementLayout
        title="Title"
        onRefresh={jest.fn()}
        beforeRefreshActions={<button>Additional Attributes</button>}
        headerActions={<button>Register New Client</button>}
      >
        <div />
      </ManagementLayout>
    );

    const buttons = screen.getAllByRole('button').map((btn) => btn.textContent);
    const beforeIndex = buttons.findIndex((text) => text?.includes('Additional Attributes'));
    const refreshIndex = buttons.findIndex((text) => text?.includes('Refresh'));
    const afterIndex = buttons.findIndex((text) => text?.includes('Register New Client'));

    expect(beforeIndex).toBeGreaterThanOrEqual(0);
    expect(refreshIndex).toBeGreaterThan(beforeIndex);
    expect(afterIndex).toBeGreaterThan(refreshIndex);
  });

  it('renders error and success messages', () => {
    render(
      <ManagementLayout title="Title" error={<div>Something failed</div>} success={<div>Saved!</div>}>
        <div />
      </ManagementLayout>
    );

    expect(screen.getByText('Something failed')).toBeInTheDocument();
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders the loading spinner when loading is true', () => {
    const { container } = render(
      <ManagementLayout title="Title" loading={true}>
        <div />
      </ManagementLayout>
    );
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
