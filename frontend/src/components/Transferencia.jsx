import React, { useState } from 'react';
import { 
  TableRow,
  TableCell,
  Typography,
  Chip,
  Box,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // Icono para Banco

const Transferencia = ({ transferencia, session, onClaimSuccess, onFeedback, isAdmin }) => {
  const { id_pago, claimed_by, datos_completos, usuarios, email_pagador } = transferencia;
  
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Estados para el Modal de Titular Real
  const [openBankInfo, setOpenBankInfo] = useState(false);
  const [bankInfo, setBankInfo] = useState(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [errorBankInfo, setErrorBankInfo] = useState(null);

  const isMine = !!claimed_by && claimed_by === session?.user?.id; 

  const datosParsed = typeof datos_completos === 'string' 
    ? JSON.parse(datos_completos) 
    : (datos_completos || {});

  const {
    date_approved,
    status,
    transaction_amount,
    description,
    payer,
    point_of_interaction
  } = datosParsed;

  // Lógica Visual Básica (Nombre "cacheado" o del webhook inicial)
  let displayName = 'Desconocido';
  if (point_of_interaction?.transaction_data?.bank_info?.payer?.long_name) {
    displayName = point_of_interaction.transaction_data.bank_info.payer.long_name;
  } else if (payer?.first_name || payer?.last_name) {
    displayName = `${payer.first_name || ''} ${payer.last_name || ''}`.trim();
  } else if (payer?.email) {
    displayName = payer.email;
  } else if (email_pagador) {
    displayName = email_pagador;
  }

  const identificationNumber = payer?.identification?.number || null;
  const identificationType = payer?.identification?.type || 'ID';
  const displayIdentification = identificationNumber 
    ? `${identificationType}: ${identificationNumber}`
    : 'ID No Disponible';

  const formattedDate = date_approved 
    ? new Date(date_approved).toLocaleDateString() + ' ' + new Date(date_approved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
      switch (status) {
          case 'approved': return 'Aprobado';
          case 'pending': return 'Pendiente';
          case 'rejected': return 'Rechazado';
          case 'accredited': return 'Acreditado';
          default: return status;
      }
  };

  // --- NUEVA LÓGICA: CONSULTAR TITULAR REAL (LIVE) ---
  const handleOpenBankInfo = async (e) => {
    e.stopPropagation();
    setOpenBankInfo(true);
    
    // Si ya lo tenemos cargado en memoria local, no recargamos
    if (bankInfo) return;

    setLoadingBankInfo(true);
    setErrorBankInfo(null);

    try {
        if (!session?.access_token) throw new Error("Sin sesión activa");

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${id_pago}/titular-real`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) {
            throw new Error("No se pudo obtener la información bancaria.");
        }

        const data = await response.json();
        setBankInfo(data);

    } catch (err) {
        setErrorBankInfo(err.message);
    } finally {
        setLoadingBankInfo(false);
    }
  };

  const handleCopyAndClaim = async () => {
    if (claimed_by || isAdmin) {
       navigator.clipboard.writeText(id_pago.toString());
       if (onFeedback) onFeedback('ID copiado al portapapeles', 'info');
       return;
    }
    try {
      setLoadingClaim(true);
      await navigator.clipboard.writeText(id_pago.toString());
      if (!session?.access_token) throw new Error("No hay sesión activa");

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${id_pago}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al reclamar");

      if (onFeedback) onFeedback('¡Transferencia reclamada y copiada!', 'success');
      if (onClaimSuccess) onClaimSuccess();
    } catch (error) {
      if (onFeedback) onFeedback(error.message, 'error');
    } finally {
      setLoadingClaim(false);
    }
  };

  const handleUnclaim = async () => {
    if(!isAdmin) return;
    if(!window.confirm("¿Estás seguro de que deseas liberar esta transferencia?")) return;
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${id_pago}/unclaim`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error("Error al liberar transferencia");
        if (onFeedback) onFeedback('Transferencia liberada exitosamente', 'success');
        if (onClaimSuccess) onClaimSuccess(); 
    } catch (error) {
        if (onFeedback) onFeedback(error.message, 'error');
    }
  };

  const handleCopyAmount = () => {
    if (transaction_amount) {
        const montoConComa = transaction_amount.toString().replace('.', ',');
        navigator.clipboard.writeText(montoConComa);
        if (onFeedback) onFeedback(`Monto copiado: $${montoConComa}`, 'info');
    }
  };

  return (
    <>
      <TableRow 
        hover 
        sx={{ 
          bgcolor: isMine ? 'action.hover' : 'inherit',
          transition: 'background-color 0.3s'
        }}
      >
        <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            
            {/* BOTÓN TITULAR REAL (BANCARIO) */}
            <Tooltip title="Consultar Titular Bancario Real (Live)">
              <IconButton size="small" onClick={handleOpenBankInfo} color="primary">
                <AccountBalanceIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>

            <Tooltip title={claimed_by || isAdmin ? "Solo copiar ID" : "Click para Copiar ID y Reclamar"} arrow>
              <Box 
                onClick={handleCopyAndClaim}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5, 
                  cursor: 'pointer',
                  color: isMine ? 'primary.main' : 'text.primary',
                  '&:hover': { color: 'primary.dark' }
                }}
              >
                {id_pago}
                {loadingClaim ? (
                    <Typography variant="caption">...</Typography>
                ) : isMine ? (
                    <AssignmentIndIcon fontSize="small" />
                ) : (
                    isHovered && !claimed_by && !isAdmin && <ContentCopyIcon fontSize="small" color="action" />
                )}
              </Box>
            </Tooltip>
          </Box>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 500 }}>
              {description || 'SIN DESCRIPCIÓN'}
          </Typography>
        </TableCell>

        <TableCell>{formattedDate}</TableCell>

        {/* CELDA DE PAGADOR (Datos Iniciales) */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.70rem' }}>
                  {displayIdentification}
              </Typography>
          </Box>
        </TableCell>

        <TableCell>
          <Chip 
              label={getStatusLabel(status)} 
              color={getStatusColor(status)} 
              size="small" 
              variant="outlined"
              sx={{ fontWeight: 'bold' }}
          />
        </TableCell>

        {isAdmin && (
          <TableCell>
              {claimed_by ? (
                  <Chip 
                      icon={<AssignmentIndIcon />}
                      label={usuarios?.email || 'Usuario ID: ' + claimed_by.slice(0, 8) + '...'} 
                      size="small" 
                      variant="outlined"
                      color="primary"
                      onDelete={handleUnclaim}
                      deleteIcon={
                          <Tooltip title="Liberar Transferencia">
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'error.main', borderRadius: '50%', width: 16, height: 16, color: 'white', fontSize: '10px', cursor: 'pointer', '&:hover': { bgcolor: 'error.dark' } }}>
                                  X
                              </Box>
                          </Tooltip>
                      }
                  />
              ) : (
                  <Chip icon={<PersonOffIcon />} label="Libre" size="small" variant="outlined" color="default" sx={{ borderStyle: 'dashed' }} />
              )}
          </TableCell>
        )}

        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
          <Box
              component="span"
              onClick={handleCopyAmount}
              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          >
              ${transaction_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </Box>
        </TableCell>
      </TableRow>

      {/* MODAL DE INFORMACIÓN BANCARIA REAL */}
      <Dialog
        open={openBankInfo}
        onClose={() => setOpenBankInfo(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon color="primary" />
          Detalle Bancario (En Vivo)
        </DialogTitle>
        <DialogContent dividers>
          {loadingBankInfo ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : errorBankInfo ? (
            <Alert severity="error">Error: {errorBankInfo}</Alert>
          ) : bankInfo ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  TITULAR DE LA CUENTA
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#1565c0' }}>
                  {bankInfo.nombre_titular}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Origen: {bankInfo.origen_dato}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2"><strong>ID Operación:</strong> {bankInfo.id_operacion}</Typography>
                <Typography variant="body2"><strong>Monto Real:</strong> ${bankInfo.monto?.toLocaleString('es-AR')}</Typography>
                <Typography variant="body2"><strong>Fecha Creación:</strong> {new Date(bankInfo.fecha_creacion).toLocaleString()}</Typography>
                <Typography variant="body2"><strong>Estado:</strong> {getStatusLabel(bankInfo.estado)}</Typography>
              </Box>

              <Alert severity="info" sx={{ mt: 1 }}>
                Esta información se obtuvo consultando directamente a Mercado Pago en este momento.
              </Alert>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBankInfo(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Transferencia;