const supabase = require('../config/supabase');

class TransferenciaService {
  
  /**
   * Obtiene transferencias.
   * - Si history=true: Devuelve TODO lo reclamado por el usuario.
   * - Si history=false: Exige filtros.
   */
  async getTransferencias(userId, filters = {}) {
    const { monto, dni, fecha, history } = filters || {};
    const isHistoryMode = history === 'true';

    // 1. Validación de reglas de negocio para Búsqueda Pública
    if (!isHistoryMode) {
        // Validar longitud mínima de DNI si está presente
        if (dni && dni.length < 8) {
            throw new Error('El DNI debe tener al menos 8 números para realizar la búsqueda.');
        }

        // Creamos un array seguro con los valores de los filtros
        const activeFilters = [monto, dni, fecha].filter(val => val !== undefined && val !== null && val !== '');
        
        // Mantenemos la regla: Mínimo 2 filtros para evitar scraping
        if (activeFilters.length < 2) return []; 
    }

    let query = supabase
      .from('transferencias')
      .select('*');

    // 2. Aplicación de Scopes
    if (isHistoryMode) {
        query = query.eq('claimed_by', userId);
    } else {
        query = query.or(`claimed_by.is.null,claimed_by.eq.${userId}`);
    }

    // 3. Filtros DB Nativos
    if (monto) {
        query = query.eq('monto', parseFloat(monto));
    }

    if (dni) {
        // Usamos ->> para extraer como texto y poder usar ilike
        query = query.filter('datos_completos->payer->identification->>number', 'ilike', `%${dni}%`);
    }

    if (fecha) {
        const fechaTarget = new Date(fecha);
        if (!isNaN(fechaTarget.getTime())) {
            const diezMinutosEnMs = 10 * 60 * 1000;
            const minDate = new Date(fechaTarget.getTime() - diezMinutosEnMs).toISOString();
            const maxDate = new Date(fechaTarget.getTime() + diezMinutosEnMs).toISOString();
            
            query = query.gte('fecha_aprobado', minDate);
            query = query.lte('fecha_aprobado', maxDate);
        }
    }

    // Ordenamiento
    query = query.order('fecha_aprobado', { ascending: false });

    // Ejecución segura
    const { data, error } = await query;

    if (error) {
        console.error("DB Error:", error.message);
        throw new Error('Error al consultar la base de datos');
    }

    // Retornamos array vacío si data es null/undefined
    return data || [];
  }

  /**
   * Reclama una transferencia de forma ATÓMICA.
   */
  async claimTransferencia(idPago, userId) {
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: userId })
      .eq('id_pago', idPago)
      .is('claimed_by', null)
      .select();

    if (error) throw new Error(error.message);

    // Validación segura de data
    if (!data || data.length === 0) {
        const { data: checkOwner } = await supabase
            .from('transferencias')
            .select('claimed_by')
            .eq('id_pago', idPago)
            .single();

        if (checkOwner && checkOwner.claimed_by === userId) {
            return { message: 'Transferencia ya pertenece al usuario.' };
        }

        throw new Error('Esta transferencia ya ha sido reclamada por otro usuario.');
    }

    return data[0];
  }

  /**
   * Guarda desde Webhook
   */
  async createTransferenciaFromWebhook(paymentDetails) {
    const { data: existing } = await supabase
        .from('transferencias')
        .select('id_pago')
        .eq('id_pago', paymentDetails.id)
        .single();
    
    if (existing) return true;

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
          claimed_by: null
        }
      ]);

    if (error) throw error;
    return true;
  }
}

module.exports = new TransferenciaService();