import React, { useState } from 'react';
import { 
  TableRow,
  TableCell,
  Typography,
  Chip,
  Button,
  Box,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { supabase } from '../supabaseClient';

const Transferencia = ({ transferencia, onClaimSuccess }) => {
  const { id_pago, claimed_by, datos_completos } = transferencia;
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const [isHovered, setIsHovered] = useState(false);

  // Verificamos si la transferencia ya es del usuario actual (visual only)
  // Nota: Idealmente pasaríamos el currentUserId como prop para comparar
  const isMine = !!claimed_by; 

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
    if (isMine) {
       // Si ya es mía, solo copiamos sin llamar a la API
       navigator.clipboard.writeText(id_pago.toString());
       setFeedback({ open: true, message: 'ID copiado al portapapeles', severity: 'info' });
       return;
    }

    try {
      setLoadingClaim(true);
      
      // 1. Copiar al portapapeles
      await navigator.clipboard.writeText(id_pago.toString());

      // 2. Obtener sesión para el token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      // 3. Llamar al backend para reclamar
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/transferencias/${id_pago}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al reclamar");
      }

      setFeedback({ open: true, message: '¡Transferencia reclamada y copiada!', severity: 'success' });
      
      // 4. Notificar al padre para actualizar la UI (opcional, si queremos refrescar lista)
      if (onClaimSuccess) onClaimSuccess();

    } catch (error) {
      setFeedback({ open: true, message: error.message, severity: 'error' });
    } finally {
      setLoadingClaim(false);
    }
  };

  const handleCloseFeedback = () => setFeedback({ ...feedback, open: false });

  return (
    <>
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
          <Tooltip title={isMine ? "Copiado y en tu historial" : "Click para Copiar y Reclamar"} arrow>
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
                 isHovered && <ContentCopyIcon fontSize="small" color="action" />
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

      <Snackbar open={feedback.open} autoHideDuration={3000} onClose={handleCloseFeedback}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Transferencia;