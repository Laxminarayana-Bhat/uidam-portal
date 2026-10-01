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
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Divider,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Close as CloseIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { User } from '../../../services/userService';
import { useScopes } from '@hooks/useScopes';
import UserAttributeValues from './UserAttributeValues';

interface UserDetailsModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onEdit?: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  open,
  user,
  onClose,
  onEdit,
}) => {
  const { hasScope } = useScopes();
  if (!user) return null;

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
          <PersonIcon />
        </Avatar>
        <Box>
          <Typography variant="h6">User Details</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {user.userName}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Chip
            label={user.status}
            color={getStatusColor(user.status) as 'success' | 'warning' | 'error' | 'default'}
            sx={{ mr: 1 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Personal Information Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 2,
                  color: 'primary.main'
                }}>
                  <PersonIcon />
                  Personal Information
                </Typography>
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Full Name"
                      secondary={`${user.firstName} ${user.lastName}`}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <EmailIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email"
                      secondary={user.email}
                    />
                  </ListItem>
                  {user.phoneNumber && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <PhoneIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Phone"
                        secondary={user.phoneNumber}
                      />
                    </ListItem>
                  )}
                  {user.gender && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Gender"
                        secondary={user.gender}
                      />
                    </ListItem>
                  )}
                  {user.birthDate && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <CalendarIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Birth Date"
                        secondary={formatDate(user.birthDate)}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Address Information Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 2,
                  color: 'primary.main'
                }}>
                  <LocationIcon />
                  Address Information
                </Typography>
                <List dense>
                  {user.address1 && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Address"
                        secondary={
                          <Box>
                            <Typography variant="body2">{user.address1}</Typography>
                            {user.address2 && (
                              <Typography variant="body2">{user.address2}</Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  )}
                  {(user.city || user.state || user.country) && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Location"
                        secondary={[user.city, user.state, user.country]
                          .filter(Boolean)
                          .join(', ')}
                      />
                    </ListItem>
                  )}
                  {user.postalCode && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Postal Code"
                        secondary={user.postalCode}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* System Information Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 2,
                  color: 'primary.main'
                }}>
                  <SecurityIcon />
                  System Information
                </Typography>
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="User ID"
                      secondary={user.id}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Username"
                      secondary={user.userName}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Status"
                      secondary={
                        <Chip
                          label={user.status}
                          color={getStatusColor(user.status) as 'success' | 'warning' | 'error' | 'default'}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  {user.locale && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <LanguageIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Locale"
                        secondary={user.locale}
                      />
                    </ListItem>
                  )}
                  {user.timeZone && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Time Zone"
                        secondary={user.timeZone}
                      />
                    </ListItem>
                  )}
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Notification Consent"
                      secondary={user.notificationConsent ? 'Yes' : 'No'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Account & Roles Information Card */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 2,
                  color: 'primary.main'
                }}>
                  <BusinessIcon />
                  Accounts & Roles
                </Typography>
                
                {user.accounts && user.accounts.length > 0 && (
                  <Box>
                    {user.accounts.map((account: { account: string; roles: string[] }) => (
                      <Box key={`${account.account}-${user.id}`} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Account: {account.account}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {account.roles.map((role: string) => (
                            <Chip
                              key={`${account.account}-${role}`}
                              label={role}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </Box>
                        {user.accounts && account !== user.accounts[user.accounts.length - 1] && (
                          <Divider sx={{ mt: 2 }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
                {(!user.accounts || user.accounts.length === 0) && user.roles && user.roles.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {user.roles.map((role: string) => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                )}
                {(!user.accounts || user.accounts.length === 0) && (!user.roles || user.roles.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    No accounts or roles assigned
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Per-user Additional Attribute Values */}
          <Grid item xs={12}>
            <UserAttributeValues userId={user.id} canEdit={hasScope('ManageUsers')} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          startIcon={<CloseIcon />}
        >
          Close
        </Button>
        {onEdit && (
          <Button 
            onClick={onEdit} 
            variant="contained"
            startIcon={<EditIcon />}
          >
            Edit User
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailsModal;
