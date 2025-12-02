import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Las constantes de opciones se mueven aquí, ya que son específicas de los filtros.
const BANK_OPTIONS = ['Mercado Pago', 'Santander', 'Nacion', 'Santa Fe', 'Macro'];
const CLAIM_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'claimed', label: 'Reclamadas' },
  { value: 'unclaimed', label: 'No Reclamadas' }
];

const TransferFilters = ({
  isAdmin,
  tabValue,
  montoFilter, setMontoFilter,
  fechaFilter, setFechaFilter,
  adminUserFilter, setAdminUserFilter,
  dateFromFilter, setDateFromFilter,
  dateToFilter, setDateToFilter,
  bankFilter, handleBankFilterChange,
  claimStatusFilter, setClaimStatusFilter,
  handleSearchSubmit,
  handleExportPDF,
  transferenciasCount = 0 // Recibimos solo el número de transferencias
}) => {
  // El formulario de filtros no se muestra en la pestaña de "Otros Bancos" del Admin
  if (isAdmin && tabValue === 2) {
    return null;
  }

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fff' }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        {isAdmin ? 'Filtros Globales (Admin)' : 'Filtros de Búsqueda'}
      </Typography>
      <Box component="form" onSubmit={handleSearchSubmit}>
        <Grid container spacing={2} alignItems="center">

          {!isAdmin ? (
            // Filtros para Usuario
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  placeholder="Monto Exacto"
                  type="number"
                  label="Monto"
                  variant="outlined"
                  value={montoFilter}
                  onChange={(e) => setMontoFilter(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  variant="outlined"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  size="small"
                />
              </Grid>
            </>
          ) : (
            // Filtros para Admin
            <>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl sx={{ width: '100%' }} size="small">
                  <InputLabel id="bank-filter-label">Bancos</InputLabel>
                  <Select
                    labelId="bank-filter-label"
                    multiple
                    value={bankFilter}
                    onChange={handleBankFilterChange}
                    input={<OutlinedInput label="Bancos" />}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    <MenuItem value="Todas">
                      <ListItemText primary="-- Todos los bancos --" />
                    </MenuItem>
                    {BANK_OPTIONS.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={bankFilter.indexOf(name) > -1} size="small" />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={claimStatusFilter}
                    label="Estado"
                    onChange={(e) => setClaimStatusFilter(e.target.value)}
                  >
                    {CLAIM_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Desde"
                  type="date"
                  variant="outlined"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Hasta"
                  type="date"
                  variant="outlined"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  placeholder="email@ejemplo.com"
                  label="Email"
                  type="text"
                  variant="outlined"
                  value={adminUserFilter}
                  onChange={(e) => setAdminUserFilter(e.target.value)}
                  size="small"
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={3} container spacing={1}>
            <Grid item xs={isAdmin ? 6 : 12}>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                fullWidth
                startIcon={<FilterListIcon />}
              >
                {isAdmin ? 'Filtrar' : 'Buscar'}
              </Button>
            </Grid>

            {isAdmin && (
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={handleExportPDF}
                  disabled={transferenciasCount === 0}
                  startIcon={<PictureAsPdfIcon />}
                >
                  PDF
                </Button>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default TransferFilters;
