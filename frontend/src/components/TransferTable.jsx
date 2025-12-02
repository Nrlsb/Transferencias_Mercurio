import React from 'react';
import {
  Box,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  Skeleton,
  TablePagination
} from '@mui/material';
import Transferencia from './Transferencia'; // La tabla usa este componente para renderizar filas

// El componente Skeleton para la tabla ahora vive aquí.
const TableSkeleton = ({ numRows = 5, numCols = 7 }) => (
  <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>
    <TableContainer>
      <Table stickyHeader sx={{ minWidth: 700 }}>
        <TableHead>
          <TableRow>
            {Array.from({ length: numCols }).map((_, index) => (
              <TableCell key={index} sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                <Skeleton variant="text" width="80%" />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: numRows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: numCols }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const TransferTable = ({
  loading,
  error,
  isAdmin,
  tabValue,
  filtersApplied,
  transferencias,
  totalTransfers,
  page,
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  selectedIds,
  handleSelectAll,
  session,
  handleTransferenciaClaimed,
  handleFeedback,
  handleToggleSelect,
}) => {

  const renderEmptyState = () => (
    <TableRow>
      <TableCell colSpan={isAdmin ? 8 : 6} align="center" sx={{ py: 3 }}>
        <Typography variant="body1" color="text.secondary">
          {isAdmin
            ? (tabValue === 2 ? "No hay transferencias de otros bancos cargadas." : "No se encontraron transferencias.")
            : (tabValue === 0
              ? "No se encontraron transferencias con esos filtros."
              : (tabValue === 2 ? "No tienes transferencias de otros bancos pendientes de reclamo." : "Aún no tienes transferencias en tu historial."))}
        </Typography>
      </TableCell>
    </TableRow>
  );

  const renderInitialUserState = () => (
    <Box sx={{ textAlign: 'center', mt: 4, p: 4, bgcolor: '#f9f9f9', borderRadius: 2 }}>
      <Typography color="text.secondary">
        Utiliza los filtros de arriba para encontrar nuevas transferencias.
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ my: 4 }}>
        <TableSkeleton numCols={isAdmin ? 8 : 5} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  // Condición para mostrar la tabla (o el estado vacío si corresponde)
  const showTable = isAdmin || (tabValue === 0 && filtersApplied) || tabValue === 1 || tabValue === 2;

  if (!showTable) {
    return renderInitialUserState();
  }

  return (
    <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <TableContainer>
        <Table stickyHeader sx={{ minWidth: 700 }} aria-label="tabla de transferencias">
          <TableHead>
            <TableRow>
              {isAdmin && tabValue === 2 ? (
                // Cabeceras para Admin en la tabla de Otros Bancos
                <>
                  <TableCell>ID Transacción</TableCell>
                  <TableCell>Banco</TableCell>
                  <TableCell>Fecha Carga</TableCell>
                  <TableCell>Cliente Asignado</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </>
              ) : (
                // Cabeceras para todas las demás vistas
                <>
                  {isAdmin && tabValue === 0 && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedIds.length > 0 && selectedIds.length < transferencias.length}
                        checked={transferencias.length > 0 && selectedIds.length === transferencias.length}
                        onChange={handleSelectAll}
                        color="primary"
                      />
                    </TableCell>
                  )}
                  <TableCell>ID / Ref</TableCell>
                  <TableCell>Descripción / Banco</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  {!isAdmin && tabValue === 1 && (
                    <TableCell>Fecha Reclamo</TableCell>
                  )}
                  {isAdmin && (
                    <TableCell sx={{ color: 'info.main' }}>
                      Reclamado Por
                    </TableCell>
                  )}
                  <TableCell align="right">Monto (ARS)</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {transferencias.length > 0 ? transferencias.map((t, idx) => {
              const isManual = !!t.banco;
              const currentId = isManual ? t.id_transaccion : t.id_pago;

              if (isAdmin && tabValue === 2) {
                // Renderizado especial para la tabla manual del admin
                return (
                  <TableRow key={currentId || idx} hover>
                    <TableCell>{t.id_transaccion}</TableCell>
                    <TableCell><Chip label={t.banco} color="primary" variant="outlined" size="small" /></TableCell>
                    <TableCell>{new Date(t.fecha_carga).toLocaleDateString()} {new Date(t.fecha_carga).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{t.usuarios?.email || 'Desconocido'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>${parseFloat(t.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              }

              // Renderizado unificado usando el componente Transferencia
              return (
                <Transferencia
                  key={currentId || idx}
                  transferencia={t}
                  session={session}
                  onClaimSuccess={handleTransferenciaClaimed}
                  onFeedback={handleFeedback}
                  isAdmin={isAdmin}
                  isSelectable={isAdmin && tabValue === 0}
                  isSelected={selectedIds.includes(currentId)}
                  onToggleSelect={handleToggleSelect}
                  showClaimDate={!isAdmin && tabValue === 1}
                />
              );
            }) : renderEmptyState()}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[20, 50, 100]}
        component="div"
        count={totalTransfers}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default TransferTable;
