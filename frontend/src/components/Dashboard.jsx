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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
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
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StorefrontIcon from '@mui/icons-material/Storefront'; // Icono para el logo placeholder

import espintLogo from '../assets/espintBlanco.svg';
import mercurioLogo from '../assets/mercurioBlanco.svg';
import casaPintorLogo from '../assets/casaDelPintorBlanco.svg';
import automotorLogo from '../assets/automotorBlanco.svg';

const drawerWidth = 260;
const closedDrawerWidth = 72; // Ancho cuando está cerrado (suficiente para iconos)

function Dashboard({ session, onLogout }) {
  const [open, setOpen] = useState(false); // Sidebar cerrado por defecto (tipo hamburguesa)
  const [transferencias, setTransferencias] = useState([]);
  const [totalTransfers, setTotalTransfers] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Notificaciones
  const [notificaciones, setNotificaciones] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

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

    const params = new URLSearchParams();
    if (isAdmin) {
      if (tabValue === 0) {
        // Tab 0 (Gestión Global): Trae las pendientes MP + Manuales
        params.append('confirmed', 'false');
        fetchTransferencias(`?${params.toString()}`);
      } else if (tabValue === 1) {
        // Tab 1 (Confirmadas): Trae el historial unificado de confirmadas
        params.append('confirmed', 'true');
        fetchTransferencias(`?${params.toString()}`);
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
  }, [tabValue, isAdmin, page, rowsPerPage]);

  useEffect(() => {
    // Suscripción Realtime solo para Admin en la pestaña "Gestión Global"
    if (isAdmin && tabValue === 0) {
      const subscription = supabase
        .channel('transferencias_admin_view') // Nombre de canal único
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transferencias' },
          (payload) => {
            setTransferencias((prev) => [payload.new, ...prev]);
            setTotalTransfers((prev) => prev + 1);
            handleFeedback('Nuevo pago de Mercado Pago recibido!', 'info');
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'transferencias' },
          (payload) => {
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
            setTransferencias((prev) =>
              prev.filter(t => t.id_pago !== payload.old.id_pago)
            );
            setTotalTransfers((prev) => prev - 1);
            handleFeedback('Pago de Mercado Pago eliminado!', 'info');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isAdmin, tabValue]); // Dependencias para re-ejecutar el efecto

  // Efecto para Notificaciones (Solo para no-admins)
  useEffect(() => {
    if (isAdmin) return;

    const fetchNotificaciones = async () => {
      try {
        const response = await apiClient('/api/notificaciones');
        const data = await response.json();
        if (Array.isArray(data)) {
          setNotificaciones(data);
        }
      } catch (e) {
        console.error("Error fetching notifications:", e.message);
      }
    };

    fetchNotificaciones(); // Cargar al inicio
    const intervalId = setInterval(fetchNotificaciones, 30000); // Polling cada 30 segundos

    return () => clearInterval(intervalId); // Limpiar intervalo al desmontar
  }, [isAdmin]);

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setError(null);
    setTransferencias([]);
    setSelectedIds([]);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // --- MANEJO DE NOTIFICACIONES ---
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleClearNotifications = () => {
    setNotificaciones([]);
    handleMenuClose();
  };


  // --- LLAMADAS A LA API (Refactorizadas con apiClient) ---

  const fetchUsersList = async () => {
    if (usersList.length > 0) return;
    try {
      // Ya no necesitamos pasar headers manuales ni URL base
      const response = await apiClient('/api/admin/users');
      const data = await response.json();
      setUsersList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando usuarios", e);
    }
  };

  // 1. Fetch Genérico (Mercado Pago + Manuales Unificadas)
  const fetchTransferencias = async (queryParams = '') => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(queryParams);
    params.append('page', page + 1);
    params.append('limit', rowsPerPage);

    try {
      const response = await apiClient(`/api/transferencias?${params.toString()}`);
      const { data, totalCount } = await response.json();
      const transferenciasData = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      setTransferencias(transferenciasData);
      setTotalTransfers(totalCount || 0);
    } catch (e) {
      setError(e.message);
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
      const transferenciasData = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      setTransferencias(transferenciasData);
      setTotalTransfers(transferenciasData.length);
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
      const params = new URLSearchParams();
      params.append('history', 'true');
      params.append('page', page + 1);
      params.append('limit', rowsPerPage);
      const response = await apiClient(`/api/transferencias?${params.toString()}`);
      const { data, totalCount } = await response.json();
      const transferenciasData = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      setTransferencias(transferenciasData);
      setTotalTransfers(totalCount || 0);
    } catch (e) {
      setError("Error al cargar historial completo.");
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
      const transferenciasData = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      setTransferencias(transferenciasData);
      setTotalTransfers(transferenciasData.length);
    } catch (e) {
      setError("Error al cargar transferencias pendientes.");
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJO DE FORMULARIOS ---

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(0);

    // Validación para usuario normal en Búsqueda
    if (!isAdmin && tabValue === 0) {
      const activeFilters = [montoFilter, fechaFilter].filter(Boolean).length;
      if (activeFilters < 2) {
        setError("Por favor, ingrese Monto y Fecha para realizar la búsqueda.");
        return;
      }
      setFiltersApplied(true);
    }

    // Si es Admin en Tab 2 (Manual), recargamos la lista manual
    if (isAdmin && tabValue === 2) {
      fetchManualTransfersAdmin();
      return;
    }
    // Si es Usuario en Tab 2 (Otros Bancos), recargamos
    if (!isAdmin && tabValue === 2) {
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
      setTotalTransfers((prev) => prev - 1);
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
      setTotalTransfers((prev) => prev - selectedIds.length);
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
          ? new Date(rawDate).toLocaleDateString() + ' ' + new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      headStyles: { fillColor: [24, 48, 80] }, // Azul Mercurio
    });

    doc.save(`Mercurio_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
    handleFeedback('PDF generado exitosamente', 'success');
  };

  const handleFeedback = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const handleCloseFeedback = () => setFeedback({ ...feedback, open: false });

  // --- RENDERIZADO DEL SIDEBAR ---
  const theme = useTheme(); // Hook del tema
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Mobile/Tablet < 900px

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: session?.user?.Area?.toLowerCase() === 'automotor' ? '#000000' : 'primary.main', color: 'white', overflowX: 'hidden' }}>
      {/* HEADER DEL SIDEBAR CON LOGO Y TOGGLE */}
      <Box sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: (open || isMobile) ? 'space-between' : 'center', // En mobile siempre muestra todo
        minHeight: 64,
        position: 'relative'
      }}>
        {(open || isMobile) ? (
          <>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              gap: 1
            }}>
              {(() => {
                const area = session?.user?.Area?.toLowerCase();
                let logoSrc = null;

                if (area === 'espint') logoSrc = espintLogo;
                else if (area === 'hogar') logoSrc = mercurioLogo;
                else if (area === 'pintor') logoSrc = casaPintorLogo;
                else if (area === 'automotor') logoSrc = automotorLogo;

                if (logoSrc) {
                  return (
                    <Box
                      component="img"
                      src={logoSrc}
                      alt="Logo"
                      sx={{
                        height: 'auto',
                        maxHeight: 50,
                        maxWidth: 130,
                        width: 'auto',
                        objectFit: 'contain'
                      }}
                    />
                  );
                }

                return (
                  <>
                    <StorefrontIcon sx={{ fontSize: 30, color: '#FFC20E' }} /> {/* Amarillo Brand */}
                    <Box>
                      <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1, letterSpacing: '-0.5px' }}>
                        Mercurio
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Pinturerías
                      </Typography>
                    </Box>
                  </>
                );
              })()}
            </Box>
            {/* Botón para cerrar drawer en mobile o colapsar en desktop */}
            <IconButton onClick={handleDrawerToggle} sx={{ color: 'white', zIndex: 1 }}>
              <ChevronLeftIcon />
            </IconButton>
          </>
        ) : (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
            <MenuIcon />
          </IconButton>
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ flexGrow: 1, px: 1, mt: 2 }}>
        {isAdmin ? (
          <>
            <ListItemButton
              selected={tabValue === 0}
              onClick={() => { handleTabChange(0); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: (open || isMobile) ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
                <ListAltIcon />
              </ListItemIcon>
              {(open || isMobile) && <ListItemText primary="Gestión Global" />}
            </ListItemButton>
            <ListItemButton
              selected={tabValue === 1}
              onClick={() => { handleTabChange(1); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: (open || isMobile) ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
                <CheckCircleIcon />
              </ListItemIcon>
              {(open || isMobile) && <ListItemText primary="Historial" />}
            </ListItemButton>
            <ListItemButton
              selected={tabValue === 2}
              onClick={() => { handleTabChange(2); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: (open || isMobile) ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
                <AccountBalanceIcon />
              </ListItemIcon>
              {(open || isMobile) && <ListItemText primary="Otros Bancos" />}
            </ListItemButton>
          </>
        ) : (
          <>
            <ListItemButton
              selected={tabValue === 0}
              onClick={() => { handleTabChange(0); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: (open || isMobile) ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
                <SearchIcon />
              </ListItemIcon>
              {(open || isMobile) && <ListItemText primary="Buscar Pagos" />}
            </ListItemButton>
            <ListItemButton
              selected={tabValue === 1}
              onClick={() => { handleTabChange(1); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: (open || isMobile) ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
                <HistoryIcon />
              </ListItemIcon>
              {(open || isMobile) && <ListItemText primary="Historial" />}
            </ListItemButton>
            <ListItemButton
              selected={tabValue === 2}
              onClick={() => { handleTabChange(2); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: (open || isMobile) ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
                <AccountBalanceIcon />
              </ListItemIcon>
              {(open || isMobile) && <ListItemText primary="Otros Bancos" />}
            </ListItemButton>
          </>
        )}
      </List>

      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={onLogout}
          sx={{
            borderRadius: 2,
            justifyContent: (open || isMobile) ? 'initial' : 'center',
            px: 2.5,
            bgcolor: 'rgba(0,0,0,0.2)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: (open || isMobile) ? 2 : 'auto', justifyContent: 'center', color: 'white' }}>
            <LogoutIcon />
          </ListItemIcon>
          {(open || isMobile) && <ListItemText primary="Cerrar Sesión" />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* APP BAR (Solo visible en Mobile para el botón de menú) */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            bgcolor: session?.user?.Area?.toLowerCase() === 'automotor' ? '#000000' : 'primary.main'
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ color: 'white' }}>
              Mercurio
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* DRAWER RESPONSIVE */}
      <Box
        component="nav"
        sx={{ width: { md: open ? drawerWidth : closedDrawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile Drawer (Temporary) */}
        <Drawer
          variant="temporary"
          open={open && isMobile}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer (Permanent) */}
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: open ? drawerWidth : closedDrawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${open ? drawerWidth : closedDrawerWidth}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          mt: isMobile ? 8 : 0 // Margen superior en mobile por el AppBar
        }}
      >
        {/* Toolbar spacer para desktop si fuera necesario, pero aquí lo manejamos con mt en mobile */}

        {/* CONTENIDO PRINCIPAL */}
        <Container maxWidth="xl" disableGutters>
          {/* ... resto del contenido ... */}

          {/* Título y Bienvenida */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, letterSpacing: '-1px', color: 'text.primary' }}>
                {isAdmin ? 'Panel de Control' : 'Mis Transferencias'}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Bienvenido, {session?.user?.email}
              </Typography>
            </Box>

            {/* Avatar y Notificaciones */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* ... (código existente de notificaciones) ... */}
              {!isAdmin && (
                <>
                  <IconButton color="primary" onClick={handleMenuOpen}>
                    <Badge badgeContent={notificaciones.length} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    {notificaciones.length === 0 ? (
                      <MenuItem onClick={handleMenuClose}>Sin notificaciones nuevas</MenuItem>
                    ) : (
                      [
                        <MenuItem key="clear" onClick={handleClearNotifications} sx={{ justifyContent: 'center', color: 'primary.main', fontWeight: 'bold' }}>
                          Limpiar Todo
                        </MenuItem>,
                        ...notificaciones.map((n, index) => (
                          <MenuItem key={index} onClick={handleMenuClose}>
                            <ListItemText
                              primary={`Nueva transferencia de ${n.banco || 'Desconocido'}`}
                              secondary={`Monto: $${n.monto ? parseFloat(n.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0,00'}`}
                              primaryTypographyProps={{ variant: 'body2', color: 'text.primary', fontWeight: 'bold' }}
                              secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                            />
                          </MenuItem>
                        ))
                      ]
                    )}
                  </Menu>
                </>
              )}
              <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48, boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }}>
                {session?.user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
          </Box>

          {/* Stats Cards (Solo Admin Tab 0) */}
          {isAdmin && tabValue === 0 && (
            <StatsCards totalTransfers={totalTransfers} totalAmount={totalAmount} />
          )}

          {/* Filtros */}
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

          {/* Botón Nueva Transferencia Manual (Solo Admin Tab 2) */}
          {isAdmin && tabValue === 2 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => setOpenManualModal(true)}
              >
                Nueva Transferencia
              </Button>
            </Box>
          )}

          {/* Acciones Masivas (Solo Admin Tab 0) */}
          {isAdmin && tabValue === 0 && selectedIds.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" color="primary.dark" fontWeight="bold">
                  {selectedIds.length} seleccionados
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total: ${totalSelectedAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleBatchConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? 'Procesando...' : 'Confirmar Selección'}
              </Button>
            </Paper>
          )}

          {/* Tabla de Transferencias */}
          <TransferTable
            loading={loading}
            error={error}
            isAdmin={isAdmin}
            tabValue={tabValue}
            filtersApplied={filtersApplied}
            transferencias={transferencias}
            totalTransfers={totalTransfers}
            page={page}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            selectedIds={selectedIds}
            handleSelectAll={handleSelectAll}
            session={session}
            handleTransferenciaClaimed={handleTransferenciaClaimed}
            handleFeedback={handleFeedback}
            handleToggleSelect={handleToggleSelect}
          />
          <ManualTransferModal
            open={openManualModal}
            onClose={() => setOpenManualModal(false)}
            manualData={manualData}
            handleManualChange={handleManualChange}
            handleSubmitManual={handleSubmitManual}
            loadingManual={loadingManual}
            usersList={usersList}
          />

        </Container>

        {/* MODAL DE CONFIRMACIÓN MASIVA */}
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
    </Box>
  );
}

export default Dashboard;