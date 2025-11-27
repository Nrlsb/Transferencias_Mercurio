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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ListAltIcon from '@mui/icons-material/ListAlt'; 
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll'; 
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; 
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

function Dashboard({ session, onLogout }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab 0: Pendientes MP, Tab 1: Confirmadas MP, Tab 2: Otros Bancos (Manual)
  const [tabValue, setTabValue] = useState(0);

  // Selección Múltiple (Solo para Tab 0)
  const [selectedIds, setSelectedIds] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);

  // Filtros Búsqueda (MP)
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [adminUserFilter, setAdminUserFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [onlyClaimedFilter, setOnlyClaimedFilter] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Manual Data (Tab 2)
  const [usersList, setUsersList] = useState([]);
  const [openManualModal, setOpenManualModal] = useState(false);
  const [manualData, setManualData] = useState({
      id_transaccion: '',
      banco: '',
      monto: '',
      userId: ''
  });
  const [loadingManual, setLoadingManual] = useState(false);

  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const isAdmin = session?.user?.is_admin === true;

  // Cálculo de total dinámico
  const totalAmount = transferencias.reduce((acc, curr) => {
      // Si estamos en Tab 2, el objeto tiene propiedad 'monto' directa.
      // Si es MP, está en 'datos_completos.transaction_amount' o 'monto' en DB.
      const val = tabValue === 2 ? curr.monto : (curr.datos_completos?.transaction_amount || 0);
      return acc + parseFloat(val);
  }, 0);

  useEffect(() => {
    if (isAdmin) {
        if (tabValue === 0) {
            fetchTransferencias('?confirmed=false');
        } else if (tabValue === 1) {
            fetchTransferencias('?confirmed=true');
        } else if (tabValue === 2) {
            // Cargar manuales
            fetchManualTransfers();
            fetchUsersList();
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
    setTransferencias([]); 
    setSelectedIds([]); 
  };

  // --- API CALLS ---

  const fetchUsersList = async () => {
      if (usersList.length > 0) return;
      try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (response.ok) {
              const data = await response.json();
              setUsersList(data);
          }
      } catch (e) {
          console.error(e);
      }
  };

  // Obtener transferencias de Mercado Pago (Tab 0 y 1)
  const fetchTransferencias = async (queryParams = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias${queryParams}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error('Error al obtener datos');
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
      if (e.message.includes('No autorizado') && onLogout) onLogout();
    } finally {
      setLoading(false);
    }
  };

  // Obtener transferencias manuales (Tab 2) - Endpoint Nuevo
  const fetchManualTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/manual-transfers`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error('Error al obtener transferencias manuales');
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if(e) e.preventDefault();
    // Validacion usuario normal
    if (!isAdmin && tabValue === 0) {
        const activeFilters = [montoFilter, dniFilter, fechaFilter].filter(Boolean).length;
        if(activeFilters < 2) {
            setError("Por favor, ingrese al menos 2 criterios de búsqueda para seguridad.");
            return;
        }
        setFiltersApplied(true);
    }
    // Si estamos en manuales (Tab 2), por ahora solo recargamos
    if(isAdmin && tabValue === 2) {
        fetchManualTransfers();
        return;
    }

    const params = new URLSearchParams();
    if (montoFilter) params.append('monto', montoFilter);
    if (dniFilter) params.append('dni', dniFilter);

    if (isAdmin) {
        if (adminUserFilter) params.append('emailReclamador', adminUserFilter);
        if (dateFromFilter) params.append('fechaDesde', dateFromFilter);
        if (dateToFilter) params.append('fechaHasta', dateToFilter);
        if (onlyClaimedFilter) params.append('soloReclamados', 'true');
        
        if (tabValue === 1) params.append('confirmed', 'true');
        else params.append('confirmed', 'false');
    } else {
        if (fechaFilter) {
            params.set('fechaDesde', fechaFilter);
            params.set('fechaHasta', fechaFilter);
        }
    }
    if (tabValue === 1 && !isAdmin) params.append('history', 'true');

    fetchTransferencias(`?${params.toString()}`);
  };

  // --- MANUAL CREATE ---

  const handleManualChange = (e) => {
      setManualData({ ...manualData, [e.target.name]: e.target.value });
  };

  const handleSubmitManual = async () => {
      setLoadingManual(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/manual-transfers`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(manualData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al crear");

        handleFeedback('Transferencia manual creada exitosamente', 'success');
        setOpenManualModal(false);
        setManualData({ id_transaccion: '', banco: '', monto: '', userId: '' });
        fetchManualTransfers();

      } catch (error) {
        handleFeedback(error.message, 'error');
      } finally {
        setLoadingManual(false);
      }
  };

  // --- ACTIONS ---

  const handleTransferenciaClaimed = () => handleSearchSubmit(null);
  
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const handleSelectAll = (e) => {
      if (e.target.checked) setSelectedIds(transferencias.map(t => t.id_pago));
      else setSelectedIds([]);
  };

  const handleBatchConfirm = async () => {
      if (selectedIds.length === 0) return;
      if (!window.confirm(`¿Estás seguro de confirmar ${selectedIds.length} transferencias? Desaparecerán de la lista de pendientes.`)) return;
      setIsConfirming(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/confirm-batch`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds })
        });
        if (!response.ok) throw new Error("Error en confirmación masiva");
        handleFeedback(`${selectedIds.length} transferencias confirmadas correctamente`, 'success');
        setSelectedIds([]);
        handleSearchSubmit(null);
      } catch (error) {
        handleFeedback(error.message, 'error');
      } finally {
        setIsConfirming(false);
      }
  };

  // Función ORIGINAL restaurada para generar y descargar el PDF
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
        
        if (tabValue === 2) filtrosTexto += '(OTROS BANCOS) ';
        else if (tabValue === 1) filtrosTexto += '(CONFIRMADAS) ';
        else filtrosTexto += '(PENDIENTES) ';
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(filtrosTexto, 14, 46);
    }

    // Definición de Columnas
    // Ajustamos las columnas dependiendo si es Manual o MP
    let tableColumn = [];
    let tableRows = [];

    if (tabValue === 2) {
        // Columnas para Manuales
        tableColumn = ["ID Transaccion", "Banco", "Fecha Carga", "Cliente", "Monto"];
        tableRows = transferencias.map(t => {
             const fechaFormatted = new Date(t.fecha_carga).toLocaleDateString() + ' ' + new Date(t.fecha_carga).toLocaleTimeString();
             const montoFormatted = `$${parseFloat(t.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
             return [
                 t.id_transaccion,
                 t.banco,
                 fechaFormatted,
                 t.usuarios?.email || 'N/A',
                 montoFormatted
             ];
        });
    } else {
        // Columnas para MP
        tableColumn = ["ID Pago", "Fecha", "Monto", "Estado", "Pagador", "Reclamado Por", "Conf."];
        tableRows = transferencias.map(t => {
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
    }

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

  const handleFeedback = (message, severity = 'success') => setFeedback({ open: true, message, severity });
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
                <Button color="primary" variant="outlined" onClick={onLogout} startIcon={<LogoutIcon />} size="small" sx={{ borderRadius: 20 }}>
                Salir
                </Button>
            </Box>
            </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        
        <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
                {isAdmin ? (
                    [
                        <Tab key="admin-all" icon={<ListAltIcon />} iconPosition="start" label="Gestión Global (MP)" />,
                        <Tab key="admin-confirmed" icon={<CheckCircleIcon />} iconPosition="start" label="Historial MP" />,
                        <Tab key="admin-manual" icon={<AccountBalanceIcon />} iconPosition="start" label="Otros Bancos" />
                    ]
                ) : (
                    [
                        <Tab key="user-search" icon={<SearchIcon />} iconPosition="start" label="Buscar Pagos" />,
                        <Tab key="user-history" icon={<HistoryIcon />} iconPosition="start" label="Mi Historial" />
                    ]
                )}
            </Tabs>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {isAdmin 
                    ? (tabValue === 2 ? 'Otros Bancos (Manual)' : (tabValue === 0 ? 'Gestión Global' : 'Transferencias Confirmadas')) 
                    : (tabValue === 0 ? 'Resultados de Búsqueda' : 'Mis Transferencias Reclamadas')}
            </Typography>

            {isAdmin && tabValue === 2 && (
                 <Button 
                    variant="contained" 
                    color="secondary" 
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setOpenManualModal(true)}
                    sx={{ borderRadius: 20 }}
                 >
                     Cargar Transferencia
                 </Button>
            )}

            <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: '#e3f2fd', borderRadius: 20, border: '1px solid #90caf9' }}>
                <Typography variant="subtitle1" component="span" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                    Total en Pantalla: 
                </Typography>
                <Typography variant="h6" component="span" sx={{ ml: 1, color: '#0d47a1', fontWeight: 800 }}>
                    ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Typography>
            </Paper>
        </Box>

        {/* BATCH ACTION (Solo Tab 0) */}
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

        {/* FILTROS: Restauramos TODO el bloque de filtros original */}
        {tabValue !== 2 && (isAdmin || tabValue === 0) && (
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
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!loading && !error && (
            (isAdmin || (tabValue === 0 && filtersApplied) || (tabValue === 1) || (tabValue === 2)) ? (
            <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader sx={{ minWidth: 700 }} aria-label="tabla de transferencias">
                    <TableHead>
                    <TableRow>
                        {/* HEADERS DIFERENTES SEGUN TAB */}
                        {tabValue === 2 ? (
                            // HEADERS TABLA MANUAL
                            <>
                                <TableCell sx={{ bgcolor: '#e0f7fa', fontWeight: 'bold' }}>ID Transacción</TableCell>
                                <TableCell sx={{ bgcolor: '#e0f7fa', fontWeight: 'bold' }}>Banco</TableCell>
                                <TableCell sx={{ bgcolor: '#e0f7fa', fontWeight: 'bold' }}>Fecha Carga</TableCell>
                                <TableCell sx={{ bgcolor: '#e0f7fa', fontWeight: 'bold' }}>Cliente Asignado</TableCell>
                                <TableCell sx={{ bgcolor: '#e0f7fa', fontWeight: 'bold' }} align="right">Monto</TableCell>
                            </>
                        ) : (
                            // HEADERS TABLA MERCADO PAGO ORIGINALES
                            <>
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
                                {isAdmin && <TableCell sx={{ bgcolor: '#ffebee', fontWeight: 'bold', color: '#d32f2f' }}>Reclamado Por</TableCell>}
                                <TableCell sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }} align="right">Monto (ARS)</TableCell>
                            </>
                        )}
                    </TableRow>
                    </TableHead>
                    <TableBody>
                    {transferencias.length > 0 ? (
                        transferencias.map((t, idx) => {
                            if (tabValue === 2) {
                                // RENDER TABLA MANUAL
                                return (
                                    <TableRow key={t.id || idx} hover>
                                        <TableCell>{t.id_transaccion}</TableCell>
                                        <TableCell><Chip label={t.banco} color="primary" variant="outlined" size="small"/></TableCell>
                                        <TableCell>{new Date(t.fecha_carga).toLocaleDateString()} {new Date(t.fecha_carga).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                        <TableCell>{t.usuarios?.email || 'Desconocido'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>${parseFloat(t.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                );
                            } else {
                                // RENDER TABLA MP (Usando Componente Existente Original)
                                return (
                                    <Transferencia 
                                        key={t.id_pago} 
                                        transferencia={t} 
                                        session={session}
                                        onClaimSuccess={handleTransferenciaClaimed}
                                        onFeedback={handleFeedback}
                                        isAdmin={isAdmin}
                                        isSelectable={isAdmin && tabValue === 0}
                                        isSelected={selectedIds.includes(t.id_pago)}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                );
                            }
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={isAdmin ? 8 : 6} align="center" sx={{ py: 3 }}>
                                <Typography variant="body1" color="text.secondary">
                                    {tabValue === 2 ? "No hay transferencias de otros bancos cargadas." : "No se encontraron transferencias."}
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
      
      {/* MODAL MANUAL */}
      <Dialog open={openManualModal} onClose={() => setOpenManualModal(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Cargar Manual (Otros Bancos)</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField label="ID Transacción" name="id_transaccion" fullWidth value={manualData.id_transaccion} onChange={handleManualChange} placeholder="Ej: 999111222" />
                    <FormControl fullWidth>
                        <InputLabel>Banco</InputLabel>
                        <Select name="banco" value={manualData.banco} label="Banco" onChange={handleManualChange}>
                            <MenuItem value="Santander">Santander</MenuItem>
                            <MenuItem value="Nacion">Nación</MenuItem>
                            <MenuItem value="Santa Fe">Santa Fe</MenuItem>
                            <MenuItem value="Macro">Macro</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField label="Monto" name="monto" type="number" fullWidth value={manualData.monto} onChange={handleManualChange} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                    <FormControl fullWidth>
                        <InputLabel>Cliente</InputLabel>
                        <Select name="userId" value={manualData.userId} label="Cliente" onChange={handleManualChange}>
                            {usersList.map(u => <MenuItem key={u.id} value={u.id}>{u.email}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenManualModal(false)}>Cancelar</Button>
                <Button onClick={handleSubmitManual} variant="contained" disabled={loadingManual}>{loadingManual ? 'Guardando...' : 'Guardar'}</Button>
            </DialogActions>
      </Dialog>

      <Snackbar open={feedback.open} autoHideDuration={3000} onClose={handleCloseFeedback}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>{feedback.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;