const supabase = require('../config/supabase');

class TransferenciaService {
  
  // --- MÉTODOS EXISTENTES (Mercado Pago) ---
  
  async getTransferencias(userId, isAdmin, filters = {}) {
    const { monto, dni, fecha, history, emailReclamador, fechaDesde, fechaHasta, soloReclamados, confirmed } = filters || {};
    const isHistoryMode = history === 'true';

    // Validación Usuarios
    if (!isAdmin && !isHistoryMode) {
        if (dni && dni.length < 8) throw new Error('El DNI debe tener al menos 8 números.');
        const activeFilters = [monto, dni, fecha, fechaDesde, fechaHasta].filter(val => val !== undefined && val !== null && val !== '');
        if (activeFilters.length < 2) return []; 
    }

    let joinType = emailReclamador ? '!inner' : '';
    let selectQuery = isAdmin 
        ? `*, usuarios!fk_claimed_by${joinType}(email)` 
        : '*';

    let query = supabase.from('transferencias').select(selectQuery);

    if (isAdmin) {
        if (emailReclamador) query = query.ilike('usuarios.email', `%${emailReclamador}%`);
        if (soloReclamados === 'true') query = query.not('claimed_by', 'is', null);

        if (confirmed === 'true') {
            query = query.eq('confirmed', true);
        } else if (confirmed === 'false') {
            query = query.or('confirmed.eq.false,confirmed.is.null');
        }
    } else if (isHistoryMode) {
        query = query.eq('claimed_by', userId);
    } else {
        query = query.is('claimed_by', null);
    }

    // Filtros Comunes
    if (monto) query = query.eq('monto', parseFloat(monto));
    if (dni) query = query.filter('datos_completos->payer->identification->>number', 'ilike', `%${dni}%`);
    
    // Fechas
    if (fechaDesde || fechaHasta) {
        if (fechaDesde) {
            const fromDate = new Date(fechaDesde);
            fromDate.setHours(0, 0, 0, 0);
            query = query.gte('fecha_aprobado', fromDate.toISOString());
        }
        if (fechaHasta) {
            const toDate = new Date(fechaHasta);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('fecha_aprobado', toDate.toISOString());
        }
    } else if (fecha) {
        const fechaTarget = new Date(fecha);
        if (!isNaN(fechaTarget.getTime())) {
            const minDate = new Date(fechaTarget.getTime() - 600000).toISOString();
            const maxDate = new Date(fechaTarget.getTime() + 600000).toISOString();
            query = query.gte('fecha_aprobado', minDate).lte('fecha_aprobado', maxDate);
        }
    }

    query = query.order('fecha_aprobado', { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error('Error DB: ' + error.message);
    return data || [];
  }

  async claimTransferencia(idPago, userId) {
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: userId })
      .eq('id_pago', idPago)
      .is('claimed_by', null)
      .select();

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Transferencia no disponible o ya reclamada.');
    return data[0];
  }

  async unclaimTransferencia(idPago) {
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: null })
      .eq('id_pago', idPago)
      .select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  async confirmBatch(ids) {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase
      .from('transferencias')
      .update({ confirmed: true })
      .in('id_pago', ids)
      .select();
    if (error) throw new Error(error.message);
    return data;
  }

  async createTransferenciaFromWebhook(paymentDetails) {
    const { data: existing } = await supabase
        .from('transferencias')
        .select('id_pago')
        .eq('id_pago', paymentDetails.id)
        .single();
    
    const datosTransferencia = {
        id_pago: paymentDetails.id,
        fecha_aprobado: paymentDetails.date_approved,
        estado: paymentDetails.status,
        monto: paymentDetails.transaction_amount,
        descripcion: paymentDetails.description,
        email_pagador: paymentDetails.payer ? paymentDetails.payer.email : null,
        datos_completos: paymentDetails,
    };

    if (existing) {
        const { error } = await supabase
            .from('transferencias')
            .update({
                estado: datosTransferencia.estado,
                datos_completos: datosTransferencia.datos_completos,
                email_pagador: datosTransferencia.email_pagador
            })
            .eq('id_pago', paymentDetails.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('transferencias')
            .insert([{ ...datosTransferencia, claimed_by: null, confirmed: false }]);
        if (error) throw error;
    }
    return true;
  }

  // --- MÉTODOS MANUALES ---

  async getAllUsers() {
    const { data, error } = await supabase.from('usuarios').select('id, email').order('email');
    if (error) throw new Error(error.message);
    return data;
  }

  async getManualTransfers() {
    // Admin: Ve todas
    const { data, error } = await supabase
      .from('transferencias_manuales')
      .select('*, usuarios(email)')
      .order('fecha_carga', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getManualTransfersByUserId(userId) {
    // User: Ve solo las suyas
    const { data, error } = await supabase
      .from('transferencias_manuales')
      .select('*')
      .eq('user_id', userId)
      .order('fecha_carga', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async createManualTransfer({ id_transaccion, banco, monto, userId }) {
    const { data, error } = await supabase
        .from('transferencias_manuales')
        .insert([{
            id_transaccion,
            banco,
            monto: parseFloat(monto),
            user_id: userId
        }])
        .select();

    if (error) throw error;
    return data[0];
  }
}

module.exports = new TransferenciaService();