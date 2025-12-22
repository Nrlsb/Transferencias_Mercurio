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
  TablePagination,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditIcon from '@mui/icons-material/Edit';
import Transferencia from './Transferencia'; // Componente de fila para Desktop

// Componente Skeleton para la tabla (Desktop)
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

// Componente Skeleton para Tarjetas (Mobile)
const CardSkeleton = ({ numCards = 3 }) => (
  <Stack spacing={2}>
    {Array.from({ length: numCards }).map((_, index) => (
      <Card key={index} sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width="30%" />
          </Box>
          <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
          <Skeleton variant="text" width="40%" />
        </CardContent>
      </Card>
    ))}
  </Stack>
);

// Componente de Tarjeta Individual para Mobile
const TransferCard = ({ t, isAdmin, tabValue, session, onClaimSuccess, onFeedback }) => {
  const isManual = !!t.banco;
  const currentId = isManual ? t.id_transaccion : t.id_pago;

  // Parsing de datos (lógica similar a Transferencia.jsx)
  const datosParsed = !isManual && typeof t.datos_completos === 'string'
    ? JSON.parse(t.datos_completos)
    : (t.datos_completos || {});

  const rawDate = isManual ? t.fecha_carga : datosParsed.date_approved;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString()
    : 'N/A';

  const monto = isManual ? t.monto : datosParsed.transaction_amount;
  const status = isManual ? 'approved' : datosParsed.status;

  let bancoNombre = 'Mercado Pago';
  if (isManual) bancoNombre = t.banco;

  let estadoLabel = 'Pendiente';
  let estadoColor = 'warning'; // default

  if (status === 'approved' || isManual) {
    estadoLabel = 'Aprobado';
    estadoColor = 'success';
  }

  // Lógica de copia simple para mobile
  const handleCopyId = () => {
    navigator.clipboard.writeText(currentId.toString());
    if (onFeedback) onFeedback(`ID ${currentId} copiado`, 'info');
  };

  return (
    <Card sx={{ mb: 2, position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header: Icono/Banco + Monto */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: isManual ? 'primary.light' : '#009EE3', // Azul MP
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AccountBalanceIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                {bancoNombre}
              </Typography>
              <Box
                onClick={handleCopyId}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mt: 0.5 }}
              >
                <Typography variant="caption" color="text.secondary">
                  #{currentId}
                </Typography>
                <ContentCopyIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
              </Box>
            </Box>
          </Box>
          <Typography variant="h6" color="primary.main" fontWeight="bold">
            ${parseFloat(monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

        {/* Body: Detalles */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" display="block" color="text.secondary">
              Fecha
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {formattedDate}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Chip
              label={estadoLabel}
              size="small"
              color={estadoColor}
              sx={{ fontWeight: 600, borderRadius: 1 }}
            />
          </Box>
        </Box>

        {/* Info Extra para Admin */}
        {isAdmin && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
            <Typography variant="caption" color="text.secondary">
              Usuario: {t.usuarios?.email || 'Desconocido'}
            </Typography>
          </Box>
        )}

      </CardContent>
    </Card>
  );
};

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
  handleEdit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px

  const renderEmptyState = () => (
    isMobile ? (
      <Box sx={{ textAlign: 'center', py: 4, px: 2, bgcolor: '#f9f9f9', borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No se encontraron resultados.
        </Typography>
      </Box>
    ) : (
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
    )
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
        {isMobile ? <CardSkeleton /> : <TableSkeleton numCols={isAdmin ? 8 : 5} />}
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

  // --- VISTA MOBILE (CARDS) ---
  if (isMobile) {
    if (transferencias.length === 0) return renderEmptyState();

    return (
      <Box sx={{ pb: 10 }}> {/* Padding bottom para scroll */}
        {transferencias.map((t, idx) => (
          <TransferCard
            key={t.id_pago || t.id_transaccion || idx}
            t={t}
            isAdmin={isAdmin}
            tabValue={tabValue}
            session={session}
            onClaimSuccess={handleTransferenciaClaimed}
            onFeedback={handleFeedback}
          />
        ))}
        {/* Paginación simple para mobile */}
        <TablePagination
          rowsPerPageOptions={[20, 50]}
          component="div"
          count={totalTransfers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas:"
        />
      </Box>
    );
  }

  // --- VISTA DESKTOP (TABLE) ---
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
                  <TableCell>Fecha Real</TableCell>
                  <TableCell>Cliente Asignado</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="center">Acciones</TableCell>
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
                  {isAdmin && <TableCell>Fecha Real</TableCell>}
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
                    <TableCell>
                      {t.fecha_real
                        ? new Date(t.fecha_real).toLocaleDateString() + ' ' + new Date(t.fecha_real).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </TableCell>
                    <TableCell>{t.usuarios?.email || 'Desconocido'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>${parseFloat(t.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleEdit(t)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
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
