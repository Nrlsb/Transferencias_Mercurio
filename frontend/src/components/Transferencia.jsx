import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip, 
  Divider, 
  Box,
  CardHeader,
  Avatar
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const Transferencia = ({ transferencia }) => {
  const { id_pago, datos_completos } = transferencia;

  const {
    date_approved,
    status,
    transaction_details,
    transaction_amount,
    fee_details,
    payment_method_id,
    description,
    payer,
  } = datos_completos || {};

  const formattedDate = date_approved ? new Date(date_approved).toLocaleString() : 'N/A';

  // Lógica de color para el estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ width: '100%', borderRadius: 2, transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <PaymentIcon />
          </Avatar>
        }
        title={
            <Typography variant="h6" component="div">
               ID Transacción: {id_pago}
            </Typography>
        }
        subheader={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                 <CalendarTodayIcon fontSize="small" color="action" />
                 <Typography variant="body2" color="text.secondary">{formattedDate}</Typography>
            </Box>
        }
        action={
            <Chip 
                label={status || 'Unknown'} 
                color={getStatusColor(status)} 
                variant="outlined" 
                sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}
            />
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={2}>
            {/* Columna Detalles Financieros */}
            <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon fontSize="small"/> Detalle del Pago
                </Typography>
                <Box sx={{ pl: 2 }}>
                    <Typography variant="body2"><strong>Monto Bruto:</strong> ${transaction_amount || '0'}</Typography>
                    <Typography variant="body2"><strong>Monto Neto:</strong> ${transaction_details?.net_received_amount || '0'}</Typography>
                    <Typography variant="body2" color="error.main">
                        <strong>Comisión MP:</strong> -${fee_details?.find(fee => fee.type === 'mercadopago_fee')?.amount || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Método:</strong> {payment_method_id}
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 1 }}>
                        "{description || 'Sin descripción'}"
                    </Typography>
                </Box>
            </Grid>

            {/* Columna Detalles del Pagador */}
            <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small"/> Información del Pagador
                </Typography>
                <Box sx={{ pl: 2 }}>
                    <Typography variant="body2"><strong>Email:</strong> {payer?.email || 'N/A'}</Typography>
                    <Typography variant="body2"><strong>ID Usuario:</strong> {payer?.id || 'N/A'}</Typography>
                    <Typography variant="body2">
                        <strong>Documento:</strong> {payer?.identification?.type} {payer?.identification?.number}
                    </Typography>
                </Box>
            </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default Transferencia;