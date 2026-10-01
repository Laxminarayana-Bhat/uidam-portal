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
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Approval as ApprovalIcon,
  Apps as AppsIcon,
  AccountCircle,
  Logout,
  LightMode,
  DarkMode,
  LockReset as LockResetIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@store/index';
import { toggleSidebar } from '@store/slices/uiSlice';
import { logout, updateUser } from '@store/slices/authSlice';
import { useTheme } from '@hooks/useTheme';
import { useScopes } from '@hooks/useScopes';
import { FEATURE_FLAGS, OAUTH_CONFIG } from '@config/app.config';
import { UserService } from '@services/userService';
import { authService } from '@services/auth.service';
import { SessionService } from '@services/sessionService';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const dispatch = useDispatch();
  const { themeMode, toggleThemeMode } = useTheme();
  const { hasAnyScope, hasScope } = useScopes();
  const canSelfManage = hasScope('SelfManage');

  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: `/uidam/${tenantId}/dashboard`,
      feature: FEATURE_FLAGS.DASHBOARD,
      requiredScopes: ['ManageAccounts', 'TenantAdmin'],
    },
    {
      text: 'User Management',
      icon: <PeopleIcon />,
      path: `/uidam/${tenantId}/users`,
      feature: FEATURE_FLAGS.USER_MANAGEMENT,
      requiredScopes: ['ViewUsers', 'ManageUsers'],
    },
    {
      text: 'Account Management',
      icon: <BusinessIcon />,
      path: `/uidam/${tenantId}/accounts`,
      feature: FEATURE_FLAGS.ACCOUNT_MANAGEMENT,
      requiredScopes: ['ViewAccounts', 'ManageAccounts'],
    },
    {
      text: 'Role Management',
      icon: <SecurityIcon />,
      path: `/uidam/${tenantId}/roles`,
      feature: FEATURE_FLAGS.ROLE_MANAGEMENT,
      requiredScopes: ['ManageUserRolesAndPermissions'],
    },
    {
      text: 'Scope Management',
      icon: <AdminPanelSettingsIcon />,
      path: `/uidam/${tenantId}/scopes`,
      feature: FEATURE_FLAGS.SCOPE_MANAGEMENT,
      requiredScopes: ['ManageScopes'],
    },
    {
      text: 'Approval Workflow',
      icon: <ApprovalIcon />,
      path: `/uidam/${tenantId}/approvals`,
      feature: FEATURE_FLAGS.APPROVAL_WORKFLOW,
      requiredScopes: ['ManageApprovals'],
    },
    {
      text: 'Client Management',
      icon: <AppsIcon />,
      path: `/uidam/${tenantId}/clients`,
      feature: FEATURE_FLAGS.CLIENT_MANAGEMENT,
      requiredScopes: ['ManageClients', 'OAuth2ClientMgmt'],
    },
    {
      text: 'Assistant',
      icon: <AdminPanelSettingsIcon />,
      path: `/uidam/${tenantId}/assistant`,
      feature: false, // Removed from sidebar as per requirement; set to true to re-enable
      requiredScopes: [] as string[],
    },
  ].filter(item => item.feature);

  // Filter nav items by token scopes: items with no requiredScopes are always shown;
  // items with requiredScopes are shown only if the token contains at least one.
  const visibleNavItems = navigationItems.filter(
    item => item.requiredScopes.length === 0 || hasAnyScope(...item.requiredScopes)
  );

  const { sidebarOpen } = useSelector((state: RootState) => state.ui);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // Close the profile dropdown menu whenever the route changes
  React.useEffect(() => {
    setAnchorEl(null);
  }, [location.pathname]);

  // Cross-tab logout detection via the browser Storage event.
  // The browser fires a 'storage' event on every OTHER tab/window in the same
  // origin whenever localStorage changes. When Window 1 logs out and removes
  // the access token, Window 2 receives this event immediately and logs out too
  // — no page refresh, no polling delay.
  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        event.key === OAUTH_CONFIG.TOKEN_STORAGE_KEY &&
        event.newValue === null          // key was removed
      ) {
        dispatch(logout());
        navigate('/login');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch, navigate]);

  // Session validity heartbeat — polls every 30 s to detect remote token revocation.
  // If the token was invalidated server-side (e.g. another admin terminated this
  // session), SessionService.request() will clear localStorage and redirect to /login.
  // Any other error (network, 5xx) is silently ignored so normal usage is unaffected.
  React.useEffect(() => {
    const HEARTBEAT_INTERVAL = 30_000;
    const id = setInterval(async () => {
      try {
        await SessionService.getActiveSessions();
      } catch {
        // 401 → SessionService already cleared tokens and redirected.
        // Other transient errors are intentionally swallowed here.
      }
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Visibility-based session check — fires immediately when this tab or window
  // becomes visible again (e.g. user alt-tabs back, un-minimises, or switches
  // browser windows). This is the primary mechanism for detecting cross-browser
  // session invalidation: when the user logs in on Browser B the server revokes
  // Browser A's token; the next time the user looks at Browser A the check fires
  // and redirects to /login without waiting for the next 30-second heartbeat tick.
  React.useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await SessionService.getActiveSessions();
        } catch {
          // 401 → SessionService already cleared tokens and redirected.
          // Other transient errors are intentionally swallowed here.
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fetch full user profile on mount to get firstName and lastName
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await UserService.getSelfUser();
        if (response.data) {
          // Map User to AuthUser format
          const userData = response.data;
          dispatch(updateUser({
            id: String(userData.id),
            userName: userData.userName,
            email: userData.email || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            roles: userData.roles || [],
            scopes: [], // User service doesn't return scopes, will be populated from token
            accounts: userData.accounts?.map(a => a.account) || []
          }));
        } else if ('id' in response && typeof response.id === 'number') {
          const userData = response as { id: number; userName: string; email: string; firstName: string; lastName: string; roles?: string[]; accounts?: Array<{ account: string }> };
          dispatch(updateUser({
            id: String(userData.id),
            userName: userData.userName,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            roles: userData.roles || [],
            scopes: [],
            accounts: userData.accounts?.map(a => a.account) || []
          }));
        }
      } catch (error) {
        console.error('Failed to fetch user profile in Layout:', error);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.id]);

  const handleDrawerToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      // Call auth service logout to hit the OAuth2 logout endpoint
      await authService.logout();
      
      // Clear Redux state
      dispatch(logout());
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      dispatch(logout());
      navigate('/login');
    } finally {
      handleMenuClose();
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            fontWeight: 700,
            color: 'white',
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '1.1rem'
          }}
        >
          UIDAM Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {visibleNavItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 700,
                  },
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '& .MuiListItemText-primary': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                },
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  '& .MuiListItemText-primary': {
                    fontWeight: 700,
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 2px 8px rgba(0, 166, 227, 0.1)',
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}> {/* Slightly taller header */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* UIDAM Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img 
              src="/images/logo.svg" 
              alt="UIDAM" 
              style={{ 
                height: '56px', // Increased from 40px
                width: 'auto',
                marginRight: '16px' // Slightly more space
              }} 
            />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: 'white',
                fontSize: '1.2rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              UIDAM Admin Portal
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Current Page Title */}
          <Typography 
            variant="body1" 
            sx={{ 
              mr: 2, 
              fontWeight: 700,
              color: 'text.primary',
              fontSize: '1rem',
              display: { xs: 'none', md: 'block' },
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {visibleNavItems.find(item => location.pathname.startsWith(item.path))?.text ?? 'Dashboard'}
          </Typography>
          
          <IconButton color="inherit" onClick={toggleThemeMode}>
            {themeMode === 'light' ? <DarkMode /> : <LightMode />}
          </IconButton>
          
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="account-menu"
            aria-haspopup="true"
            onClick={handleMenuClick}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {(user?.firstName?.[0] ?? user?.userName?.split('@')[0]?.[0] ?? user?.email?.split('@')[0]?.[0] ?? 'U').toUpperCase()}
            </Avatar>
          </IconButton>
          
          {anchorEl && (
          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={true}
            onClose={handleMenuClose}
            keepMounted={false}
            disableScrollLock
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleMenuClose}>
              <Avatar /> 
              {user?.firstName 
                ? user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.firstName
                : user?.userName
                  ? user.userName.split('@')[0]
                  : user?.email
                    ? user.email.split('@')[0]
                    : 'User'}
            </MenuItem>
            <Divider />
            {canSelfManage && (
              <MenuItem onClick={() => { setAnchorEl(null); navigate(`/uidam/${tenantId}/profile`); }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
            )}
            {canSelfManage && (
              <MenuItem onClick={() => { setAnchorEl(null); navigate(`/uidam/${tenantId}/change-password`); }}>
                <ListItemIcon>
                  <LockResetIcon fontSize="small" />
                </ListItemIcon>
                Change Password
              </MenuItem>
            )}
            <MenuItem onClick={() => { setAnchorEl(null); navigate(`/uidam/${tenantId}/sessions`); }}>
              <ListItemIcon>
                <DevicesIcon fontSize="small" />
              </ListItemIcon>
              Manage Active Sessions
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={sidebarOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop Sidebar */}
      {sidebarOpen && (
        <Box
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                borderRight: 'none',
                position: 'relative',
                height: '100vh',
              },
            }}
          >
            {drawer}
          </Drawer>
        </Box>
      )}
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: 0, // Fix for horizontal overflow
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ 
          flex: 1, 
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 64px)',
          width: '100%', // Ensure content fits within container
        }}>
          {children}
        </Box>
      </Box>
      {/* Floating assistant widget removed - using sidebar menu instead */}
    </Box>
  );
};

export default Layout;
