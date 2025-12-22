import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  InputAdornment
} from '@mui/material';

const ManualTransferModal = ({
  open,
  onClose,
  manualData,
  handleManualChange,
  handleSubmitManual,
  loadingManual,
  usersList = [], // Default to empty array to prevent map errors
  isEditing
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Editar Transferencia' : 'Cargar Manual (Otros Bancos)'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="ID Transacción"
            name="id_transaccion"
            fullWidth
            value={manualData.id_transaccion}
            onChange={handleManualChange}
            placeholder="Ej: 999111222"
          />

          <FormControl fullWidth>
            <InputLabel>Banco</InputLabel>
            <Select
              name="banco"
              value={manualData.banco}
              label="Banco"
              onChange={handleManualChange}
            >
              <MenuItem value="Santander">Santander</MenuItem>
              <MenuItem value="Nacion">Nación</MenuItem>
              <MenuItem value="Santa Fe">Santa Fe</MenuItem>
              <MenuItem value="Macro">Macro</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Fecha Real"
            name="fecha_real"
            type="datetime-local"
            fullWidth
            value={manualData.fecha_real}
            onChange={handleManualChange}
            InputLabelProps={{
              shrink: true,
            }}
          />

          <TextField
            label="Monto"
            name="monto"
            type="number"
            fullWidth
            value={manualData.monto}
            onChange={handleManualChange}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />

          <FormControl fullWidth>
            <InputLabel>Cliente</InputLabel>
            <Select
              name="userId"
              value={manualData.userId}
              label="Cliente"
              onChange={handleManualChange}
            >
              <MenuItem value="">
                <em>Libre</em>
              </MenuItem>
              {usersList.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  {u.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmitManual} variant="contained" disabled={loadingManual}>
          {loadingManual ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualTransferModal;
