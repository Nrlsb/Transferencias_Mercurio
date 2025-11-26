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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

function Dashboard({ session, onLogout }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para controlar las pestañas (0: Buscar, 1: Historial)
  const [tabValue, setTabValue] = useState(0);

  // Filtros Búsqueda Comunes
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState(''); // Fecha puntual (Usuarios)

  // Filtros Admin
  const [adminUserFilter, setAdminUserFilter] = useState(''); // Email quien reclamo
  const [dateFromFilter, setDateFromFilter] = useState('');   // Fecha Desde
  const [dateToFilter, setDateToFilter] = useState('');       // Fecha Hasta
  const [onlyClaimedFilter, setOnlyClaimedFilter] = useState(false); // Nuevo filtro Admin

  const [filtersApplied, setFiltersApplied] = useState(false);

  // Feedback UI
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  // Verificamos si es admin
  const isAdmin = session?.user?.is_admin === true;

  useEffect(() => {
    // Si es admin, cargamos todo automáticamente al iniciar
    if (isAdmin) {
        fetchTransferencias();
    } else {
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
        // Filtros Admin
        if (adminUserFilter) params.append('emailReclamador', adminUserFilter);
        // Enviamos la fecha tal cual (YYYY-MM-DD), el backend se encarga de las horas
        if (dateFromFilter) params.append('fechaDesde', dateFromFilter);
        if (dateToFilter) params.append('fechaHasta', dateToFilter);
        // Nuevo filtro de solo reclamados
        if (onlyClaimedFilter) params.append('soloReclamados', 'true');
    } else {
        // Filtro Usuario: Fecha puntual con hora (datetime-local)
        if (fechaFilter) {
            const utcDateString = new Date(fechaFilter).toISOString();
            params.append('fecha', utcDateString);
        }
    }
    
    if (tabValue === 1 && !isAdmin) params.append('history', 'true');

    fetchTransferencias(`?${params.toString()}`);
  };

  const handleTransferenciaClaimed = () => {
    if (isAdmin) {
        handleSearchSubmit(null);
    } else if (tabValue === 0 && filtersApplied) {
        handleSearchSubmit(null);
    } else if (tabValue === 1) {
        fetchTransferencias('?history=true');
    }
  };

  // Función para generar y descargar el PDF
  const handleExportPDF = () => {
    if (!transferencias || transferencias.length === 0) {
        handleFeedback('No hay datos para exportar', 'warning');
        return;
    }

    const doc = new jsPDF();

    // Título del documento
    doc.setFontSize(18);
    doc.text('Reporte de Transferencias - Mercurio', 14, 22);

    // Metadata del reporte
    doc.setFontSize(10);
    doc.setTextColor(100);
    const fechaReporte = new Date().toLocaleString();
    doc.text(`Generado el: ${fechaReporte}`, 14, 28);
    doc.text(`Generado por: ${session?.user?.email}`, 14, 33);
    
    if (isAdmin) {
        let filtrosTexto = 'Filtros aplicados: ';
        if (dateFromFilter) filtrosTexto += `Desde ${dateFromFilter} `;
        if (dateToFilter) filtrosTexto += `Hasta ${dateToFilter} `;
        if (adminUserFilter) filtrosTexto += `Usuario: ${adminUserFilter} `;
        if (onlyClaimedFilter) filtrosTexto += '(Solo Reclamados) ';
        if (filtrosTexto === 'Filtros aplicados: ') filtrosTexto += 'Ninguno (Todas las transferencias)';
        
        doc.text(filtrosTexto, 14, 38);
    }

    // Definición de Columnas
    const tableColumn = ["ID Pago", "Fecha", "Monto", "Estado", "Pagador", "Reclamado Por"];
    
    // Mapeo de Datos
    const tableRows = transferencias.map(t => {
        const fechaFormatted = t.datos_completos?.date_approved 
            ? new Date(t.datos_completos.date_approved).toLocaleDateString() + ' ' + new Date(t.datos_completos.date_approved).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            : 'N/A';

        const montoFormatted = `$${(t.datos_completos?.transaction_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        
        // Traducción de estado
        let estado = t.estado;
        if (estado === 'approved') estado = 'Aprobado';
        else if (estado === 'pending') estado = 'Pendiente';
        else if (estado === 'rejected') estado = 'Rechazado';

        const pagador = t.datos_completos?.payer?.email || 'Desconocido';
        const reclamadoPor = t.usuarios?.email || (t.claimed_by ? 'ID: ' + t.claimed_by : 'No reclamado');

        return [
            t.id_pago,
            fechaFormatted,
            montoFormatted,
            estado,
            pagador,
            reclamadoPor
        ];
    });

    // Generación de la tabla con autoTable
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 118, 210] }, // Color primario #1976d2
    });

    // Guardar archivo
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
        
        {!isAdmin && (
            <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                    <Tab icon={<SearchIcon />} iconPosition="start" label="Buscar Pagos" />
                    <Tab icon={<HistoryIcon />} iconPosition="start" label="Mi Historial" />
                </Tabs>
            </Paper>
        )}

        {(isAdmin || tabValue === 0) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fff' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    {isAdmin ? 'Filtros Globales (Admin)' : 'Filtros de Búsqueda (Mínimo 2)'}
                </Typography>
                <Box component="form" onSubmit={handleSearchSubmit}>
                    <Grid container spacing={2} alignItems="center">
                        
                        {/* 1. Filtros SOLO para Usuarios (Monto y DNI) */}
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

                        {/* 2. Filtros Específicos ADMIN vs USER */}
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
                                    type="date" // CAMBIO: Solo fecha
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
                                    type="date" // CAMBIO: Solo fecha
                                    variant="outlined"
                                    value={dateToFilter}
                                    onChange={(e) => setDateToFilter(e.target.value)}
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2}>
                                    {/* NUEVO FILTRO CHECKBOX */}
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
                                type="datetime-local"
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
                                {isAdmin ? 'Buscar' : 'Filtrar'}
                                </Button>
                            </Grid>
                            
                            {/* Botón de Exportar PDF (Solo Admin) */}
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

        {/* ... resto del código (Tabla, etc) igual ... */}
        
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
            {isAdmin ? 'Gestión Global de Transferencias' : (tabValue === 0 ? 'Resultados de Búsqueda' : 'Mis Transferencias Reclamadas')}
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
                            {/* Columna Extra Solo Admin */}
                            {isAdmin && (
                                <TableCell sx={{ bgcolor: '#ffebee', fontWeight: 'bold', color: '#d32f2f' }}>
                                    Reclamado Por
                                </TableCell>
                            )}
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
                                session={session}
                                onClaimSuccess={handleTransferenciaClaimed}
                                onFeedback={handleFeedback}
                                isAdmin={isAdmin} 
                            />
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 3 }}>
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