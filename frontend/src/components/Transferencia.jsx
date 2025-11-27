import React, { useState } from 'react';
import { 
  TableRow,
  TableCell,
  Typography,
  Chip,
  Box,
  Tooltip,
  Checkbox
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

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
  // Detectar si es manual
  const isManual = !!transferencia.banco;

  // Normalización de datos (Manual vs Mercado Pago)
  const idPago = isManual ? transferencia.id_transaccion : transferencia.id_pago;
  const ownerId = isManual ? transferencia.user_id : transferencia.claimed_by;
  
  // Verificamos propiedad
  const isMine = !!ownerId && ownerId === session?.user?.id; 

  // Datos MP
  const datosParsed = !isManual && typeof transferencia.datos_completos === 'string' 
    ? JSON.parse(transferencia.datos_completos) 
    : (transferencia.datos_completos || {});

  // Extracción de Fecha
  const rawDate = isManual ? transferencia.fecha_carga : datosParsed.date_approved;
  const formattedDate = rawDate 
    ? new Date(rawDate).toLocaleDateString() + ' ' + new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  // Extracción de Monto
  const monto = isManual ? transferencia.monto : datosParsed.transaction_amount;

  // Extracción de Estado
  const status = isManual ? 'approved' : datosParsed.status;

  // Lógica de Nombre/Descripción
  let displayName = 'Desconocido';
  let displayDescription = transferencia.descripcion || 'SIN DESCRIPCIÓN';

  if (isManual) {
      displayName = 'Manual'; // O podrías poner el nombre del admin si lo tuvieras
      displayDescription = `Transferencia ${transferencia.banco}`;
  } else {
      // Lógica MP (Existente)
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

  const getStatusColor = (st) => {
    if (isManual) return 'success'; // Manuales siempre verdes/aprobadas
    switch (st) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (st) => {
      if (isManual) return 'Confirmado';
      switch (st) {
          case 'approved': return 'Aprobado';
          case 'pending': return 'Pendiente';
          case 'rejected': return 'Rechazado';
          case 'accredited': return 'Acreditado';
          default: return st;
      }
  };

  // LÓGICA DE COPIADO E IDENTIFICACIÓN
  const handleCopyAndClaim = async () => {
    // Caso 1: Ya es mío (MP reclamado o Manual asignado) O soy Admin -> Solo copiar
    if (ownerId || isAdmin || isManual) {
       navigator.clipboard.writeText(idPago.toString());
       if (onFeedback) onFeedback(`ID ${idPago} copiado al portapapeles`, 'success');
       return;
    }

    // Caso 2: Es de MP y está libre -> Reclamar y Copiar
    try {
      setLoadingClaim(true);
      await navigator.clipboard.writeText(idPago.toString());

      if (!session?.access_token) throw new Error("No hay sesión activa");

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${idPago}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al reclamar");
      }

      if (onFeedback) onFeedback('¡Transferencia reclamada y copiada!', 'success');
      if (onClaimSuccess) onClaimSuccess();

    } catch (error) {
      if (onFeedback) onFeedback(error.message, 'error');
    } finally {
      setLoadingClaim(false);
    }
  };

  const handleCopyAmount = () => {
    if (monto) {
        // Formato con coma para facilitar pegado en Excel/Sheets local
        const montoConComa = monto.toString().replace('.', ',');
        navigator.clipboard.writeText(montoConComa);
        if (onFeedback) onFeedback(`Monto copiado: $${montoConComa}`, 'info');
    }
  };

  const handleUnclaim = async () => {
    if(!isAdmin || isManual) return; // No desreclamar manuales por ahora
    if(!window.confirm("¿Estás seguro de que deseas liberar esta transferencia?")) return;

    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${idPago}/unclaim`, {
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

  return (
    <TableRow 
      hover 
      sx={{ 
        bgcolor: isMine ? (isManual ? '#e8f5e9' : 'action.hover') : 'inherit', // Verde suave si es manual mía
        transition: 'background-color 0.3s'
      }}
    >
      {isSelectable && (
          <TableCell padding="checkbox">
              <Checkbox 
                checked={isSelected || false}
                onChange={() => onToggleSelect(idPago)}
                color="primary"
              />
          </TableCell>
      )}

      {/* ID + COPY ACTION */}
      <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
        <Tooltip title="Click para Copiar ID" arrow>
          <Box 
            onClick={handleCopyAndClaim}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              cursor: 'pointer',
              color: isMine ? 'primary.main' : 'text.primary',
              '&:hover': { color: 'primary.dark' }
            }}
          >
            {idPago}
            {/* Iconografía dinámica */}
            {loadingClaim ? (
                <Typography variant="caption">...</Typography>
            ) : isManual ? (
                <AccountBalanceIcon fontSize="small" color="success" />
            ) : isMine ? (
                <AssignmentIndIcon fontSize="small" />
            ) : (
                isHovered && !ownerId && !isAdmin && <ContentCopyIcon fontSize="small" color="action" />
            )}
          </Box>
        </Tooltip>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 500 }}>
            {isManual ? <Chip label={transferencia.banco} size="small" color="primary" variant="outlined"/> : displayDescription}
        </Typography>
      </TableCell>

      <TableCell>{formattedDate}</TableCell>

      <TableCell>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {displayName}
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
            {ownerId ? (
                <Chip 
                    icon={<AssignmentIndIcon />}
                    label={transferencia.usuarios?.email || 'Usuario ID: ' + ownerId.slice(0, 8) + '...'} 
                    size="small" 
                    variant="outlined"
                    color="primary"
                    onDelete={!isManual ? handleUnclaim : undefined} // Solo permitir liberar MP
                    deleteIcon={
                        !isManual && (
                        <Tooltip title="Liberar Transferencia">
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'error.main', borderRadius: '50%', width: 16, height: 16, color: 'white', fontSize: '10px', cursor: 'pointer', '&:hover': { bgcolor: 'error.dark' } }}>
                                X
                            </Box>
                        </Tooltip>
                        )
                    }
                />
            ) : (
                <Chip icon={<PersonOffIcon />} label="Libre" size="small" variant="outlined" color="default" sx={{ borderStyle: 'dashed' }} />
            )}
        </TableCell>
      )}

      {/* MONTO + COPY ACTION */}
      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
        <Tooltip title="Click para copiar monto" arrow placement="top">
            <Box
                component="span"
                onClick={handleCopyAmount}
                sx={{ 
                    cursor: 'pointer', 
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: isManual ? 'success.main' : 'inherit',
                    '&:hover': { 
                        bgcolor: 'action.hover',
                        color: 'primary.main' 
                    }
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