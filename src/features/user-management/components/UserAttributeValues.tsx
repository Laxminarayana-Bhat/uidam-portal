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
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  ListAlt as ListAltIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { UserService, UserAttributeValue, UserAttribute } from '../../../services/userService';
import { StyledTableHead, StyledTableRow } from '../../../components/shared/StyledTableComponents';
import { getAttributeTypeOptionValue } from '../../../utils/attributeTypeUtils';

interface UserAttributeValuesProps {
  userId: string;
  canEdit: boolean;
}

const EMPTY_FORM: UserAttributeValue = { name: '', value: '' };

const UserAttributeValues: React.FC<UserAttributeValuesProps> = ({ userId, canEdit }) => {
  const [values, setValues] = useState<UserAttributeValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [attributeDefs, setAttributeDefs] = useState<UserAttribute[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<UserAttributeValue>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserAttributeValue | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchValues = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await UserService.getUserAttributeValues(userId);
      setValues(response.data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch attribute values';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  // Attribute name options for the Add dialog come from the additional attribute definitions
  useEffect(() => {
    UserService.getUserAttributes()
      .then((response) => setAttributeDefs(response.data ?? []))
      .catch(() => setAttributeDefs([]));
  }, []);

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (attributeValue: UserAttributeValue) => {
    const isReadOnly = attributeDefs.find((def) => def.name === attributeValue.name)?.readOnly ?? false;
    if (isReadOnly) return;
    setFormMode('edit');
    setFormData(attributeValue);
    setError(null);
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
    if (valueTypeCategory === 'bool') {
      if (formData.value !== 'true' && formData.value !== 'false') {
        setError('Attribute value is required');
        return;
      }
    } else if (!formData.value.trim()) {
      setError('Attribute value is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await UserService.updateUserAttributeValues(userId, [formData]);
      setSuccess(formMode === 'create' ? 'Attribute value added successfully' : 'Attribute value updated successfully');
      setFormOpen(false);
      await fetchValues();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save attribute value';
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
      await UserService.deleteUserAttributeValue(userId, deleteTarget.name);
      setSuccess('Attribute value deleted successfully');
      setDeleteTarget(null);
      await fetchValues();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete attribute value';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // The selected attribute's definition drives which input widget the Value field renders
  const selectedAttributeDef = attributeDefs.find((def) => def.name === formData.name);
  const valueTypeCategory = getAttributeTypeOptionValue(selectedAttributeDef?.type);
  // Boolean values always default to 'true'/'false', so only other types can be "empty"
  const isValueMissing = valueTypeCategory !== 'bool' && !formData.value.trim();
  const isSaveDisabled = saving || !formData.name.trim() || isValueMissing;

  const renderValueField = () => {
    switch (valueTypeCategory) {
      case 'bool':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={formData.value === 'true'}
                onChange={(e) => setFormData({ ...formData, value: e.target.checked ? 'true' : 'false' })}
              />
            }
            label="Value"
          />
        );
      case 'numeric':
        return (
          <TextField
            label="Value"
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            required
            fullWidth
            size="small"
          />
        );
      case 'date':
        return (
          <TextField
            label="Value"
            type="date"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            size="small"
          />
        );
      case 'timestamp':
        return (
          <TextField
            label="Value"
            type="datetime-local"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            size="small"
          />
        );
      case 'json':
        return (
          <TextField
            label="Value"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder='{ "key": "value" }'
            multiline
            minRows={4}
            required
            fullWidth
            size="small"
          />
        );
      case '_text':
        return (
          <TextField
            label="Value"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            helperText="Comma-separated values"
            required
            fullWidth
            size="small"
          />
        );
      default:
        return (
          <TextField
            label="Value"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            required
            fullWidth
            size="small"
          />
        );
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
            <ListAltIcon />
            Additional Attributes
          </Typography>
          {canEdit && (
            <Tooltip title="Add Attribute Value">
              <IconButton size="small" color="primary" onClick={handleOpenCreate}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* While the dialog is open, its own alert shows the error instead of this hidden-behind-the-modal one */}
        {error && !formOpen && (
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : values.length === 0 && !error ? (
          <Typography variant="body2" color="text.secondary">
            No additional attribute values set for this user.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <StyledTableHead>
                <TableCell>Name</TableCell>
                <TableCell>Value</TableCell>
                {canEdit && <TableCell align="center">Actions</TableCell>}
              </StyledTableHead>
              <TableBody>
                {values.map((attributeValue) => {
                  const isReadOnly = attributeDefs.find((def) => def.name === attributeValue.name)?.readOnly ?? false;
                  return (
                    <StyledTableRow key={attributeValue.name}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {attributeValue.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{attributeValue.value}</TableCell>
                      {canEdit && (
                        <TableCell align="center">
                          <Tooltip title={isReadOnly ? 'Read-only attribute' : 'Edit'}>
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Edit"
                                onClick={() => handleOpenEdit(attributeValue)}
                                disabled={isReadOnly}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(attributeValue)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </StyledTableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* Add / Edit attribute value form */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="xs" fullWidth>
        <DialogTitle>{formMode === 'create' ? 'Add Attribute Value' : `Edit Attribute Value — ${formData.name}`}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {formMode === 'create' ? (
              <TextField
                select
                label="Name"
                value={formData.name}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const selectedDef = attributeDefs.find((def) => def.name === selectedName);
                  const selectedTypeCategory = getAttributeTypeOptionValue(selectedDef?.type);
                  setFormData({
                    name: selectedName,
                    value: selectedTypeCategory === 'bool' ? 'false' : '',
                  });
                }}
                required
                fullWidth
                size="small"
              >
                {attributeDefs
                  .filter((def) => !values.some((v) => v.name === def.name))
                  .map((def) => (
                    <MenuItem key={def.name} value={def.name}>
                      {def.attributeLabel || def.name}
                    </MenuItem>
                  ))}
              </TextField>
            ) : (
              <TextField
                label="Name"
                value={formData.name}
                disabled
                required
                fullWidth
                size="small"
              />
            )}
            {renderValueField()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFormClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleFormSave} variant="contained" disabled={isSaveDisabled}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Attribute Value</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete the value for <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default UserAttributeValues;
