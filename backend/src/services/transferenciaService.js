const supabase = require('../config/supabase');

class TransferenciaService {
  
  /**
   * Obtiene transferencias filtradas por permisos y criterios de búsqueda.
   * Regla: Muestra (No reclamadas) OR (Reclamadas por mí).
   */
  async getTransferencias(userId, filters = {}) {
    const { monto, dni, fecha } = filters;
    
    // 1. Construcción de la consulta base con política de seguridad
    // Sintaxis de PostgREST para OR: "col1.eq.val1,col2.is.null"
    let query = supabase
      .from('transferencias')
      .select('*')
      .or(`claimed_by.is.null,claimed_by.eq.${userId}`)
      .order('fecha_aprobado', { ascending: false });

    // 2. Aplicación de filtros directos en base de datos cuando sea posible
    if (monto) {
      query = query.eq('monto', parseFloat(monto));
    }

    // Nota: El filtrado por JSON profundo (DNI) y fechas complejas lo mantenemos 
    // en memoria por ahora para preservar tu lógica original, 
    // pero ya habiendo filtrado por propiedad (claimed_by).
    
    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // 3. Filtrado en memoria para campos JSON complejos o lógica de fecha específica
    const filterCount = [monto, dni, fecha].filter(Boolean).length;
    if (filterCount < 2) return []; // Manteniendo tu regla de negocio original

    return data.filter(p => {
      let matches = 0;
      
      // Monto (ya filtrado en DB, pero sumamos el match)
      if (monto) matches++; 

      // DNI (JSON B)
      if (dni) {
        const identification = p.datos_completos?.payer?.identification;
        if (identification?.number?.includes(dni)) matches++;
      }

      // Fecha (Lógica de +/- 10 minutos)
      if (fecha) {
        try {
          const fechaFiltro = new Date(fecha);
          if (!isNaN(fechaFiltro.getTime())) {
            const diezMinutosEnMs = 10 * 60 * 1000;
            const limiteInferior = new Date(fechaFiltro.getTime() - diezMinutosEnMs);
            const limiteSuperior = new Date(fechaFiltro.getTime() + diezMinutosEnMs);
            const fechaPago = new Date(p.fecha_aprobado);
            
            if (fechaPago >= limiteInferior && fechaPago <= limiteSuperior) matches++;
          }
        } catch (e) { console.error(e); }
      }

      return matches >= 2;
    });
  }

  /**
   * Reclama una transferencia para un usuario específico.
   */
  async claimTransferencia(idPago, userId) {
    // Primero verificamos que no esté reclamada por otro
    const { data: existing, error: fetchError } = await supabase
      .from('transferencias')
      .select('claimed_by')
      .eq('id_pago', idPago)
      .single();

    if (fetchError) throw new Error(fetchError.message);
    
    if (existing.claimed_by && existing.claimed_by !== userId) {
      throw new Error('Esta transferencia ya ha sido reclamada por otro usuario.');
    }

    if (existing.claimed_by === userId) {
      return { message: 'Transferencia ya pertenece al usuario.' }; // Idempotencia
    }

    // Procedemos a reclamar
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: userId })
      .eq('id_pago', idPago)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  /**
   * Guarda una nueva transferencia desde el Webhook
   */
  async createTransferenciaFromWebhook(paymentDetails) {
    const { error } = await supabase
      .from('transferencias')
      .insert([
        {
          id_pago: paymentDetails.id,
          fecha_aprobado: paymentDetails.date_approved,
          estado: paymentDetails.status,
          monto: paymentDetails.transaction_amount,
          descripcion: paymentDetails.description,
          email_pagador: paymentDetails.payer ? paymentDetails.payer.email : null,
          datos_completos: paymentDetails,
          claimed_by: null // Empieza pública
        }
      ]);

    if (error) throw error;
    return true;
  }
}

module.exports = new TransferenciaService();