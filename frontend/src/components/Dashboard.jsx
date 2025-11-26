import { useState, useEffect } from 'react';
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
  InputAdornment,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';

function Dashboard({ session, onLogout }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para controlar las pestañas (0: Buscar, 1: Historial)
  const [tabValue, setTabValue] = useState(0);

  // Filtros Búsqueda
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Feedback UI
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  // Efecto para cargar historial automáticamente al cambiar de tab
  useEffect(() => {
    if (tabValue === 1) {
        // Si vamos a la pestaña Historial, cargamos datos inmediatamente
        fetchTransferencias('?history=true');
    } else {
        // Si volvemos a Búsqueda, limpiamos la tabla si no había búsqueda previa
        // Opcional: Podríamos persistir el estado de la búsqueda anterior
        setTransferencias([]);
        setFiltersApplied(false);
    }
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null); // Limpiar errores al cambiar de contexto
  };

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
        throw new Error(errorData.error || 'Error al obtener datos');
      }
      
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
      if (e.message.includes('No autorizado') || e.message.includes('Token')) {
          if (onLogout) onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if(e) e.preventDefault();
    
    // Validar solo si estamos en modo búsqueda
    if (tabValue === 0) {
        const activeFilters = [montoFilter, dniFilter, fechaFilter].filter(Boolean).length;
        if(activeFilters < 2) {
            setError("Por favor, ingrese al menos 2 criterios de búsqueda para seguridad.");
            return;
        }
        setFiltersApplied(true);
    }

    const params = new URLSearchParams();
    if (montoFilter) params.append('monto', montoFilter);
    if (dniFilter) params.append('dni', dniFilter);
    if (fechaFilter) {
      const utcDateString = new Date(fechaFilter).toISOString();
      params.append('fecha', utcDateString);
    }
    
    // Si estamos en historial, forzamos history=true aunque filtremos (opcional, por ahora historial carga todo)
    if (tabValue === 1) params.append('history', 'true');

    fetchTransferencias(`?${params.toString()}`);
  };

  const handleTransferenciaClaimed = () => {
    // Recargar datos según la pestaña activa
    if (tabValue === 0 && filtersApplied) {
        handleSearchSubmit(null);
    } else if (tabValue === 1) {
        fetchTransferencias('?history=true');
    }
  };

  const handleFeedback = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const handleCloseFeedback = () => setFeedback({ ...feedback, open: false });

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default', width: '100%' }}>
      {/* Header */}
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
                onClick={onLogout} 
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
        
        {/* Tabs de Navegación */}
        <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                <Tab icon={<SearchIcon />} iconPosition="start" label="Buscar Pagos" />
                <Tab icon={<HistoryIcon />} iconPosition="start" label="Mi Historial" />
            </Tabs>
        </Paper>

        {/* Panel de Búsqueda (Solo visible en Tab 0) */}
        {tabValue === 0 && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fff' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Filtros de Búsqueda (Mínimo 2)
                </Typography>
                <Box component="form" onSubmit={handleSearchSubmit}>
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
        )}

        {/* Título de Sección Dinámico */}
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
            {tabValue === 0 ? 'Resultados de Búsqueda' : 'Mis Transferencias Reclamadas'}
        </Typography>

        {/* Área de Contenido (Tabla y Errores) */}
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

          {/* Renderizado Condicional de la Tabla */}
          {!loading && !error && (
            (tabValue === 0 && filtersApplied) || (tabValue === 1) ? (
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
                                onFeedback={handleFeedback}
                            />
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                <Typography variant="body1" color="text.secondary">
                                    {tabValue === 0 
                                        ? "No se encontraron transferencias con esos filtros." 
                                        : "Aún no has reclamado ninguna transferencia."}
                                </Typography>
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </TableContainer>
                </Paper>
            ) : (
                // Mensaje Empty State para Búsqueda sin filtros
                tabValue === 0 && !filtersApplied && !loading && (
                    <Box sx={{ textAlign: 'center', mt: 4, p: 4, bgcolor: '#f9f9f9', borderRadius: 2 }}>
                        <Typography color="text.secondary">
                            Utiliza los filtros de arriba para encontrar nuevas transferencias.
                        </Typography>
                    </Box>
                )
            )
          )}
        </Box>

      </Container>
      
      <Snackbar open={feedback.open} autoHideDuration={3000} onClose={handleCloseFeedback}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;