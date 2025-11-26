import React from 'react';
import { 
  TableRow,
  TableCell,
  Typography,
  Chip,
  Button,
  Box
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

const Transferencia = ({ transferencia }) => {
  const { id_pago, datos_completos } = transferencia;

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

  // Lógica de color para el estado (más sutil)
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // Traducción simple de estados
  const getStatusLabel = (status) => {
      switch (status) {
          case 'approved': return 'Aprobado';
          case 'pending': return 'Pendiente';
          case 'rejected': return 'Rechazado';
          default: return status;
      }
  };

  return (
    <TableRow hover>
      <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
        {id_pago}
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 500 }}>
            {description || 'SIN DESCRIPCIÓN'}
        </Typography>
      </TableCell>

      <TableCell>
        {formattedDate}
      </TableCell>

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