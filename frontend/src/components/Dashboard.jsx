import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiClient } from '../utils/apiClient';

// Importar nuevos sub-componentes
import TransferFilters from './TransferFilters';
import TransferTable from './TransferTable';
import ManualTransferModal from './ManualTransferModal';
import StatsCards from './StatsCards';

import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  Paper,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

function Dashboard({ session, onLogout }) {
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab 0: Pendientes MP (Admin) / Buscar (User)
  // Tab 1: Historial MP (Admin) / Historial Completo (User)
  // Tab 2: Otros Bancos (Admin) / Otros Bancos (User)
  const [tabValue, setTabValue] = useState(0);

  // Estados para Selección Múltiple (Solo Admin Tab 0)
  const [selectedIds, setSelectedIds] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // Filtros Búsqueda Comunes
  const [montoFilter, setMontoFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');

  // Filtros Admin
  const [adminUserFilter, setAdminUserFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  
  // NUEVOS FILTROS ADMIN
  const [bankFilter, setBankFilter] = useState(['Todas']); 
  const [claimStatusFilter, setClaimStatusFilter] = useState('all'); 

  const [filtersApplied, setFiltersApplied] = useState(false);

  // Estados para Carga Manual (Tab 2 y User History)
  const [usersList, setUsersList] = useState([]);
  const [openManualModal, setOpenManualModal] = useState(false);
  const [manualData, setManualData] = useState({
      id_transaccion: '',
      banco: '',
      monto: '',
      userId: ''
  });
  const [loadingManual, setLoadingManual] = useState(false);

  // Feedback UI
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const isAdmin = session?.user?.is_admin === true;

  // Cálculo del Total en tiempo real (Suma de montos visibles)
  const totalAmount = transferencias.reduce((acc, curr) => {
      // Si es manual tiene 'monto', si es MP tiene 'datos_completos.transaction_amount'
      const val = curr.banco ? curr.monto : (curr.datos_completos?.transaction_amount || curr.monto || 0);
      return acc + parseFloat(val);
  }, 0);

  // Cálculo del Total SELECCIONADO
  const totalSelectedAmount = transferencias.reduce((acc, curr) => {
      const isManual = !!curr.banco;
      const currentId = isManual ? curr.id_transaccion : curr.id_pago;

      if (selectedIds.includes(currentId)) {
          const val = isManual ? curr.monto : (curr.datos_completos?.transaction_amount || curr.monto || 0);
          return acc + parseFloat(val);
      }
      return acc;
  }, 0);

  useEffect(() => {
    // Si no hay sesión (token), no intentamos cargar nada (aunque el apiClient manejaría el error)
    if (!session?.access_token) return;

    if (isAdmin) {
        if (tabValue === 0) {
            // Tab 0 (Gestión Global): Trae las pendientes MP + Manuales
            fetchTransferencias('?confirmed=false');
        } else if (tabValue === 1) {
            // Tab 1 (Confirmadas): Trae el historial unificado de confirmadas
            fetchTransferencias('?confirmed=true');
        } else if (tabValue === 2) {
            // Tab 2: Otros Bancos (Manuales NO confirmadas, vista específica)
            fetchManualTransfersAdmin();
            fetchUsersList(); // Cargar usuarios para el select
        }
    } else {
        if (tabValue === 1) {
            // USUARIO: HISTORIAL COMPLETO (MP + MANUAL)
            fetchFullUserHistory();
        } else if (tabValue === 2) {
            // USUARIO: OTROS BANCOS (NUEVO)
            fetchUserUnclaimedManuals();
        } else {
            // USUARIO: BUSQUEDA (Solo MP no reclamadas)
            setTransferencias([]);
            setFiltersApplied(false);
        }
    }
  }, [tabValue, isAdmin]); 

  useEffect(() => {
    // Suscripción Realtime solo para Admin en la pestaña "Gestión Global"
    if (isAdmin && tabValue === 0) {
      console.log("Subscribing to 'transferencias' for Realtime updates...");
      const subscription = supabase
        .channel('transferencias_admin_view') // Nombre de canal único
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transferencias' },
          (payload) => {
            console.log('Realtime INSERT received:', payload.new);
            setTransferencias((prev) => [payload.new, ...prev]);
            handleFeedback('Nuevo pago de Mercado Pago recibido!', 'info');
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'transferencias' },
          (payload) => {
            console.log('Realtime UPDATE received:', payload.new);
            // Actualizar el elemento existente o añadir si es nuevo (aunque para UPDATE debería existir)
            setTransferencias((prev) => 
                prev.map(t => t.id_pago === payload.new.id_pago ? payload.new : t)
            );
            handleFeedback('Pago de Mercado Pago actualizado!', 'info');
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'transferencias' },
          (payload) => {
            console.log('Realtime DELETE received:', payload.old);
            setTransferencias((prev) => 
                prev.filter(t => t.id_pago !== payload.old.id_pago)
            );
            handleFeedback('Pago de Mercado Pago eliminado!', 'info');
          }
        )
        .subscribe();

      return () => {
        console.log("Unsubscribing from 'transferencias' Realtime channel.");
        supabase.removeChannel(subscription);
      };
    }
  }, [isAdmin, tabValue]); // Dependencias para re-ejecutar el efecto

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
    setTransferencias([]); 
    setSelectedIds([]); 
  };

  // --- LLAMADAS A LA API (Refactorizadas con apiClient) ---

  const fetchUsersList = async () => {
      if (usersList.length > 0) return;
      try {
          // Ya no necesitamos pasar headers manuales ni URL base
          const response = await apiClient('/api/admin/users');
          const data = await response.json();
          setUsersList(data);
      } catch (e) {
          console.error("Error cargando usuarios", e);
      }
  };

  // 1. Fetch Genérico (Mercado Pago + Manuales Unificadas)
  const fetchTransferencias = async (queryParams = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient(`/api/transferencias${queryParams}`);
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
      // El logout se maneja automáticamente en apiClient si es 401/403
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Admin Manuales (Tabla separada - Solo NO confirmadas)
  const fetchManualTransfersAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient('/api/admin/manual-transfers');
      const data = await response.json();
      setTransferencias(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Usuario Historial Combinado
  const fetchFullUserHistory = async () => {
      setLoading(true);
      setError(null);
      try {
          const response = await apiClient('/api/transferencias?history=true');
          const data = await response.json();
          setTransferencias(data);
      } catch (e) {
          setError("Error al cargar historial completo.");
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // 4. NUEVO: Fetch Usuario "Otros Bancos" (Manuales NO reclamadas)
  const fetchUserUnclaimedManuals = async () => {
    setLoading(true);
    setError(null);
    try {
        const response = await apiClient('/api/manual-transfers/me?unclaimed=true');
        const data = await response.json();
        setTransferencias(data);
    } catch (e) {
        setError("Error al cargar transferencias pendientes.");
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // --- MANEJO DE FORMULARIOS ---

  const handleSearchSubmit = (e) => {
    if(e) e.preventDefault();
    
    // Validación para usuario normal en Búsqueda
    if (!isAdmin && tabValue === 0) {
        const activeFilters = [montoFilter, fechaFilter].filter(Boolean).length;
        if(activeFilters < 2) {
            setError("Por favor, ingrese Monto y Fecha para realizar la búsqueda.");
            return;
        }
        setFiltersApplied(true);
    }

    // Si es Admin en Tab 2 (Manual), recargamos la lista manual
    if(isAdmin && tabValue === 2) {
        fetchManualTransfersAdmin();
        return;
    }
    // Si es Usuario en Tab 2 (Otros Bancos), recargamos
    if(!isAdmin && tabValue === 2) {
        fetchUserUnclaimedManuals();
        return;
    }

    const params = new URLSearchParams();
    
    if (montoFilter) params.append('monto', montoFilter);

    if (isAdmin) {
        if (adminUserFilter) params.append('emailReclamador', adminUserFilter);
        if (dateFromFilter) params.append('fechaDesde', dateFromFilter);
        if (dateToFilter) params.append('fechaHasta', dateToFilter);
        
        // NUEVOS FILTROS
        if (claimStatusFilter !== 'all') params.append('estadoReclamo', claimStatusFilter);
        
        // Enviamos el array unido por comas.
        if (bankFilter.length > 0) params.append('bancos', bankFilter.join(','));
        
        if (tabValue === 1) {
            params.append('confirmed', 'true');
        } else {
            params.append('confirmed', 'false');
        }
    } else {
        if (fechaFilter) {
            params.set('fechaDesde', fechaFilter);
            params.set('fechaHasta', fechaFilter);
        }
    }
    
    if (tabValue === 1 && !isAdmin) {
        params.append('history', 'true');
    }

    fetchTransferencias(`?${params.toString()}`);
  };

  // CAMBIO: Lógica de Exclusión Mutua para Filtro de Bancos
  const handleBankFilterChange = (event) => {
    const { target: { value } } = event;
    const val = typeof value === 'string' ? value.split(',') : value;

    // Si la nueva selección incluye "Todas"
    if (val.includes('Todas')) {
        // Caso 1: Solo está "Todas" (seleccion inicial o re-seleccion unica)
        if (val.length === 1) {
            setBankFilter(val);
        } else {
            // Caso 2: Había otros bancos y el usuario hizo click en "Todas"
            // (El ultimo elemento agregado es "Todas")
            if (val[val.length - 1] === 'Todas') {
                setBankFilter(['Todas']);
            } else {
                // Caso 3: Estaba "Todas" seleccionado y el usuario clickeó un banco específico
                // (Quitamos "Todas" y dejamos los específicos)
                setBankFilter(val.filter(b => b !== 'Todas'));
            }
        }
    } else {
        // "Todas" no está en la selección
        if (val.length === 0) {
            // Si deselecciona todo, volver a "Todas" por defecto
            setBankFilter(['Todas']);
        } else {
            // Selección normal de bancos específicos
            setBankFilter(val);
        }
    }
  };

  const handleManualChange = (e) => {
      setManualData({ ...manualData, [e.target.name]: e.target.value });
  };

  const handleSubmitManual = async () => {
      setLoadingManual(true);
      try {
        const response = await apiClient('/api/admin/manual-transfers', {
            method: 'POST',
            body: JSON.stringify(manualData)
        });

        // apiClient lanza error si !ok, así que no necesitamos checkear manualmente aquí
        await response.json(); 

        handleFeedback('Transferencia manual creada exitosamente', 'success');
        setOpenManualModal(false);
        setManualData({ id_transaccion: '', banco: '', monto: '', userId: '' }); // Reset
        fetchManualTransfersAdmin(); // Recargar tabla

      } catch (error) {
        handleFeedback(error.message, 'error');
      } finally {
        setLoadingManual(false);
      }
  };

  // --- ACCIONES EN TABLA ---

  const handleTransferenciaClaimed = (claimedId) => {
    // Si es Admin en la Tab 0 (Gestión Global), actualizamos el estado localmente
    if (isAdmin && tabValue === 0) {
        setTransferencias(prev => prev.filter(t => {
            const currentId = t.banco ? t.id_transaccion : t.id_pago;
            return currentId !== claimedId;
        }));
        // También quitamos de selectedIds si estaba
        setSelectedIds(prev => prev.filter(id => id !== claimedId));
    } else if (!isAdmin && tabValue === 2) {
        // Si estamos en "Otros Bancos" (usuario), recargamos esa vista
        fetchUserUnclaimedManuals();
    } else {
        // En cualquier otro caso, o si no se hizo una eliminación local, recargamos la data con los filtros actuales
        handleSearchSubmit(null);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
        prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          // Seleccionamos TODOS (Manuales y MP)
          const allIds = transferencias.map(t => t.banco ? t.id_transaccion : t.id_pago);
          setSelectedIds(allIds);
      } else {
          setSelectedIds([]);
      }
  };

  // --- CAMBIO: Solo abre el modal ---
  const handleBatchConfirm = () => {
      if (selectedIds.length === 0) return;
      setOpenConfirmDialog(true);
  };

  // --- NUEVA FUNCIÓN: Ejecuta la acción ---
  const executeBatchConfirm = async () => {
      setOpenConfirmDialog(false);
      setIsConfirming(true);
      try {
        const response = await apiClient('/api/transferencias/confirm-batch', {
            method: 'POST',
            body: JSON.stringify({ ids: selectedIds })
        });
        
        await response.json();

        handleFeedback(`${selectedIds.length} transferencias confirmadas correctamente`, 'success');
        // Eliminar las transferencias confirmadas del estado local
        setTransferencias(prev => prev.filter(t => {
            const currentId = t.banco ? t.id_transaccion : t.id_pago;
            return !selectedIds.includes(currentId);
        }));
        setSelectedIds([]);

      } catch (error) {
        handleFeedback(error.message, 'error');
      } finally {
        setIsConfirming(false);
      }
  };

  // Función completa para exportar PDF
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
    doc.text(`Generado por: ${session?.user?.email}`, 14, 33);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total del reporte: $${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 14, 40);

    let tableColumn = [];
    let tableRows = [];

    // Lógica para definir columnas
    if (isAdmin && tabValue === 2) {
        // CASO: Admin Tablas Manuales
        tableColumn = ["ID Transaccion", "Banco", "Fecha Carga", "Cliente Asignado", "Monto"];
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
        // CASO: Mercado Pago (Admin/User) O Mixto (User Historial)
        tableColumn = ["ID / Ref", "Fecha", "Monto", "Estado", "Origen"];
        
        tableRows = transferencias.map(t => {
            const isManual = !!t.banco;
            
            // Unificar campos
            const idRef = isManual ? t.id_transaccion : t.id_pago;
            
            const rawDate = isManual ? t.fecha_carga : t.datos_completos?.date_approved;
            const fechaFormatted = rawDate 
                ? new Date(rawDate).toLocaleDateString() + ' ' + new Date(rawDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                : 'N/A';

            const rawMonto = isManual ? t.monto : (t.datos_completos?.transaction_amount || 0);
            const montoFormatted = `$${parseFloat(rawMonto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
            
            let estado = t.estado;
            if (estado === 'approved') estado = 'Aprobado';
            else if (estado === 'pending') estado = 'Pendiente';
            
            const origen = isManual ? `Manual (${t.banco})` : 'Mercado Pago';
            
            return [
                idRef,
                fechaFormatted,
                montoFormatted,
                estado,
                origen
            ];
        });
    }

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
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
                    [
                        <Tab key="admin-all" icon={<ListAltIcon />} iconPosition="start" label="Gestión Global" />,
                        <Tab key="admin-confirmed" icon={<CheckCircleIcon />} iconPosition="start" label="Historial" />,
                        <Tab key="admin-manual" icon={<AccountBalanceIcon />} iconPosition="start" label="Otros Bancos" />
                    ]
                ) : (
                    [
                        <Tab key="user-search" icon={<SearchIcon />} iconPosition="start" label="Buscar Pagos" />,
                        <Tab key="user-history" icon={<HistoryIcon />} iconPosition="start" label="Mi Historial" />,
                        <Tab key="user-manual" icon={<AccountBalanceIcon />} iconPosition="start" label="Otros Bancos" />
                    ]
                )}
            </Tabs>
        </Paper>

        {/* BARRA SUPERIOR CON TOTALES Y BOTÓN DE ACCIÓN */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {isAdmin 
                    ? (tabValue === 2 ? 'Otros Bancos (Manual)' : (tabValue === 0 ? 'Pendientes' : 'Confirmadas MP')) 
                    : (tabValue === 0 ? 'Resultados de Búsqueda' : (tabValue === 2 ? 'Otros Bancos (Pendientes de Reclamo)' : 'Mis Transferencias'))}
            </Typography>

            {/* GRUPO DE BOTONES Y TOTALES A LA DERECHA */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* BOTÓN CARGAR (Solo en Admin Tab 2) */}
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

                <StatsCards 
                    isAdmin={isAdmin}
                    selectedIds={selectedIds}
                    totalSelectedAmount={totalSelectedAmount}
                    totalAmount={totalAmount}
                />
            </Box>
        </Box>

        {/* BOTÓN DE CONFIRMAR MASIVO (SOLO ADMIN TAB 0) */}
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

        <TransferFilters
            isAdmin={isAdmin}
            tabValue={tabValue}
            montoFilter={montoFilter} setMontoFilter={setMontoFilter}
            fechaFilter={fechaFilter} setFechaFilter={setFechaFilter}
            adminUserFilter={adminUserFilter} setAdminUserFilter={setAdminUserFilter}
            dateFromFilter={dateFromFilter} setDateFromFilter={setDateFromFilter}
            dateToFilter={dateToFilter} setDateToFilter={setDateToFilter}
            bankFilter={bankFilter} handleBankFilterChange={handleBankFilterChange}
            claimStatusFilter={claimStatusFilter} setClaimStatusFilter={setClaimStatusFilter}
            handleSearchSubmit={handleSearchSubmit}
            handleExportPDF={handleExportPDF}
            transferenciasCount={transferencias.length}
        />

        <TransferTable
            loading={loading}
            error={error}
            isAdmin={isAdmin}
            tabValue={tabValue}
            filtersApplied={filtersApplied}
            transferencias={transferencias}
            selectedIds={selectedIds}
            handleSelectAll={handleSelectAll}
            session={session}
            handleTransferenciaClaimed={handleTransferenciaClaimed}
            handleFeedback={handleFeedback}
            handleToggleSelect={handleToggleSelect}
        />

      </Container>
      
      <ManualTransferModal
        open={openManualModal}
        onClose={() => setOpenManualModal(false)}
        manualData={manualData}
        handleManualChange={handleManualChange}
        handleSubmitManual={handleSubmitManual}
        loadingManual={loadingManual}
        usersList={usersList}
      />

      {/* MODAL DE CONFIRMACIÓN MASIVA (NUEVO) */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirmar Acción"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Estás a punto de confirmar <strong>{selectedIds.length}</strong> transferencias.
            <br />
            El monto total seleccionado es:
            <br />
            <Typography component="span" variant="h5" color="success.main" fontWeight="bold">
                ${totalSelectedAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Typography>
            <br /><br />
            Estas transferencias desaparecerán de la lista de pendientes y pasarán al historial. ¿Deseas continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={executeBatchConfirm} variant="contained" color="success" autoFocus>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={feedback.open} autoHideDuration={3000} onClose={handleCloseFeedback}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;