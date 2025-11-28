import React, { useState } from 'react';
import { 
  TableRow,
  TableCell,
  Typography,
  Chip,
  Box,
  Tooltip,
  Checkbox,
  Badge,
  Popover
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import TouchAppIcon from '@mui/icons-material/TouchApp';

const Transferencia = ({ 
    transferencia, 
    session, 
    onClaimSuccess, 
    onFeedback, 
    isAdmin,
    isSelectable,
    isSelected,
    onToggleSelect
}) => {
  // Detectar tipo
  const isManual = !!transferencia.banco;

  // Normalización de datos
  const idPago = isManual ? transferencia.id_transaccion : transferencia.id_pago;
  
  // Lógica de "Ya Reclamado"
  const isClaimedMP = !isManual && !!transferencia.claimed_by;
  const isClaimedManual = isManual && !!transferencia.fecha_reclamo;
  
  // Propiedad (¿Es mía?)
  const isMine = isManual 
    ? transferencia.user_id === session?.user?.id 
    : transferencia.claimed_by === session?.user?.id;

  // Si ya fue usada por mí
  const isUsedByMe = isManual ? isClaimedManual : isMine;

  // Parsing Datos MP
  const datosParsed = !isManual && typeof transferencia.datos_completos === 'string' 
    ? JSON.parse(transferencia.datos_completos) 
    : (transferencia.datos_completos || {});

  const rawDate = isManual ? transferencia.fecha_carga : datosParsed.date_approved;
  const formattedDate = rawDate 
    ? new Date(rawDate).toLocaleDateString() + ' ' + new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const monto = isManual ? transferencia.monto : datosParsed.transaction_amount;
  const status = isManual ? 'approved' : datosParsed.status;

  let displayName = 'Desconocido';
  let displayDescription = transferencia.descripcion || 'SIN DESCRIPCIÓN';

  if (isManual) {
      displayName = 'Asignado Manualmente';
      displayDescription = `Transferencia ${transferencia.banco}`;
  } else {
      if (datosParsed.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name) {
        displayName = datosParsed.point_of_interaction.transaction_data.bank_info.payer.long_name;
      } else if (datosParsed.payer?.first_name || datosParsed.payer?.last_name) {
        displayName = `${datosParsed.payer.first_name || ''} ${datosParsed.payer.last_name || ''}`.trim();
      } else if (datosParsed.payer?.email) {
        displayName = datosParsed.payer.email;
      } else if (transferencia.email_pagador) {
        displayName = transferencia.email_pagador;
      }
      if (datosParsed.description) displayDescription = datosParsed.description;
  }

  const [loadingClaim, setLoadingClaim] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Estados para Popover de historial de clicks
  const [anchorEl, setAnchorEl] = useState(null);

  const getStatusLabel = (st) => {
      if (isManual) return 'Confirmado';
      switch (st) {
          case 'approved': return 'Aprobado';
          case 'pending': return 'Pendiente';
          default: return st;
      }
  };

  const handlePopoverOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const openPopover = Boolean(anchorEl);

  // --- LÓGICA UNIFICADA DE CLICK ---
  const handleCopyAndClaim = async () => {
    // 1. Siempre copiar al portapapeles primero
    await navigator.clipboard.writeText(idPago.toString());

    // 2. Si soy ADMIN: Registrar el click (auditoría) y notificar
    if (isAdmin) {
        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${idPago}/click`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isManual })
            });
            // No recargamos toda la tabla para no perder foco, pero el usuario verá el contador actualizado al recargar
            if (onFeedback) onFeedback(`ID ${idPago} copiado (Click registrado)`, 'info');
        } catch (e) {
            console.error("Error registrando click", e);
        }
        return;
    }

    // 3. Si soy USUARIO:
    if (isUsedByMe) {
        if (onFeedback) onFeedback(`ID ${idPago} copiado (Ya reclamado)`, 'info');
        return;
    }

    // 4. Si NO está usada, procedemos a "Reclamar"
    try {
      setLoadingClaim(true);
      if (!session?.access_token) throw new Error("No hay sesión activa");

      let url = '';
      if (isManual) {
          url = `${import.meta.env.VITE_API_BASE_URL}/api/manual-transfers/${idPago}/claim`;
      } else {
          url = `${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${idPago}/claim`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al procesar");

      if (onFeedback) onFeedback('¡Copiado y Marcado como Reclamado!', 'success');
      if (onClaimSuccess) onClaimSuccess(); 

    } catch (error) {
      if (onFeedback) onFeedback(error.message, 'error');
    } finally {
      setLoadingClaim(false);
    }
  };

  const handleCopyAmount = () => {
    if (monto) {
        const montoConComa = monto.toString().replace('.', ',');
        navigator.clipboard.writeText(montoConComa);
        if (onFeedback) onFeedback(`Monto copiado: $${montoConComa}`, 'info');
    }
  };

  const handleUnclaim = async () => {
    if(!isAdmin || isManual) return; 
    if(!window.confirm("¿Liberar transferencia?")) return;

    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${idPago}/unclaim`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error("Error");
        if (onClaimSuccess) onClaimSuccess(); 
    } catch (error) {}
  };

  return (
    <TableRow 
      hover 
      sx={{ 
        bgcolor: isUsedByMe ? '#e8f5e9' : 'inherit',
        transition: 'background-color 0.3s'
      }}
    >
      {isSelectable && (
          <TableCell padding="checkbox">
              <Checkbox checked={isSelected || false} onChange={() => onToggleSelect(idPago)} color="primary" />
          </TableCell>
      )}

      {/* ID + ACCIÓN PRINCIPAL */}
      <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            
            {/* COMPORTAMIENTO PRINCIPAL DE COPIADO */}
            <Tooltip title={isAdmin ? "Copiar ID (Registra Click)" : (isUsedByMe ? "Copiar ID (Ya reclamado)" : "Click para Copiar y Reclamar")} arrow>
                <Box 
                    onClick={handleCopyAndClaim}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    cursor: 'pointer',
                    color: isUsedByMe ? 'success.main' : 'text.primary',
                    '&:hover': { color: 'primary.main' }
                    }}
                >
                    {loadingClaim ? (
                        <Typography variant="caption">...</Typography>
                    ) : isUsedByMe ? (
                        <DoneAllIcon fontSize="small" /> 
                    ) : isManual ? (
                        <AccountBalanceIcon fontSize="small" color="action" />
                    ) : isMine ? ( 
                        <AssignmentIndIcon fontSize="small" />
                    ) : (
                        isHovered && !isAdmin && <ContentCopyIcon fontSize="small" color="action" />
                    )}
                    
                    <Typography variant="body2" sx={{ fontWeight: isUsedByMe ? 'bold' : 'normal' }}>
                        {idPago}
                    </Typography>
                </Box>
            </Tooltip>

            {/* INDICADOR DE CLICKS (SOLO ADMIN) */}
            {isAdmin && (transferencia.clicks_count > 0) && (
                <>
                    <Box 
                        onMouseEnter={handlePopoverOpen}
                        onMouseLeave={handlePopoverClose}
                        sx={{ ml: 1, cursor: 'help', display: 'flex', alignItems: 'center' }}
                    >
                        <Badge badgeContent={transferencia.clicks_count} color="secondary" showZero>
                            <TouchAppIcon fontSize="small" color="disabled" />
                        </Badge>
                    </Box>
                    <Popover
                        id="mouse-over-popover"
                        sx={{ pointerEvents: 'none' }}
                        open={openPopover}
                        anchorEl={anchorEl}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        onClose={handlePopoverClose}
                        disableRestoreFocus
                    >
                        <Box sx={{ p: 2, maxHeight: 200, overflowY: 'auto' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Historial de Clicks:</Typography>
                            {transferencia.clicks_history && transferencia.clicks_history.length > 0 ? (
                                transferencia.clicks_history.slice().reverse().map((log, idx) => (
                                    <Box key={idx} sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 0.5 }}>
                                        <Typography variant="caption" display="block" color="primary">{new Date(log.date).toLocaleString()}</Typography>
                                        <Typography variant="caption" display="block" color="text.secondary">{log.user}</Typography>
                                    </Box>
                                ))
                            ) : (
                                <Typography variant="caption">Sin detalles.</Typography>
                            )}
                        </Box>
                    </Popover>
                </>
            )}
        </Box>
      </TableCell>
      
      {/* DESCRIPCIÓN / BANCO */}
      <TableCell>
        {isManual ? (
            <Chip label={transferencia.banco} size="small" color={isUsedByMe ? "success" : "primary"} variant="outlined"/>
        ) : (
            <Typography variant="body2" sx={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{displayDescription}</Typography>
        )}
      </TableCell>

      <TableCell>{formattedDate}</TableCell>

      <TableCell>
        <Chip label={getStatusLabel(status)} color={isUsedByMe ? 'success' : (status === 'approved' ? 'success' : 'default')} size="small" variant="outlined" />
      </TableCell>

      {/* ADMIN: USUARIO ASIGNADO / RECLAMADO POR */}
      {isAdmin && (
        <TableCell>
            {(isManual ? transferencia.user_id : transferencia.claimed_by) ? (
                <Chip 
                    icon={isManual && transferencia.fecha_reclamo ? <DoneAllIcon/> : <AssignmentIndIcon />}
                    label={transferencia.usuarios?.email || 'ID Usuario: ' + (isManual ? transferencia.user_id : transferencia.claimed_by).slice(0, 8)}
                    size="small" 
                    variant={isManual && transferencia.fecha_reclamo ? "filled" : "outlined"}
                    color={isManual && transferencia.fecha_reclamo ? "success" : "primary"}
                    onDelete={!isManual ? handleUnclaim : undefined}
                />
            ) : (
                <Chip icon={<PersonOffIcon />} label="Libre" size="small" variant="outlined" />
            )}
        </TableCell>
      )}

      {/* MONTO + COPY */}
      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
        <Tooltip title="Copiar Monto" arrow placement="top">
            <Box
                component="span"
                onClick={handleCopyAmount}
                sx={{ 
                    cursor: 'pointer', 
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: isUsedByMe ? 'success.dark' : 'inherit',
                    '&:hover': { bgcolor: 'action.hover', color: 'primary.main' }
                }}
            >
                ${parseFloat(monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Box>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default Transferencia;