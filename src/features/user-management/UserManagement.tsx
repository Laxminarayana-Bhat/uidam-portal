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
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  TablePagination,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  Email as EmailIcon,
  ManageAccounts as ManageAccountsIcon,
  FilterList as FilterListIcon,
  Devices as DevicesIcon,
  ListAlt as ListAltIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '@store/index';
import ManagementLayout from '../../components/shared/ManagementLayout';
import { StyledTableHead, StyledTableCell, StyledTableRow } from '../../components/shared/StyledTableComponents';
import { useScopes } from '@hooks/useScopes';
import { User, UserService, UsersFilterV2, UserSearchParams } from '../../services/userService';
import CreateUserModal from './components/CreateUserModal';
import EditUserModal from './components/EditUserModal';
import UserDetailsModal from './components/UserDetailsModal';
import DeleteUserDialog from './components/DeleteUserDialog';
import ManageUserAccountsModal from './components/ManageUserAccountsModal';
import AdminSessionsModal from './components/AdminSessionsModal';
import UserAttributesModal from './components/UserAttributesModal';

const extractUsersList = (response: unknown): User[] => {
  if (Array.isArray(response)) {
    return response as User[];
  }
  if (response && typeof response === 'object' && 'data' in response) {
    const dataResponse = response as { data?: unknown };
    if (Array.isArray(dataResponse.data)) {
      return dataResponse.data as User[];
    }
  }
  return [];
};

// Statuses fetched by default when no status filter is selected; Deleted users are only
// fetched when the user explicitly selects "Deleted" from the status filter dropdown.
const DEFAULT_USER_STATUSES = ['ACTIVE', 'PENDING', 'BLOCKED', 'REJECTED', 'DEACTIVATED'] as const;

const UserManagement: React.FC = () => {
  const { hasScope, hasAnyScope } = useScopes();
  const canManageUsers = hasScope('ManageUsers');        // POST/PUT/DELETE /users
  const canViewUsers   = hasAnyScope('ViewUsers', 'ManageUsers'); // GET /users
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  // Whether at least one more user exists beyond the current page (see loadUsers)
  const [hasNextPage, setHasNextPage] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' 
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Modal states
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [manageAccountsModalOpen, setManageAccountsModalOpen] = useState(false);
  const [selectedUserForAccounts, setSelectedUserForAccounts] = useState<User | null>(null);
  const [adminSessionsModalOpen, setAdminSessionsModalOpen] = useState(false);
  const [adminSessionsUsername, setAdminSessionsUsername] = useState<string | null>(null);
  const [userAttributesModalOpen, setUserAttributesModalOpen] = useState(false);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    
    const startTime = Date.now();
    const minLoadingTime = 500; // Minimum 500ms to show loader
    
    try {
      const filter: UsersFilterV2 = {};
      
      if (searchTerm?.trim()) {
        filter.userNames = [searchTerm.trim()];
      }
      
      if (statusFilter) {
        filter.status = [statusFilter as 'PENDING' | 'BLOCKED' | 'REJECTED' | 'ACTIVE' | 'DELETED' | 'DEACTIVATED'];
      } else {
        // Deleted users are excluded unless explicitly selected via the status filter
        filter.status = [...DEFAULT_USER_STATUSES];
      }

      const searchParams: UserSearchParams = {
        pageNumber: page,
        // Request one extra row beyond the page size to detect a next page
        // without a second request that fetches (and counts) every matching user
        pageSize: rowsPerPage + 1,
        sortBy: 'USER_NAMES',
        sortOrder: 'ASC',
        ignoreCase: true,
        searchType: 'CONTAINS',
      };

      try {
        const response = await UserService.filterUsersV2(filter, searchParams);
        console.log('API Response:', response);
        
        const fetchedUsers = extractUsersList(response);
        const hasMore = fetchedUsers.length > rowsPerPage;
        const usersList = fetchedUsers.slice(0, rowsPerPage);
        setUsers(usersList);
        setHasNextPage(hasMore);
        setTotalUsers(page * rowsPerPage + usersList.length + (hasMore ? 1 : 0));
        
        console.log('Users loaded:', usersList.length);
      } catch (apiError) {
        console.error('API call failed:', apiError);
        setSnackbar({ 
          open: true, 
          message: `Failed to load users: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`, 
          severity: 'error' 
        });
        setUsers([]);
        setTotalUsers(0);
        setHasNextPage(false);
      }
    } catch (error) {
      console.error('Error in loadUsers:', error);
      setSnackbar({ 
        open: true, 
        message: `Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        severity: 'error' 
      });
      setUsers([]);
      setTotalUsers(0);
      setHasNextPage(false);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'BLOCKED':
      case 'REJECTED':
        return 'error';
      case 'DEACTIVATED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon fontSize="small" />;
      case 'PENDING':
        return <EmailIcon fontSize="small" />;
      case 'BLOCKED':
        return <BlockIcon fontSize="small" />;
      case 'REJECTED':
        return <CancelIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    console.log('Menu clicked for user:', user.userName, 'Status:', user.status);
    setSelectedUser(user);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedUser here - it's needed for the modal operations
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // User creation handlers
  const handleCreateUser = () => {
    setCreateUserModalOpen(true);
  };

  const handleCreateUserClose = () => {
    setCreateUserModalOpen(false);
  };

  const handleUserCreated = () => {
    setSnackbar({
      open: true,
      message: 'User created successfully!',
      severity: 'success'
    });
    loadUsers(); // Refresh the user list
  };

  // User editing handlers
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
    handleMenuClose();
  };

  const handleEditUserClose = () => {
    setEditUserModalOpen(false);
    setSelectedUser(null); // Clear when cancelled
  };

  const handleUserUpdated = () => {
    setSnackbar({
      open: true,
      message: 'User updated successfully!',
      severity: 'success'
    });
    setSelectedUser(null); // Clear selected user after successful update
    loadUsers(); // Refresh the user list
  };

  // User details handlers
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailsModalOpen(true);
    handleMenuClose();
  };

  const handleUserDetailsClose = () => {
    setUserDetailsModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditFromDetails = () => {
    setUserDetailsModalOpen(false);
    setEditUserModalOpen(true);
  };

  // User deletion handlers
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteUserDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteUserClose = () => {
    setDeleteUserDialogOpen(false);
    setSelectedUser(null);
  };

  // Manage accounts handlers
  const handleManageAccounts = (user: User) => {
    console.log('Managing accounts for user:', user.userName);
    setSelectedUserForAccounts(user);
    setManageAccountsModalOpen(true);
    handleMenuClose();
  };

  // Admin sessions handlers
  const handleManageAdminSessions = (user: User) => {
    setAdminSessionsUsername(user.userName);
    setAdminSessionsModalOpen(true);
    handleMenuClose();
  };

  const handleUserDeleted = () => {
    setSnackbar({
      open: true,
      message: 'User deleted successfully',
      severity: 'success'
    });
    loadUsers(); // Refresh the users list
  };

  return (
    <>
      <ManagementLayout
        title="User Management"
        subtitle="Manage users, accounts, and access permissions"
        icon={<PersonIcon />}
        onRefresh={loadUsers}
        error={error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        beforeRefreshActions={canViewUsers && (
          <Button
            variant="outlined"
            startIcon={<ListAltIcon />}
            onClick={() => setUserAttributesModalOpen(true)}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            Additional Attributes
          </Button>
        )}
      >
        {/* Search and Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
            <TextField
              placeholder="Search users by name, username, or email..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 400 }}
            />
            <TextField
              select
              placeholder="Filter by status"
              variant="outlined"
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterListIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
              SelectProps={{
                displayEmpty: true,
              }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="BLOCKED">Blocked</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="DEACTIVATED">Deactivated</MenuItem>
              <MenuItem value="DELETED">Deleted</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canManageUsers && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateUser}
              >
                Create User
              </Button>
            )}
          </Box>
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper} sx={{ 
          boxShadow: 2, 
          borderRadius: 2, 
          overflow: 'hidden',
          width: '100%'
        }}>
          <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
            <StyledTableHead>
              <TableRow>
                <StyledTableCell sx={{ width: '15%' }}>Username</StyledTableCell>
                <StyledTableCell sx={{ width: '22%' }}>Email</StyledTableCell>
                <StyledTableCell sx={{ width: '12%' }}>Status</StyledTableCell>
                <StyledTableCell sx={{ width: '41%' }}>Accounts and Roles</StyledTableCell>
                <StyledTableCell align="center" sx={{ width: '10%' }}>Actions</StyledTableCell>
              </TableRow>
            </StyledTableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>Loading users...</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && users.length > 0 && users.map((user) => (
                  <StyledTableRow 
                    key={user.id} 
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleViewUser(user)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {user.userName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ wordBreak: 'break-all' }}>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(user.status)}
                        label={user.status}
                        color={getStatusColor(user.status) as 'success' | 'warning' | 'error' | 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {user.accounts?.map((acc) => (
                        <Chip
                          key={`${acc.account}-${acc.roles.join('-')}`}
                          label={`${acc.account} (${acc.roles.join(', ')})`}
                          size="small"
                          variant="filled"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        aria-label="actions"
                        size="medium"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleMenuClick(e, user);
                        }}
                        sx={{ 
                          color: 'primary.main',
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          border: '1px solid rgba(25, 118, 210, 0.3)',
                          '&:hover': {
                            color: 'primary.dark',
                            backgroundColor: 'rgba(25, 118, 210, 0.12)'
                          }
                        }}
                      >
                        <MoreVertIcon fontSize="medium" />
                      </IconButton>
                    </TableCell>
                  </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelDisplayedRows={({ from, to, count }) => hasNextPage ? `${from}–${to} of many` : `${from}–${to} of ${count}`}
        />
      </ManagementLayout>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {/* View Details — available to anyone who can see the page */}
        {canViewUsers && (
          <MenuItem onClick={() => selectedUser && handleViewUser(selectedUser)}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
        )}
        {/* Write actions — require ManageUsers */}
        {canManageUsers && (
          <MenuItem
            onClick={() => selectedUser && handleEditUser(selectedUser)}
            disabled={selectedUser?.status === 'DELETED'}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit User</ListItemText>
          </MenuItem>
        )}
        {/* Manage accounts on a user — requires ManageUsers */}
        {canManageUsers && (
          <MenuItem onClick={() => selectedUser && handleManageAccounts(selectedUser)}>
            <ListItemIcon>
              <ManageAccountsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Accounts & Roles</ListItemText>
          </MenuItem>
        )}
        {/* Session management — requires ManageUsers; hidden for the logged-in admin's own row */}
        {canManageUsers && selectedUser?.userName !== currentUser?.userName && (
          <MenuItem onClick={() => selectedUser && handleManageAdminSessions(selectedUser)}>
            <ListItemIcon>
              <DevicesIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Active Sessions</ListItemText>
          </MenuItem>
        )}
        {/* Delete — requires ManageUsers */}
        {canManageUsers && (
          <MenuItem
            onClick={() => selectedUser && handleDeleteUser(selectedUser)}
            disabled={selectedUser?.status === 'DELETED'}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete User</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Modals */}
      <CreateUserModal
        open={createUserModalOpen}
        onClose={handleCreateUserClose}
        onUserCreated={handleUserCreated}
      />

      <EditUserModal
        open={editUserModalOpen}
        user={selectedUser}
        onClose={handleEditUserClose}
        onUserUpdated={handleUserUpdated}
      />

      <UserDetailsModal
        open={userDetailsModalOpen}
        user={selectedUser}
        onClose={handleUserDetailsClose}
        onEdit={handleEditFromDetails}
      />

      <DeleteUserDialog
        open={deleteUserDialogOpen}
        user={selectedUser}
        onClose={handleDeleteUserClose}
        onUserDeleted={handleUserDeleted}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Manage User Accounts Modal */}
      <ManageUserAccountsModal
        open={manageAccountsModalOpen}
        onClose={() => {
          setManageAccountsModalOpen(false);
          setSelectedUserForAccounts(null);
        }}
        user={selectedUserForAccounts}
        onSuccess={(message) => {
          setSnackbar({ open: true, message, severity: 'success' });
          loadUsers(); // Refresh the users list
        }}
        onError={(message) => {
          setSnackbar({ open: true, message, severity: 'error' });
        }}
      />

      <AdminSessionsModal
        open={adminSessionsModalOpen}
        username={adminSessionsUsername}
        onClose={() => {
          setAdminSessionsModalOpen(false);
          setAdminSessionsUsername(null);
        }}
      />

      <UserAttributesModal
        open={userAttributesModalOpen}
        onClose={() => setUserAttributesModalOpen(false)}
      />
    </>
  );
};

export default UserManagement;
