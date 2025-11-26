import React, { useState } from 'react';
import { 
  TableRow,
  TableCell,
  Typography,
  Chip,
  Button,
  Box,
  Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

// Recibimos "session" como prop desde el Dashboard
const Transferencia = ({ transferencia, session, onClaimSuccess, onFeedback }) => {
  const { id_pago, claimed_by, datos_completos } = transferencia;
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Verificamos si la transferencia ya es del usuario actual
  // session.user.id viene de nuestro Auth personalizado en App.jsx
  const isMine = !!claimed_by && claimed_by === session?.user?.id; 

  const {
    date_approved,
    status,
    transaction_amount,
    description,
    payer,
  } = datos_completos || {};

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
          default: return status;
      }
  };

  const handleCopyAndClaim = async () => {
    // Si ya está reclamada (por mí o por otro), solo copiamos
    if (claimed_by) {
       navigator.clipboard.writeText(id_pago.toString());
       if (onFeedback) onFeedback('ID copiado al portapapeles', 'info');
       return;
    }

    try {
      setLoadingClaim(true);
      
      // 1. Copiar al portapapeles
      await navigator.clipboard.writeText(id_pago.toString());

      // 2. Usar el token que recibimos por props
      if (!session?.access_token) throw new Error("No hay sesión activa");

      // 3. Llamar al backend para reclamar
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${id_pago}/claim`, {
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
      
      // 4. Notificar al padre para actualizar la UI
      if (onClaimSuccess) onClaimSuccess();

    } catch (error) {
      if (onFeedback) onFeedback(error.message, 'error');
    } finally {
      setLoadingClaim(false);
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
      <TableCell 
        component="th" 
        scope="row" 
        sx={{ fontWeight: 'medium' }}
      >
        <Tooltip title={claimed_by ? "Solo copiar (Ya reclamado)" : "Click para Copiar y Reclamar"} arrow>
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
                isHovered && !claimed_by && <ContentCopyIcon fontSize="small" color="action" />
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
            <Typography variant="body2">{payer?.email || 'N/A'}</Typography>
            <Typography variant="caption" color="text.secondary">
                DNI: {payer?.identification?.number || '-'}
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

      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
        ${transaction_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </TableCell>

      <TableCell align="center">
        <Button 
            variant="outlined" 
            size="small" 
            startIcon={<VisibilityIcon />}
            sx={{ borderRadius: 10, fontSize: '0.7rem' }}
        >
            Ver
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default Transferencia;