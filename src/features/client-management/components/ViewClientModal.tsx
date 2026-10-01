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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  FileCopy as CopyIcon,
} from '@mui/icons-material';
import { ClientListItem, AUTH_METHODS } from '../../../types/client';

// Helper component for rendering URI lists with copy functionality
interface UriListProps {
  title: string;
  uris: string[];
  onCopy: (uri: string, label: string) => void;
}

const UriList: React.FC<UriListProps> = ({ title, uris, onCopy }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <List dense>
      {Array.from(uris || []).map((uri: string, index: number) => (
        <ListItem key={`${title}-${index}-${uri}`} sx={{ px: 0 }}>
          <ListItemText
            primary={
              <Typography fontFamily="monospace" fontSize="0.85rem">
                {uri}
              </Typography>
            }
          />
          <Tooltip title="Copy URI">
            <IconButton
              size="small"
              onClick={() => onCopy(uri, title)}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ListItem>
      ))}
    </List>
  </Paper>
);

interface ViewClientModalProps {
  open: boolean;
  onClose: () => void;
  client: ClientListItem;
}

// The client list (POST /v1/oauth2/client/filter) already returns every field this view needs,
// so there's no need for a separate GET /v1/oauth2/client/{id} call just to display it read-only.
export const ViewClientModal: React.FC<ViewClientModalProps> = ({
  open,
  onClose,
  client
}) => {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(`${label} copied to clipboard`);
  };

  const formatTokenValidity = (seconds?: number) => {
    if (!seconds) return 'Not set';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  // A client only has a secret when it uses a secret-based authentication method
  const usesClientSecret = !!client.clientAuthenticationMethods?.some(
    (method) => method === AUTH_METHODS.CLIENT_SECRET_BASIC || method === AUTH_METHODS.CLIENT_SECRET_POST
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Client Details</Typography>
          {client.status && (
            <Chip
              label={client.status}
              color={client.status === 'ACTIVE' ? 'success' : 'default'}
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {copySuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {copySuccess}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Client ID
                </Typography>
                <Tooltip title="Copy Client ID">
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(client.clientId, 'Client ID')}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography fontFamily="monospace" fontSize="0.9rem">
                {client.clientId}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Client Name
              </Typography>
              <Typography>
                {client.clientName}
              </Typography>
            </Paper>
          </Grid>

          {usesClientSecret && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Client Secret
                </Typography>
                <Typography fontFamily="monospace" fontSize="0.9rem">
                  {'•'.repeat(24)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Client secrets are not displayed for security reasons. Reset the secret from the Edit screen if needed.
                </Typography>
              </Paper>
            </Grid>
          )}

          {/* OAuth2 Configuration */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              OAuth2 Configuration
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Authorization Grant Types
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {Array.from(client.authorizationGrantTypes || []).map((type: string) => (
                  <Chip key={type} label={type} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Authentication Methods
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {Array.from(client.clientAuthenticationMethods || []).map((method: string) => (
                  <Chip key={method} label={method} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Scopes
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {Array.from(client.scopes || []).map((scope: string) => (
                  <Chip key={scope} label={scope} size="small" color="primary" variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* URI Configuration */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              URI Configuration
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <UriList
              title="Redirect URIs"
              uris={client.redirectUris || []}
              onCopy={handleCopy}
            />
          </Grid>

          {client.postLogoutRedirectUris && client.postLogoutRedirectUris.length > 0 && (
            <Grid item xs={12} md={6}>
              <UriList
                title="Post Logout Redirect URIs"
                uris={client.postLogoutRedirectUris}
                onCopy={handleCopy}
              />
            </Grid>
          )}

          {/* Token Validity */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Token Validity
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Access Token
              </Typography>
              <Typography variant="h6">
                {formatTokenValidity(client.accessTokenValidity)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Refresh Token
              </Typography>
              <Typography variant="h6">
                {formatTokenValidity(client.refreshTokenValidity)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Authorization Code
              </Typography>
              <Typography variant="h6">
                {formatTokenValidity(client.authorizationCodeValidity)}
              </Typography>
            </Paper>
          </Grid>

          {/* Additional Information */}
          {(client.requireAuthorizationConsent !== undefined || 
            client.additionalInformation || 
            client.requestedBy) && (
            <>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Additional Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              {client.requireAuthorizationConsent !== undefined && (
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Requires Authorization Consent
                    </Typography>
                    <Chip 
                      label={client.requireAuthorizationConsent ? 'Yes' : 'No'}
                      color={client.requireAuthorizationConsent ? 'success' : 'default'}
                      size="small"
                    />
                  </Paper>
                </Grid>
              )}

              {client.requestedBy && (
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Requested By
                    </Typography>
                    <Typography>
                      {client.requestedBy}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {client.additionalInformation && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Additional Information
                    </Typography>
                    <Typography 
                      component="pre" 
                      sx={{ 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}
                    >
                      {client.additionalInformation}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
