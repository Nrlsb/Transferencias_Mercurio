import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Transferencia from './Transferencia';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

function Dashboard({ session }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para filtros
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');

  const fetchTransferencias = async (queryParams = '') => {
    setLoading(true);
    setError(null);

    if (!session?.access_token) {
        setError("No hay una sesión de usuario válida. Por favor, inicie sesión de nuevo.");
        setLoading(false);
        return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transferencias${queryParams}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'La respuesta del servidor no es un JSON válido.' }));
        throw new Error(`Error ${response.status}: ${errorData.error}`);
      }
      
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferencias();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (montoFilter) params.append('monto', montoFilter);
    if (dniFilter) params.append('dni', dniFilter);
    if (fechaFilter) {
      const utcDateString = new Date(fechaFilter).toISOString();
      params.append('fecha', utcDateString);
    }
    
    fetchTransferencias(`?${params.toString()}`);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };
  
  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* --- Header / AppBar Simple y Limpio --- */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#fff' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#1976d2', fontWeight: 'bold' }}>
            Mercurio Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {session.user.email}
            </Typography>
            <Button 
              color="primary" 
              variant="outlined"
              onClick={handleLogout} 
              startIcon={<LogoutIcon />}
              size="small"
            >
              Salir
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Historial de Transferencias
        </Typography>

        {/* --- Filtros --- */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Box component="form" onSubmit={handleFilter}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  placeholder="Monto Exacto"
                  type="number"
                  variant="outlined"
                  value={montoFilter}
                  onChange={(e) => setMontoFilter(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  placeholder="DNI del Pagador"
                  type="text"
                  variant="outlined"
                  value={dniFilter}
                  onChange={(e) => setDniFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  variant="outlined"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disableElevation
                  fullWidth 
                  startIcon={<FilterListIcon />}
                >
                  Filtrar Resultados
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* --- Área de Contenido (Tabla) --- */}
        <Box>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Table sx={{ minWidth: 650 }} aria-label="tabla de transferencias">
                <TableHead sx={{ bgcolor: '#fafafa' }}>
                  <TableRow>
                    <TableCell>ID Transacción</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Pagador</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Monto (ARS)</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transferencias.length > 0 ? (
                    transferencias.map(transferencia => (
                      <Transferencia key={transferencia.id_pago} transferencia={transferencia} />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary">
                            No se encontraron transferencias con los filtros aplicados.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

      </Container>
    </Box>
  );
}

export default Dashboard;