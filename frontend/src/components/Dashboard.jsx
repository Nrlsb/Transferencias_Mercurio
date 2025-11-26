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
import FilterListIcon from '@mui/icons-material/FilterList';

function Dashboard({ session }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false); // Inicializamos en false para esperar filtro
  const [error, setError] = useState(null);
  const [filtersApplied, setFiltersApplied] = useState(false); // Nuevo estado para controlar mensaje inicial

  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');

  const fetchTransferencias = async (queryParams = '') => {
    setLoading(true);
    setError(null);

    if (!session?.access_token) {
        setError("No hay una sesión de usuario válida.");
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
        const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(errorData.error);
      }
      
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminamos el useEffect que cargaba todo al inicio para respetar la lógica de "requiere 2 filtros"
  // y evitar cargas masivas innecesarias.

  const handleFilter = (e) => {
    if(e) e.preventDefault();
    
    // Validación de filtros mínimos (Frontend)
    const activeFilters = [montoFilter, dniFilter, fechaFilter].filter(Boolean).length;
    if(activeFilters < 2) {
        setError("Por favor, ingrese al menos 2 criterios de búsqueda.");
        return;
    }

    setFiltersApplied(true);
    const params = new URLSearchParams();
    if (montoFilter) params.append('monto', montoFilter);
    if (dniFilter) params.append('dni', dniFilter);
    if (fechaFilter) {
      const utcDateString = new Date(fechaFilter).toISOString();
      params.append('fecha', utcDateString);
    }
    
    fetchTransferencias(`?${params.toString()}`);
  };

  // Función para recargar la lista si se reclama una transferencia
  const handleTransferenciaClaimed = () => {
    // Volvemos a ejecutar la búsqueda actual para actualizar el estado visual (claimed_by)
    handleFilter(null);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };
  
  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default', width: '100%' }}>
      <AppBar position="static" color="default" elevation={1} sx={{ bgcolor: '#fff' }}>
        <Container maxWidth="xl">
            <Toolbar disableGutters>
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
                sx={{ borderRadius: 20 }}
                >
                Salir
                </Button>
            </Box>
            </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
            Búsqueda de Transferencias
        </Typography>

        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fff' }}>
          <Box component="form" onSubmit={handleFilter}>
            <Grid container spacing={2} alignItems="center">
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
                  placeholder="DNI"
                  label="DNI del Pagador"
                  type="text"
                  variant="outlined"
                  value={dniFilter}
                  onChange={(e) => setDniFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  variant="outlined"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disableElevation
                  fullWidth 
                  startIcon={<FilterListIcon />}
                  sx={{ borderRadius: 20, height: '40px' }}
                >
                  Filtrar
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

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

          {!loading && !error && filtersApplied && (
            <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader sx={{ minWidth: 700 }} aria-label="tabla de transferencias">
                    <TableHead>
                    <TableRow>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>ID Transacción</TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Descripción</TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Fecha</TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Pagador</TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Estado</TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }} align="right">Monto (ARS)</TableCell>
                        <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }} align="center">Acción</TableCell>
                    </TableRow>
                    </TableHead>
                    <TableBody>
                    {transferencias.length > 0 ? (
                        transferencias.map(transferencia => (
                        <Transferencia 
                            key={transferencia.id_pago} 
                            transferencia={transferencia} 
                            onClaimSuccess={handleTransferenciaClaimed}
                        />
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                            <Typography variant="body1" color="text.secondary">
                                No se encontraron transferencias disponibles con los filtros aplicados.
                            </Typography>
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </TableContainer>
            </Paper>
          )}
          
          {!filtersApplied && !loading && (
             <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography color="text.secondary">
                    Aplique al menos 2 filtros para buscar transferencias.
                </Typography>
             </Box>
          )}
        </Box>

      </Container>
    </Box>
  );
}

export default Dashboard;