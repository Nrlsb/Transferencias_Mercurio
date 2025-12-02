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
        <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: '#e8f5e9', borderRadius: 20, border: '1px solid #a5d6a7' }}>
          <Typography variant="subtitle1" component="span" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
            Total Seleccionado:
          </Typography>
          <Typography variant="h6" component="span" sx={{ ml: 1, color: '#1b5e20', fontWeight: 800 }}>
            ${totalSelectedAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>
      )}

      {/* DISPLAY TOTAL VISTA */}
      <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: '#e3f2fd', borderRadius: 20, border: '1px solid #90caf9' }}>
        <Typography variant="subtitle1" component="span" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
          Total Vista:
        </Typography>
        <Typography variant="h6" component="span" sx={{ ml: 1, color: '#0d47a1', fontWeight: 800 }}>
          ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </Typography>
      </Paper>
    </Box>
  );
};

export default StatsCards;
