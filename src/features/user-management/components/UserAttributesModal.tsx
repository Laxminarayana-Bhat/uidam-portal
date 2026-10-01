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
import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ListAlt as ListAltIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { UserService, UserAttribute, UserMetaDataRequest } from '../../../services/userService';
import { StyledTableHead, StyledTableRow } from '../../../components/shared/StyledTableComponents';
import { useScopes } from '@hooks/useScopes';
import { ATTRIBUTE_TYPE_OPTIONS, getAttributeTypeOptionValue, getAttributeTypeLabel } from '../../../utils/attributeTypeUtils';

interface UserAttributesModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM: UserMetaDataRequest = {
  name: '',
  attributeLabel: '',
  type: ATTRIBUTE_TYPE_OPTIONS[0].value,
  regex: '.*',
  mandatory: false,
  unique: false,
  readOnly: false,
  searchable: false,
  // New attributes added from this dialog are always custom/dynamic fields
  dynamicAttribute: true,
};

// MUI dims disabled input text via -webkit-text-fill-color, which is hard to read;
// override it so read-only (view mode) fields stay fully legible while still non-editable.
const readOnlyFieldSx = (theme: Theme) => ({
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: theme.palette.text.primary,
    color: theme.palette.text.primary,
  },
  '& .MuiInputLabel-root.Mui-disabled': {
    color: theme.palette.text.secondary,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.divider,
  },
});

const BooleanChip: React.FC<{ value: boolean }> = ({ value }) => (
  <Chip
    size="small"
    icon={value ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
    label={value ? 'Yes' : 'No'}
    color={value ? 'success' : 'default'}
    variant={value ? 'filled' : 'outlined'}
  />
);

const UserAttributesModal: React.FC<UserAttributesModalProps> = ({ open, onClose }) => {
  const { hasScope } = useScopes();
  const canManageAttributes = hasScope('ManageUsers');

  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add/Edit/View form state (view mode reuses this dialog in a read-only state)
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [formData, setFormData] = useState<UserMetaDataRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<UserAttribute | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await UserService.getUserAttributes();
      setAttributes(response.data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch user attributes';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAttributes();
    } else {
      setAttributes([]);
      setError(null);
      setSuccess(null);
    }
  }, [open, fetchAttributes]);

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (attribute: UserAttribute) => {
    setFormMode('edit');
    setFormData({
      name: attribute.name,
      attributeLabel: attribute.attributeLabel ?? '',
      type: getAttributeTypeOptionValue(attribute.type),
      regex: attribute.regex || '.*',
      mandatory: attribute.mandatory,
      unique: attribute.unique,
      readOnly: attribute.readOnly,
      searchable: attribute.searchable,
      dynamicAttribute: attribute.dynamicAttribute,
    });
    setError(null);
    setFormOpen(true);
  };

  const handleOpenView = (attribute: UserAttribute) => {
    setFormMode('view');
    setFormData({
      name: attribute.name,
      attributeLabel: attribute.attributeLabel ?? '',
      type: getAttributeTypeOptionValue(attribute.type),
      regex: attribute.regex || '.*',
      mandatory: attribute.mandatory,
      unique: attribute.unique,
      readOnly: attribute.readOnly,
      searchable: attribute.searchable,
      dynamicAttribute: attribute.dynamicAttribute,
    });
    setFormOpen(true);
  };

  const handleFormClose = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const handleFormSave = async () => {
    if (!formData.name.trim()) {
      setError('Attribute name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Existing PUT endpoint is reused for both creating and modifying an attribute definition
      const payload: UserMetaDataRequest = { ...formData, regex: formData.regex?.trim() || '.*' };
      await UserService.updateUserAttributes([payload]);
      setSuccess(formMode === 'create' ? 'Attribute created successfully' : 'Attribute updated successfully');
      setFormOpen(false);
      await fetchAttributes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save attribute';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await UserService.deleteUserAttribute(deleteTarget.name);
      setSuccess('Attribute deleted successfully');
      setDeleteTarget(null);
      await fetchAttributes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete attribute';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
          <ListAltIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">User Attributes</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Additional field definitions for the user entity
          </Typography>
        </Box>
        {canManageAttributes && (
          <Tooltip title="Add Attribute">
            <IconButton onClick={handleOpenCreate} sx={{ color: 'white' }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Refresh">
          <IconButton onClick={fetchAttributes} disabled={loading} sx={{ color: 'white' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* While the form or delete dialog is open, its own alert shows the error instead of this hidden-behind-the-modal one */}
        {error && !formOpen && !deleteTarget && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : attributes.length === 0 && !error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
            <Typography variant="body1" color="text.secondary">
              No additional attribute definitions found.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <StyledTableHead>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">Mandatory</TableCell>
                <TableCell align="center">Dynamic</TableCell>
                <TableCell align="center">Actions</TableCell>
              </StyledTableHead>
              <TableBody>
                {attributes.map((attribute) => (
                  <StyledTableRow key={attribute.id ?? attribute.name}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {attribute.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={getAttributeTypeLabel(attribute.type)} variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell align="center"><BooleanChip value={attribute.mandatory} /></TableCell>
                    <TableCell align="center"><BooleanChip value={attribute.dynamicAttribute} /></TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleOpenView(attribute)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canManageAttributes && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenEdit(attribute)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => { setError(null); setDeleteTarget(attribute); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>

      {/* Add / Edit / View attribute form — view mode renders every field disabled */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          {formMode === 'create' && 'Add Attribute'}
          {formMode === 'edit' && `Edit Attribute — ${formData.name}`}
          {formMode === 'view' && `Attribute Details — ${formData.name}`}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={formMode !== 'create'}
              required
              fullWidth
              size="small"
              sx={formMode === 'view' ? readOnlyFieldSx : undefined}
            />
            <TextField
              label="Label"
              value={formData.attributeLabel}
              onChange={(e) => setFormData({ ...formData, attributeLabel: e.target.value })}
              disabled={formMode === 'view'}
              fullWidth
              size="small"
              sx={formMode === 'view' ? readOnlyFieldSx : undefined}
            />
            <TextField
              select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              // Changing the type of an existing attribute risks a data type mismatch, so it's locked after creation
              disabled={formMode !== 'create'}
              required
              fullWidth
              size="small"
              sx={formMode !== 'create' ? readOnlyFieldSx : undefined}
            >
              {ATTRIBUTE_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Regex"
              value={formData.regex}
              onChange={(e) => setFormData({ ...formData, regex: e.target.value })}
              placeholder=".*"
              disabled={formMode === 'view'}
              fullWidth
              size="small"
              sx={formMode === 'view' ? readOnlyFieldSx : undefined}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.mandatory}
                  onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                  disabled={formMode === 'view'}
                />
              }
              label="Mandatory"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.unique}
                  onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
                  disabled={formMode === 'view'}
                />
              }
              label="Unique"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.readOnly}
                  onChange={(e) => setFormData({ ...formData, readOnly: e.target.checked })}
                  disabled={formMode === 'view'}
                />
              }
              label="Read Only"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.searchable}
                  onChange={(e) => setFormData({ ...formData, searchable: e.target.checked })}
                  disabled={formMode === 'view'}
                />
              }
              label="Searchable"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.dynamicAttribute}
                  onChange={(e) => setFormData({ ...formData, dynamicAttribute: e.target.checked })}
                  disabled={formMode === 'view'}
                />
              }
              label="Dynamic Attribute"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {formMode === 'view' ? (
            <>
              <Button onClick={handleFormClose} variant="outlined">Close</Button>
              {canManageAttributes && (
                <Button onClick={() => setFormMode('edit')} variant="contained" startIcon={<EditIcon />}>
                  Edit
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={handleFormClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleFormSave} variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Attribute</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2">
            Are you sure you want to delete the attribute <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

    </Dialog>
  );
};

export default UserAttributesModal;

