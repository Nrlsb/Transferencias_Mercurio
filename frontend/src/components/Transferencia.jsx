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
import VisibilityIcon from '@mui/icons-material/Visibility';

const Transferencia = ({
  transferencia,
  session,
  onClaimSuccess,
  onFeedback,
  isAdmin,
  isSelectable,
  isSelected,
  onToggleSelect,
  showClaimDate // Recibimos la propiedad para mostrar la columna extra
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

  // Formateo de Fecha de Reclamo (con fallback seguro)
  const rawClaimDate = isManual ? transferencia.fecha_reclamo : transferencia.fecha_reclamo; // En MP ahora también es fecha_reclamo
  const formattedClaimDate = rawClaimDate
    ? new Date(rawClaimDate).toLocaleDateString() + ' ' + new Date(rawClaimDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '-';

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
    if (transferencia.clicks_count > 0) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const openPopover = Boolean(anchorEl);

  // --- LÓGICA UNIFICADA DE CLICK ---
  const handleCopyAndClaim = async () => {
    await navigator.clipboard.writeText(idPago.toString());

    // 2. REGISTRO DE AUDITORÍA (SOLO USUARIOS NO ADMIN)
    if (!isAdmin) {
      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${idPago}/click`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isManual })
        });
      } catch (e) {
        console.error("Error registrando click", e);
      }
    }

    if (isAdmin) {
      if (onFeedback) onFeedback(`ID ${idPago} copiado`, 'info');
      return;
    }

    if (isUsedByMe) {
      if (onFeedback) onFeedback(`ID ${idPago} copiado (Ya reclamado)`, 'info');
      return;
    }

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

      if (onClaimSuccess) onClaimSuccess(idPago);

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
    if (!isAdmin || isManual) return;
    if (!window.confirm("¿Liberar transferencia?")) return;

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
    } catch (error) { }
  };

  return (
    <TableRow
      hover
      sx={{
        bgcolor: isUsedByMe ? '#e8f5e9' : 'inherit',
        transition: 'background-color 0.3s'
      }}
    >
      {/* 1. CHECKBOX (Solo Admin Tab 0) */}
      {isSelectable && (
        <TableCell padding="checkbox">
          <Checkbox checked={isSelected || false} onChange={() => onToggleSelect(idPago)} color="primary" />
        </TableCell>
      )}

      {/* 2. ID + CLICK (Todos) */}
      <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isAdmin ? "Copiar ID" : (isUsedByMe ? "Copiar ID (Ya reclamado)" : "Click para Copiar y Reclamar")} arrow>
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
              {loadingClaim ? <Typography variant="caption">...</Typography>
                : isUsedByMe ? <DoneAllIcon fontSize="small" />
                  : isManual ? <AccountBalanceIcon fontSize="small" color="action" />
                    : isMine ? <AssignmentIndIcon fontSize="small" />
                      : (isHovered && !isAdmin && <ContentCopyIcon fontSize="small" color="action" />)}

              <Typography variant="body2" sx={{ fontWeight: isUsedByMe ? 'bold' : 'normal' }}>
                {idPago}
              </Typography>
            </Box>
          </Tooltip>

          {isAdmin && (
            <>
              <Box
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
                sx={{ ml: 1, cursor: 'help', display: 'flex', alignItems: 'center', opacity: transferencia.clicks_count > 0 ? 1 : 0.3 }}
              >
                <Badge badgeContent={transferencia.clicks_count || 0} color="secondary" showZero anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <TouchAppIcon fontSize="small" color="action" />
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
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Historial de Clicks (Clientes):</Typography>
                  {transferencia.clicks_history && transferencia.clicks_history.length > 0 ? (
                    transferencia.clicks_history.slice().reverse().map((log, idx) => (
                      <Box key={idx} sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 0.5 }}>
                        <Typography variant="caption" display="block" color="primary">
                          {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString()}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">{log.user}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption">Sin historial.</Typography>
                  )}
                </Box>
              </Popover>
            </>
          )}
        </Box>
      </TableCell>

      {/* 3. DESCRIPCION (Todos) */}
      <TableCell>
        {isManual ? (
          <Chip label={transferencia.banco} size="small" color={isUsedByMe ? "success" : "primary"} variant="outlined" />
        ) : (
          <Chip
            label="Mercado Pago"
            size="small"
            sx={{
              bgcolor: '#009EE3',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              '&:hover': { bgcolor: '#008AC6' }
            }}
          />
        )}
      </TableCell>

      {/* 4. FECHA (Todos) */}
      <TableCell>{formattedDate}</TableCell>

      {/* 4.5 FECHA REAL (Solo Admin) */}
      {isAdmin && (
        <TableCell>
          {transferencia.fecha_real
            ? new Date(transferencia.fecha_real).toLocaleDateString() + ' ' + new Date(transferencia.fecha_real).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-'}
        </TableCell>
      )}

      {/* 5. ESTADO (Todos) */}
      <TableCell>
        <Chip
          label={getStatusLabel(status)}
          color={isUsedByMe ? 'success' : (status === 'approved' ? 'success' : (status === 'pending' ? 'info' : 'default'))}
          size="small"
          variant="filled" // Usar filled para que el color destaque más
          sx={{ fontWeight: 600, color: '#fff' }}
        />
      </TableCell>

      {/* 6. FECHA RECLAMO (Solo Cliente Historial - CORRECCIÓN VISUAL) */}
      {showClaimDate && (
        <TableCell>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            {formattedClaimDate}
          </Typography>
        </TableCell>
      )}

      {/* 7. ADMIN USER (Solo Admin) */}
      {isAdmin && (
        <TableCell>
          {(isManual ? transferencia.user_id : transferencia.claimed_by) ? (
            <Chip
              icon={isManual && transferencia.fecha_reclamo ? <DoneAllIcon /> : <AssignmentIndIcon />}
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

      {/* 8. MONTO (Todos - A la derecha) */}
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