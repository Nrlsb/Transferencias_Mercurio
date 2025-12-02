import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const StatsCards = ({ isAdmin, selectedIds, totalSelectedAmount, totalAmount }) => {
  if (!isAdmin) {
    return null; // Estas tarjetas son solo para administradores por ahora
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* DISPLAY TOTAL SELECCIONADO - SOLO SI HAY SELECCIONADOS */}
      {selectedIds.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, px: 3, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <Typography variant="subtitle2" component="div" sx={{ color: 'success.main', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px' }}>
            Seleccionado
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: 'text.primary', fontWeight: 800 }}>
            ${totalSelectedAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>
      )}

      {/* DISPLAY TOTAL VISTA */}
      <Paper elevation={0} sx={{ p: 2, px: 3, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Typography variant="subtitle2" component="div" sx={{ color: 'secondary.main', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px' }}>
          Total Vista
        </Typography>
        <Typography variant="h5" component="div" sx={{ color: 'text.primary', fontWeight: 800 }}>
          ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </Typography>
      </Paper>
    </Box>
  );
};

export default StatsCards;
