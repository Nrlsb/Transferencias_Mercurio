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
import ListAltIcon from '@mui/icons-material/ListAlt'; // Icono para "Gestión Global"
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Icono para "Confirmadas"
import DoneAllIcon from '@mui/icons-material/DoneAll'; // Icono para botón confirmar

function Dashboard({ session, onLogout }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para controlar las pestañas
  // Admin: 0 -> Gestión Global (Pendientes), 1 -> Confirmadas
  // User: 0 -> Buscar, 1 -> Historial
  const [tabValue, setTabValue] = useState(0);

  // Estados para Selección Múltiple (Solo Admin)
  const [selectedIds, setSelectedIds] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);

  // Filtros Búsqueda Comunes
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState(''); // Fecha puntual (Usuarios)

  // Filtros Admin
  const [adminUserFilter, setAdminUserFilter] = useState(''); // Email quien reclamo
  const [dateFromFilter, setDateFromFilter] = useState('');   // Fecha Desde
  const [dateToFilter, setDateToFilter] = useState('');       // Fecha Hasta
  const [onlyClaimedFilter, setOnlyClaimedFilter] = useState(false); // Filtro solo reclamados

  const [filtersApplied, setFiltersApplied] = useState(false);

  // Feedback UI
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  // Verificamos si es admin
  const isAdmin = session?.user?.is_admin === true;

  // Cálculo del Total en tiempo real (Suma de montos visibles)
  const totalAmount = transferencias.reduce((acc, curr) => {
    return acc + (curr.datos_completos?.transaction_amount || 0);
  }, 0);

  useEffect(() => {
    // Si es admin, cargamos automáticamente según la pestaña
    if (isAdmin) {
        if (tabValue === 0) {
            // Tab 0 (Gestión Global): Trae las pendientes (confirmed=false)
            fetchTransferencias('?confirmed=false');
        } else if (tabValue === 1) {
            // Tab 1 (Confirmadas): Trae el historial de confirmadas (confirmed=true)
            fetchTransferencias('?confirmed=true');
        }
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
    setTransferencias([]); // Limpiamos tabla visualmente al cambiar
    setSelectedIds([]); // Limpiamos selecciones al cambiar de contexto
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
        if (dateFromFilter) params.append('fechaDesde', dateFromFilter);
        if (dateToFilter) params.append('fechaHasta', dateToFilter);
        if (onlyClaimedFilter) params.append('soloReclamados', 'true');
        
        // Mantener lógica de estados según la tab actual
        if (tabValue === 1) {
            params.append('confirmed', 'true');
        } else {
            params.append('confirmed', 'false');
        }

    } else {
        // Filtro Usuario
        if (fechaFilter) {
            params.set('fechaDesde', fechaFilter);
            params.set('fechaHasta', fechaFilter);
        }
    }
    
    if (tabValue === 1 && !isAdmin) params.append('history', 'true');

    fetchTransferencias(`?${params.toString()}`);
  };

  const handleTransferenciaClaimed = () => {
    // Recargar búsqueda actual
    handleSearchSubmit(null);
  };

  // --- LÓGICA DE SELECCIÓN Y CONFIRMACIÓN MASIVA ---

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
        prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          // Seleccionar todas las visibles
          setSelectedIds(transferencias.map(t => t.id_pago));
      } else {
          setSelectedIds([]);
      }
  };

  const handleBatchConfirm = async () => {
      if (selectedIds.length === 0) return;
      
      if (!window.confirm(`¿Estás seguro de confirmar ${selectedIds.length} transferencias? Desaparecerán de la lista de pendientes.`)) return;

      setIsConfirming(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/confirm-batch`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: selectedIds })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error en confirmación masiva");
        }

        handleFeedback(`${selectedIds.length} transferencias confirmadas correctamente`, 'success');
        setSelectedIds([]);
        // Recargar la lista (las confirmadas desaparecerán de la tab 0)
        handleSearchSubmit(null);

      } catch (error) {
        handleFeedback(error.message, 'error');
      } finally {
        setIsConfirming(false);
      }
  };

  // --------------------------------------------------

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
    
    // Agregar el total en el PDF
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Negro
    doc.text(`Total del reporte: $${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 14, 40);

    if (isAdmin) {
        let filtrosTexto = 'Filtros: ';
        if (dateFromFilter) filtrosTexto += `Desde ${dateFromFilter} `;
        if (dateToFilter) filtrosTexto += `Hasta ${dateToFilter} `;
        if (adminUserFilter) filtrosTexto += `Usuario: ${adminUserFilter} `;
        if (tabValue === 1) filtrosTexto += '(CONFIRMADAS) ';
        else filtrosTexto += '(PENDIENTES) ';
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(filtrosTexto, 14, 46);
    }

    // Definición de Columnas
    const tableColumn = ["ID Pago", "Fecha", "Monto", "Estado", "Pagador", "Reclamado Por", "Conf."];
    
    // Mapeo de Datos
    const tableRows = transferencias.map(t => {
        const fechaFormatted = t.datos_completos?.date_approved 
            ? new Date(t.datos_completos.date_approved).toLocaleDateString() + ' ' + new Date(t.datos_completos.date_approved).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            : 'N/A';

        const montoFormatted = `$${(t.datos_completos?.transaction_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        
        let estado = t.estado;
        if (estado === 'approved') estado = 'Aprobado';
        else if (estado === 'pending') estado = 'Pendiente';
        else if (estado === 'rejected') estado = 'Rechazado';

        const pagador = t.datos_completos?.payer?.email || 'Desconocido';
        const reclamadoPor = t.usuarios?.email || (t.claimed_by ? 'ID: ' + t.claimed_by : 'No reclamado');
        const confirmadaTxt = t.confirmed ? 'SI' : 'NO';

        return [
            t.id_pago,
            fechaFormatted,
            montoFormatted,
            estado,
            pagador,
            reclamadoPor,
            confirmadaTxt
        ];
    });

    // Generación de la tabla con autoTable
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
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
        
        {/* PESTAÑAS (TABS) DINÁMICAS */}
        <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                {isAdmin ? (
                    // Tabs para Admin
                    [
                        <Tab key="admin-all" icon={<ListAltIcon />} iconPosition="start" label="Gestión Global (Pendientes)" />,
                        <Tab key="admin-confirmed" icon={<CheckCircleIcon />} iconPosition="start" label="Historial Confirmadas" />
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

        {/* BARRA SUPERIOR CON TOTAL Y BOTÓN DE ACCIÓN */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {isAdmin 
                    ? (tabValue === 0 ? 'Gestión Global' : 'Transferencias Confirmadas') 
                    : (tabValue === 0 ? 'Resultados de Búsqueda' : 'Mis Transferencias Reclamadas')}
            </Typography>

            {/* TOTAL AMOUNT DISPLAY */}
            <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: '#e3f2fd', borderRadius: 20, border: '1px solid #90caf9' }}>
                <Typography variant="subtitle1" component="span" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                    Total en Pantalla: 
                </Typography>
                <Typography variant="h6" component="span" sx={{ ml: 1, color: '#0d47a1', fontWeight: 800 }}>
                    ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Typography>
            </Paper>
        </Box>

        {/* BOTÓN DE CONFIRMAR MASIVO (SOLO APARECE SI ADMIN + TAB 0 + ITEMS SELECCIONADOS) */}
        {isAdmin && tabValue === 0 && selectedIds.length > 0 && (
            <Alert severity="info" sx={{ mb: 2, alignItems: 'center' }}
                action={
                    <Button 
                        color="success" 
                        variant="contained" 
                        size="small"
                        onClick={handleBatchConfirm}
                        disabled={isConfirming}
                        startIcon={<DoneAllIcon />}
                    >
                        {isConfirming ? 'Procesando...' : `Confirmar (${selectedIds.length})`}
                    </Button>
                }
            >
                Has seleccionado <strong>{selectedIds.length}</strong> transferencias. Haz clic en confirmar para archivarlas.
            </Alert>
        )}

        {(isAdmin || tabValue === 0) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fff' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    {isAdmin ? 'Filtros Globales (Admin)' : 'Filtros de Búsqueda (Mínimo 2)'}
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
                                {isAdmin ? 'Buscar' : 'Filtrar'}
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
                            {/* COLUMNA DE SELECCIÓN (Checkbox Header) - SOLO ADMIN TAB 0 */}
                            {isAdmin && tabValue === 0 && (
                                <TableCell padding="checkbox" sx={{ bgcolor: '#f5f5f5' }}>
                                    <Checkbox 
                                        indeterminate={selectedIds.length > 0 && selectedIds.length < transferencias.length}
                                        checked={transferencias.length > 0 && selectedIds.length === transferencias.length}
                                        onChange={handleSelectAll}
                                        color="primary"
                                    />
                                </TableCell>
                            )}

                            <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>ID Transacción</TableCell>
                            <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Descripción</TableCell>
                            <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Fecha</TableCell>
                            <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Pagador</TableCell>
                            <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>Estado</TableCell>
                            {isAdmin && (
                                <TableCell sx={{ bgcolor: '#ffebee', fontWeight: 'bold', color: '#d32f2f' }}>
                                    Reclamado Por
                                </TableCell>
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
                                // Props nuevas para selección múltiple
                                isSelectable={isAdmin && tabValue === 0}
                                isSelected={selectedIds.includes(transferencia.id_pago)}
                                onToggleSelect={handleToggleSelect}
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