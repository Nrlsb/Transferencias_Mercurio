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
  Alert
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';

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
      {/* --- Header / AppBar --- */}
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Visualizador de Transferencias
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {session.user.email}
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout} 
              startIcon={<LogoutIcon />}
            >
              Salir
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        
        {/* --- Formulario de Filtros --- */}
        <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
          <Typography variant="h6" gutterBottom color="primary">
            Filtros de Búsqueda
          </Typography>
          <Box component="form" onSubmit={handleFilter}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Monto Exacto"
                  type="number"
                  variant="outlined"
                  value={montoFilter}
                  onChange={(e) => setMontoFilter(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="DNI del Pagador"
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
                  label="Fecha y Hora"
                  type="datetime-local"
                  variant="outlined"
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  startIcon={<SearchIcon />}
                  size="large"
                >
                  Filtrar
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* --- Área de Contenido --- */}
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
            <Grid container spacing={3}>
              {transferencias.length > 0 ? (
                transferencias.map(transferencia => (
                  <Grid item xs={12} key={transferencia.id_pago}>
                    <Transferencia transferencia={transferencia} />
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">No se encontraron transferencias con los filtros aplicados.</Alert>
                </Grid>
              )}
            </Grid>
          )}
        </Box>

      </Container>
    </Box>
  );
}

export default Dashboard;