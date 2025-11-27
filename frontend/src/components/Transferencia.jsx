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

const Transferencia = ({ transferencia, session, onClaimSuccess, onFeedback, isAdmin }) => {
  const { id_pago, claimed_by, datos_completos, usuarios, email_pagador, confirmed } = transferencia;
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Estado local para feedback instantáneo del checkbox
  const [isConfirmedLocal, setIsConfirmedLocal] = useState(confirmed || false);

  const isMine = !!claimed_by && claimed_by === session?.user?.id; 

  const datosParsed = typeof datos_completos === 'string' 
    ? JSON.parse(datos_completos) 
    : (datos_completos || {});

  const {
    date_approved,
    status,
    transaction_amount,
    payer,
    description,
    point_of_interaction
  } = datosParsed;

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

      if (!response.ok) {
        const data = await response.json();
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
    if (transaction_amount) {
        const montoConComa = transaction_amount.toString().replace('.', ',');
        navigator.clipboard.writeText(montoConComa);
        if (onFeedback) onFeedback(`Monto copiado: $${montoConComa}`, 'info');
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

  // NUEVO: Manejador del checkbox de confirmación
  const handleToggleConfirm = async (e) => {
    const newValue = e.target.checked;
    setIsConfirmedLocal(newValue); // Optimistic UI update

    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${id_pago}/confirm`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ confirmed: newValue })
        });

        if (!response.ok) throw new Error("Error al actualizar confirmación");
        
        // No necesitamos feedback visual intrusivo para esto, el checkbox ya cambió
    } catch (error) {
        setIsConfirmedLocal(!newValue); // Revertir si falla
        if (onFeedback) onFeedback("Error al confirmar transferencia", 'error');
    }
  };

  return (
    <TableRow 
      hover 
      sx={{ 
        bgcolor: isMine ? 'action.hover' : 'inherit',
        transition: 'background-color 0.3s'
      }}
    >
      <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
        <Tooltip title={claimed_by || isAdmin ? "Solo copiar ID" : "Click para Copiar ID y Reclamar"} arrow>
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
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 500 }}>
            {description || 'SIN DESCRIPCIÓN'}
        </Typography>
      </TableCell>

      <TableCell>{formattedDate}</TableCell>

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
        <>
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
            
            {/* NUEVA CELDA CHECKBOX CONFIRMACIÓN */}
            <TableCell align="center">
                <Checkbox
                    checked={isConfirmedLocal}
                    onChange={handleToggleConfirm}
                    color="success"
                    inputProps={{ 'aria-label': 'Confirmar transferencia' }}
                />
            </TableCell>
        </>
      )}

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
                    '&:hover': { 
                        bgcolor: 'action.hover',
                        color: 'primary.main' 
                    }
                }}
            >
                ${transaction_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Box>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default Transferencia;