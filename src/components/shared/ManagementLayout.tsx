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
import { Box, Typography, Button, CircularProgress, Backdrop } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ManagementLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  error?: React.ReactNode;
  success?: React.ReactNode;
  onRefresh?: () => void;
  beforeRefreshActions?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const ManagementLayout: React.FC<ManagementLayoutProps> = ({
  title,
  subtitle,
  icon,
  loading = false,
  error,
  success,
  onRefresh,
  beforeRefreshActions,
  headerActions,
  children
}) => {
  return (
    <Box sx={{ 
      minHeight: 'calc(100vh - 200px)',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      margin: -3,
      padding: 3,
      position: 'relative'
    }}>
      {/* Full Screen Loading Overlay */}
      <Backdrop
        open={loading}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(128, 128, 128, 0.7)',
          zIndex: 9999
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Backdrop>

      <Box sx={{ 
        maxWidth: '1400px',
        mx: 'auto',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 4, 
          backgroundColor: 'primary.main', 
          color: 'white',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center',
                mb: subtitle ? 1 : 0,
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {icon && <Box sx={{ mr: 2, fontSize: 40 }}>{icon}</Box>}
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="subtitle1" sx={{ 
                  opacity: 1,
                  color: 'white',
                  fontWeight: 500,
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {beforeRefreshActions}
              {onRefresh && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={onRefresh}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': { 
                      borderColor: 'white', 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                    }
                  }}
                >
                  Refresh
                </Button>
              )}
              {headerActions}
            </Box>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 4 }}>
          {/* Messages */}
          {error && (
            <Box sx={{ mb: 3 }}>
              {error}
            </Box>
          )}
          
          {success && (
            <Box sx={{ mb: 3 }}>
              {success}
            </Box>
          )}

          {/* Main Content */}
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default ManagementLayout;
