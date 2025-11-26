import React from 'react';
import './Transferencia.css';

const Transferencia = ({ transferencia }) => {
  // Tomamos id_pago para mostrarlo, y datos_completos para el resto
  const { id_pago, datos_completos } = transferencia;

  // El resto de los datos están anidados dentro de datos_completos
  const {
    date_approved,
    status,
    transaction_details,
    transaction_amount,
    fee_details,
    payment_method_id,
    description,
    payer,
  } = datos_completos || {}; // Usamos un objeto vacío como fallback

  // Formatear la fecha para que sea más legible, mostrando el tiempo en UTC
  const formattedDate = date_approved ? new Date(date_approved).toUTCString() : 'N/A';

  return (
    <div className="transferencia-card">
      {/* Usamos id_pago como el ID de la transacción visible */}
      <h2>ID Transacción: {id_pago}</h2>
      <div className="info-grid">
        <div className="info-item">
          <span>📅 Fecha Aprobado:</span> {formattedDate}
        </div>
        <div className="info-item">
          <span>📊 Estado:</span> {status || 'N/A'} (accredited)
        </div>
        <div className="info-item">
          <span>💰 Monto Bruto:</span> ${transaction_amount || 'N/A'} ARS
        </div>
        <div className="info-item">
          <span>💸 Monto Neto:</span> ${transaction_details?.net_received_amount || 'N/A'}
        </div>
        <div className="info-item">
          <span>📉 Comisión MP:</span> ${fee_details?.find(fee => fee.type === 'mercadopago_fee')?.amount || 0}
        </div>
        <div className="info-item">
          <span>💳 Método de Pago:</span> {payment_method_id || 'N/A'} (bank_transfer)
        </div>
        <div className="info-item">
          <span>📝 Descripción:</span> {description || 'N/A'}
        </div>
      </div>
      <div className="payer-info">
        <h3>👤 INFORMACIÓN DEL PAGADOR:</h3>
        <div className="info-item">
          <span>📧 Email:</span> {payer?.email || 'N/A'}
        </div>
        <div className="info-item">
          <span>🆔 ID Usuario MP:</span> {payer?.id || 'N/A'}
        </div>
        <div className="info-item">
          <span>📄 Documento:</span> {payer?.identification?.type || ''} {payer?.identification?.number || 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default Transferencia;
