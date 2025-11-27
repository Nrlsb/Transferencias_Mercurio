import { useState, useEffect } from 'react';
import Transferencia from './Transferencia';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Tab,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Icono para confirmados
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ListAltIcon from '@mui/icons-material/ListAlt'; // Icono para "Todas"

function Dashboard({ session, onLogout }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para controlar las pestañas
  // Admin: 0 -> Todas, 1 -> Confirmadas
  // User: 0 -> Buscar, 1 -> Historial
  const [tabValue, setTabValue] = useState(0);

  // Filtros Búsqueda Comunes
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');

  // Filtros Admin
  const [adminUserFilter, setAdminUserFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [onlyClaimedFilter, setOnlyClaimedFilter] = useState(false);

  const [filtersApplied, setFiltersApplied] = useState(false);

  // Feedback UI
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const isAdmin = session?.user?.is_admin === true;

  useEffect(() => {
    // Lógica de carga automática según el Tab seleccionado y el Rol
    if (isAdmin) {
        if (tabValue === 0) {
            // Tab "Todas" (Gestión Global)
            // Para admin, cargamos inicialmente todo o aplicamos filtros si ya existen?
            // Vamos a cargar todo por defecto al entrar a la tab 0
            fetchTransferencias();
        } else if (tabValue === 1) {
            // Tab "Confirmadas"
            fetchTransferencias('?confirmed=true');
        }
    } else {
        // Usuario Normal
        if (tabValue === 1) {
            fetchTransferencias('?history=true');
        } else {
            setTransferencias([]);
            setFiltersApplied(false);
        }
    }
  }, [tabValue, isAdmin]); 

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
    setTransferencias([]); // Limpiamos tabla al cambiar de tab para UX más limpia
    // Nota: El useEffect se encargará de cargar los datos nuevos
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
    
    // Si NO es admin, validamos filtros mínimos
    if (!isAdmin && tabValue === 0) {
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

    if (isAdmin) {
        if (adminUserFilter) params.append('emailReclamador', adminUserFilter);
        if (dateFromFilter) params.append('fechaDesde', dateFromFilter);
        if (dateToFilter) params.append('fechaHasta', dateToFilter);
        if (onlyClaimedFilter) params.append('soloReclamados', 'true');
        
        // Si estamos en la tab de confirmadas, aseguramos que se mantenga ese filtro
        if (tabValue === 1) params.append('confirmed', 'true');

    } else {
        if (fechaFilter) {
             params.set('fechaDesde', fechaFilter);
             params.set('fechaHasta', fechaFilter);
        }
        if (tabValue === 1) params.append('history', 'true');
    }

    fetchTransferencias(`?${params.toString()}`);
  };

  const handleTransferenciaClaimed = () => {
    // Recargamos la búsqueda actual para refrescar datos
    handleSearchSubmit(null);
  };

  const handleExportPDF = () => {
    if (!transferencias || transferencias.length === 0) {
        handleFeedback('No hay datos para exportar', 'warning');
        return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Transferencias - Mercurio', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const fechaReporte = new Date().toLocaleString();
    doc.text(`Generado el: ${fechaReporte}`, 14, 28);
    
    if (isAdmin) {
        let filtrosTexto = 'Filtros aplicados: ';
        if (dateFromFilter) filtrosTexto += `Desde ${dateFromFilter} `;
        if (dateToFilter) filtrosTexto += `Hasta ${dateToFilter} `;
        if (tabValue === 1) filtrosTexto += '(SOLO CONFIRMADAS) ';
        doc.text(filtrosTexto, 14, 38);
    }

    // Definición de Columnas
    const tableColumn = ["ID Pago", "Fecha", "Monto", "Estado", "Pagador", "Reclamado Por", "Confirmada"];
    
    // Mapeo de Datos
    const tableRows = transferencias.map(t => {
        const fechaFormatted = t.datos_completos?.date_approved 
            ? new Date(t.datos_completos.date_approved).toLocaleDateString() 
            : 'N/A';
        const montoFormatted = `$${(t.datos_completos?.transaction_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        const reclamadoPor = t.usuarios?.email || (t.claimed_by ? 'ID: ' + t.claimed_by : 'No reclamado');
        const confirmadaTxt = t.confirmed ? 'SI' : 'NO';

        return [
            t.id_pago,
            fechaFormatted,
            montoFormatted,
            t.estado,
            t.datos_completos?.payer?.email || 'Desconocido',
            reclamadoPor,
            confirmadaTxt
        ];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 118, 210] },
    });

    doc.save(`Mercurio_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
    handleFeedback('PDF generado exitosamente', 'success');
  };

  const handleFeedback = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const handleCloseFeedback = () => setFeedback({ ...feedback, open: false });

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default', width: '100%' }}>
      <AppBar position="static" color="default" elevation={1} sx={{ bgcolor: '#fff' }}>
        <Container maxWidth="xl">
            <Toolbar disableGutters>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#1976d2', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                Mercurio Dashboard
                {isAdmin && <Chip icon={<AdminPanelSettingsIcon />} label="ADMIN MODE" color="error" size="small" />}
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
        
        {/* PESTAÑAS (TABS) DINÁMICAS */}
        <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                {isAdmin ? (
                    // Tabs para Admin
                    [
                        <Tab key="admin-all" icon={<ListAltIcon />} iconPosition="start" label="Todas las Transferencias" />,
                        <Tab key="admin-confirmed" icon={<CheckCircleIcon />} iconPosition="start" label="Transferencias Confirmadas" />
                    ]
                ) : (
                    // Tabs para Usuario
                    [
                        <Tab key="user-search" icon={<SearchIcon />} iconPosition="start" label="Buscar Pagos" />,
                        <Tab key="user-history" icon={<HistoryIcon />} iconPosition="start" label="Mi Historial" />
                    ]
                )}
            </Tabs>
        </Paper>

        {/* ÁREA DE FILTROS */}
        {(isAdmin || (tabValue === 0 && !isAdmin)) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fff' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    {isAdmin ? 'Filtros Globales' : 'Filtros de Búsqueda (Mínimo 2)'}
                </Typography>
                <Box component="form" onSubmit={handleSearchSubmit}>
                    <Grid container spacing={2} alignItems="center">
                        
                        {!isAdmin && (
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
                                    placeholder="DNI"
                                    label="DNI del Pagador"
                                    type="text"
                                    variant="outlined"
                                    value={dniFilter}
                                    onChange={(e) => setDniFilter(e.target.value)}
                                    size="small"
                                    />
                                </Grid>
                            </>
                        )}

                        {isAdmin ? (
                            <>
                                <Grid item xs={12} sm={6} md={3}>
                                    <TextField
                                    fullWidth
                                    placeholder="email@ejemplo.com"
                                    label="Email quien Reclamó"
                                    type="text"
                                    variant="outlined"
                                    value={adminUserFilter}
                                    onChange={(e) => setAdminUserFilter(e.target.value)}
                                    size="small"
                                    />
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
                                <Grid item xs={12} sm={6} md={2}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox 
                                                checked={onlyClaimedFilter}
                                                onChange={(e) => setOnlyClaimedFilter(e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Solo Reclamados"
                                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                                    />
                                </Grid>
                            </>
                        ) : (
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
                        )}

                        <Grid item xs={12} sm={6} md={isAdmin ? 3 : 3} container spacing={1}>
                            <Grid item xs={isAdmin ? 6 : 12}>
                                <Button 
                                type="submit" 
                                variant="contained" 
                                disableElevation
                                fullWidth 
                                startIcon={<FilterListIcon />}
                                sx={{ borderRadius: 20, height: '40px' }}
                                >
                                {isAdmin ? 'Aplicar' : 'Filtrar'}
                                </Button>
                            </Grid>
                            
                            {isAdmin && (
                                <Grid item xs={6}>
                                    <Button 
                                        variant="outlined" 
                                        color="secondary"
                                        fullWidth 
                                        onClick={handleExportPDF}
                                        disabled={transferencias.length === 0}
                                        startIcon={<PictureAsPdfIcon />}
                                        sx={{ borderRadius: 20, height: '40px' }}
                                    >
                                        PDF
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        )}

        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
            {isAdmin 
                ? (tabValue === 0 ? 'Gestión Global' : 'Transferencias Confirmadas') 
                : (tabValue === 0 ? 'Resultados de Búsqueda' : 'Mis Transferencias Reclamadas')}
        </Typography>

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
            (isAdmin || (tabValue === 0 && filtersApplied) || (tabValue === 1)) ? (
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
                            {/* Columnas Admin */}
                            {isAdmin && (
                                <>
                                <TableCell sx={{ bgcolor: '#ffebee', fontWeight: 'bold', color: '#d32f2f' }}>
                                    Reclamado Por
                                </TableCell>
                                {/* NUEVA COLUMNA CONFIRMADAS */}
                                <TableCell sx={{ bgcolor: '#e8f5e9', fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' }}>
                                    Confirmadas
                                </TableCell>
                                </>
                            )}
                            <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }} align="right">Monto (ARS)</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {transferencias.length > 0 ? (
                            transferencias.map(transferencia => (
                            <Transferencia 
                                key={transferencia.id_pago} 
                                transferencia={transferencia} 
                                session={session}
                                onClaimSuccess={handleTransferenciaClaimed}
                                onFeedback={handleFeedback}
                                isAdmin={isAdmin} 
                            />
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={isAdmin ? 8 : 6} align="center" sx={{ py: 3 }}>
                                <Typography variant="body1" color="text.secondary">
                                    {isAdmin 
                                     ? "No se encontraron transferencias." 
                                     : (tabValue === 0 
                                        ? "No se encontraron transferencias con esos filtros." 
                                        : "Aún no has reclamado ninguna transferencia.")}
                                </Typography>
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </TableContainer>
                </Paper>
            ) : (
                tabValue === 0 && !filtersApplied && !loading && !isAdmin && (
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