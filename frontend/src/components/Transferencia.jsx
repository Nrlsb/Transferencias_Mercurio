import React from 'react';
import './Transferencia.css';

const Transferencia = ({ transferencia }) => {
  const {
    id,
    date_approved,
    status,
    transaction_details,
    transaction_amount,
    fee_details,
    payment_method_id,
    description,
    payer,
  } = transferencia;

  // Formatear la fecha para que sea más legible
  const formattedDate = new Date(date_approved).toLocaleString();

  return (
    <div className="transferencia-card">
      <h2>ID Transacción: {id}</h2>
      <div className="info-grid">
        <div className="info-item">
          <span>📅 Fecha Aprobado:</span> {formattedDate}
        </div>
        <div className="info-item">
          <span>📊 Estado:</span> {status} (accredited)
        </div>
        <div className="info-item">
          <span>💰 Monto Bruto:</span> ${transaction_amount} ARS
        </div>
        <div className="info-item">
          <span>💸 Monto Neto:</span> ${transaction_details?.net_received_amount || 'N/A'}
        </div>
        <div className="info-item">
          <span>📉 Comisión MP:</span> ${fee_details?.find(fee => fee.type === 'mercadopago_fee')?.amount || 0}
        </div>
        <div className="info-item">
          <span>💳 Método de Pago:</span> {payment_method_id} (bank_transfer)
        </div>
        <div className="info-item">
          <span>📝 Descripción:</span> {description}
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
