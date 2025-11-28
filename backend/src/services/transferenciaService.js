const supabase = require('../config/supabase');

class TransferenciaService {
  
  // --- MÉTODOS UNIFICADOS (MP + MANUAL) ---
  
  /**
   * Obtiene transferencias unificadas de ambas fuentes.
   * Tab 0 (Pendientes): Trae MP no confirmadas y Manuales no confirmadas.
   * Tab 1 (Historial): Trae MP confirmadas y Manuales confirmadas.
   */
  async getTransferencias(userId, isAdmin, filters = {}) {
    const { monto, dni, fecha, history, emailReclamador, fechaDesde, fechaHasta, soloReclamados, confirmed } = filters || {};
    const isHistoryMode = history === 'true';
    const isConfirmedRequest = confirmed === 'true';

    // 1. Preparar Query para Mercado Pago (MP)
    let joinTypeMP = emailReclamador ? '!inner' : '';
    let selectQueryMP = isAdmin ? `*, usuarios!fk_claimed_by${joinTypeMP}(email)` : '*';
    let queryMP = supabase.from('transferencias').select(selectQueryMP);

    // 2. Preparar Query para Manuales (Otros Bancos)
    // Asumimos que la relación en manuales es directa con 'user_id' -> usuarios
    let joinTypeMan = emailReclamador ? '!inner' : '';
    let selectQueryMan = isAdmin ? `*, usuarios${joinTypeMan}(email)` : '*';
    let queryMan = supabase.from('transferencias_manuales').select(selectQueryMan);

    // --- APLICAR FILTROS COMUNES ---
    
    // Filtro de Rol/Historial
    if (isAdmin) {
        // MP Logic
        if (emailReclamador) queryMP = queryMP.ilike('usuarios.email', `%${emailReclamador}%`);
        if (soloReclamados === 'true') queryMP = queryMP.not('claimed_by', 'is', null);
        if (confirmed === 'true') queryMP = queryMP.eq('confirmed', true);
        else if (confirmed === 'false') queryMP = queryMP.or('confirmed.eq.false,confirmed.is.null');

        // Manual Logic
        if (emailReclamador) queryMan = queryMan.ilike('usuarios.email', `%${emailReclamador}%`);
        if (soloReclamados === 'true') queryMan = queryMan.not('fecha_reclamo', 'is', null);
        if (confirmed === 'true') queryMan = queryMan.eq('confirmed', true);
        else if (confirmed === 'false') queryMan = queryMan.or('confirmed.eq.false,confirmed.is.null');

    } else if (isHistoryMode) {
        // User History Logic
        queryMP = queryMP.eq('claimed_by', userId);
        queryMan = queryMan.eq('user_id', userId);
    } else {
        // User Search Logic (Solo MP disponibles)
        queryMP = queryMP.is('claimed_by', null);
        // Los usuarios normales NO buscan manuales, solo las ven en su historial
        // Así que anulamos la query manual para búsqueda normal de usuario
        queryMan = null; 
    }

    // Filtros de búsqueda específicos
    if (monto) {
        queryMP = queryMP.eq('monto', parseFloat(monto));
        if(queryMan) queryMan = queryMan.eq('monto', parseFloat(monto));
    }
    
    // Fechas
    if (fechaDesde || fechaHasta) {
        const fromIso = fechaDesde ? new Date(fechaDesde).toISOString() : null;
        let toIso = null;
        if (fechaHasta) {
            const d = new Date(fechaHasta);
            d.setHours(23, 59, 59, 999);
            toIso = d.toISOString();
        }

        if (fromIso) queryMP = queryMP.gte('fecha_aprobado', fromIso);
        if (toIso) queryMP = queryMP.lte('fecha_aprobado', toIso);

        if (queryMan) {
            if (fromIso) queryMan = queryMan.gte('fecha_carga', fromIso);
            if (toIso) queryMan = queryMan.lte('fecha_carga', toIso);
        }
    }

    // --- EJECUCIÓN PARALELA ---
    const promises = [queryMP];
    if (queryMan) promises.push(queryMan);

    const results = await Promise.all(promises);
    
    const dataMP = results[0].data || [];
    const errorMP = results[0].error;
    if (errorMP) throw new Error('MP Error: ' + errorMP.message);

    let dataManual = [];
    if (queryMan) {
        const resMan = results[1];
        if (resMan.error) throw new Error('Manual Error: ' + resMan.error.message);
        dataManual = resMan.data || [];
    }

    // --- MERGE Y ORDENAMIENTO ---
    // Combinamos ambos arrays
    const combined = [...dataMP, ...dataManual];

    // Ordenamos descendente por fecha (usando fecha_aprobado o fecha_carga según corresponda)
    combined.sort((a, b) => {
        const dateA = new Date(a.fecha_aprobado || a.fecha_carga);
        const dateB = new Date(b.fecha_aprobado || b.fecha_carga);
        return dateB - dateA;
    });

    return combined;
  }

  // --- CONFIRMACIÓN MASIVA UNIFICADA ---
  async confirmBatch(ids) {
    if (!ids || ids.length === 0) return [];
    
    // Intentamos confirmar en AMBAS tablas.
    // SQL ignorará silenciosamente si el ID no existe en la tabla respectiva.
    
    const p1 = supabase
        .from('transferencias')
        .update({ confirmed: true })
        .in('id_pago', ids)
        .select();

    const p2 = supabase
        .from('transferencias_manuales')
        .update({ confirmed: true })
        .in('id_transaccion', ids) // Asumiendo que usamos id_transaccion como ID
        .select();

    const [resMP, resMan] = await Promise.all([p1, p2]);

    if (resMP.error) throw new Error(resMP.error.message);
    if (resMan.error) throw new Error(resMan.error.message);

    // Retornamos combinados para feedback
    return [...(resMP.data || []), ...(resMan.data || [])];
  }

  // --- MÉTODOS INDIVIDUALES MP ---

  async claimTransferencia(idPago, userId) {
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: userId })
      .eq('id_pago', idPago)
      .is('claimed_by', null)
      .select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Ya reclamada.');
    return data[0];
  }

  async unclaimTransferencia(idPago) {
    const { data, error } = await supabase.from('transferencias').update({ claimed_by: null }).eq('id_pago', idPago).select();
    if (error) throw new Error(error.message);
    return data[0];
  }

  async createTransferenciaFromWebhook(paymentDetails) {
    const { data: existing } = await supabase.from('transferencias').select('id_pago').eq('id_pago', paymentDetails.id).single();
    const datos = {
        id_pago: paymentDetails.id,
        fecha_aprobado: paymentDetails.date_approved,
        estado: paymentDetails.status,
        monto: paymentDetails.transaction_amount,
        descripcion: paymentDetails.description,
        email_pagador: paymentDetails.payer ? paymentDetails.payer.email : null,
        datos_completos: paymentDetails,
    };
    if (existing) {
        await supabase.from('transferencias').update({ estado: datos.estado, datos_completos: datos.datos_completos, email_pagador: datos.email_pagador }).eq('id_pago', paymentDetails.id);
    } else {
        await supabase.from('transferencias').insert([{ ...datos, claimed_by: null, confirmed: false }]);
    }
    return true;
  }

  // --- MÉTODOS MANUALES ---
  
  async getAllUsers() {
    const { data, error } = await supabase.from('usuarios').select('id, email').order('email');
    if (error) throw new Error(error.message);
    return data;
  }

  // MODIFICADO: Ahora filtra las confirmadas para que desaparezcan de Tab 2
  async getManualTransfers() {
    let query = supabase
        .from('transferencias_manuales')
        .select('*, usuarios(email)')
        // SOLO MOSTRAR LAS NO CONFIRMADAS EN LA PESTAÑA "OTROS BANCOS"
        // Las confirmadas se verán ahora solo en "Historial" (Tab 1) vía getTransferencias
        .or('confirmed.eq.false,confirmed.is.null') 
        .order('fecha_carga', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async getManualTransfersByUserId(userId) {
    // Este método lo usa el usuario para "Mi Historial", puede traer todo
    const { data, error } = await supabase.from('transferencias_manuales').select('*').eq('user_id', userId).order('fecha_carga', { ascending: false });
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
            user_id: userId, 
            fecha_reclamo: null,
            confirmed: false // Iniciamos como no confirmada
        }])
        .select();
    if (error) throw error;
    return data[0];
  }

  async claimManualTransfer(idTransaccion, userId) {
      const { data, error } = await supabase
        .from('transferencias_manuales')
        .update({ fecha_reclamo: new Date().toISOString() })
        .eq('id_transaccion', idTransaccion)
        .eq('user_id', userId)
        .is('fecha_reclamo', null)
        .select();
      
      if (error) throw error;
      return data;
  }
}

module.exports = new TransferenciaService();