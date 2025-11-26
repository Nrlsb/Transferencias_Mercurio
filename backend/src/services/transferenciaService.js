const supabase = require('../config/supabase');

class TransferenciaService {
  
  /**
   * Obtiene transferencias.
   * - Si history=true: Devuelve TODO lo reclamado por el usuario (sin filtros obligatorios).
   * - Si history=false (Search): Exige filtros y busca en (No reclamadas OR Reclamadas por mí).
   */
  async getTransferencias(userId, filters = {}) {
    const { monto, dni, fecha, history } = filters;
    const isHistoryMode = history === 'true';

    // 1. Validación de reglas de negocio para Búsqueda Pública
    if (!isHistoryMode) {
        const filterCount = [monto, dni, fecha].filter(ub => !!ub.length).length;
        // Mantenemos la regla: Mínimo 2 filtros para evitar scraping en modo búsqueda
        if (filterCount < 2) return []; 
    }

    let query = supabase
      .from('transferencias')
      .select('*');

    // 2. Aplicación de Scopes (Alcance de la consulta)
    if (isHistoryMode) {
        // MODO HISTORIAL: Solo lo mío
        query = query.eq('claimed_by', userId);
    } else {
        // MODO BÚSQUEDA: Libre OR Mío
        // Sintaxis PostgREST para OR: "col.op.val,col.op.val"
        query = query.or(`claimed_by.is.null,claimed_by.eq.${userId}`);
    }

    // 3. Filtros DB Nativos (Eficiencia Máxima)
    if (monto) {
        query = query.eq('monto', parseFloat(monto));
    }

    // Filtro JSONB Nativo para DNI (PostgreSQL lo procesa, no Node.js)
    // Asumimos estructura: datos_completos -> payer -> identification -> number
    if (dni) {
        // Usamos el operador contains para buscar dentro del JSON
        // Nota: Esto requiere que datos_completos sea columna JSONB
        query = query.filter('datos_completos->payer->identification->number', 'ilike', `%${dni}%`);
    }

    // Filtro de Rango de Fecha (+/- 10 minutos) Nativo
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

    // Ejecución
    const { data, error } = await query;

    if (error) {
        console.error("DB Error:", error);
        throw new Error('Error al consultar la base de datos');
    }

    return data;
  }

  /**
   * Reclama una transferencia de forma ATÓMICA.
   * Evita condiciones de carrera (Race Conditions).
   */
  async claimTransferencia(idPago, userId) {
    // Intentamos actualizar SOLO si claimed_by es NULL.
    // Esto es atómico en PostgreSQL.
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: userId })
      .eq('id_pago', idPago)
      .is('claimed_by', null) // Condición Clave: Solo si está libre
      .select();

    if (error) throw new Error(error.message);

    // Si data está vacío, significa que ninguna fila cumplió la condición (ya estaba reclamada)
    if (!data || data.length === 0) {
        // Verificamos si ya era mía para dar un mensaje idempotente amigable
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
   * Guarda una nueva transferencia desde el Webhook
   */
  async createTransferenciaFromWebhook(paymentDetails) {
    // Verificación básica para evitar duplicados si MP reintenta el webhook
    const { data: existing } = await supabase
        .from('transferencias')
        .select('id_pago')
        .eq('id_pago', paymentDetails.id)
        .single();
    
    if (existing) return true; // Ya existe, ignoramos

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

    if (error) {
        console.error("Error insertando transferencia:", error);
        throw error;
    }
    return true;
  }
}

module.exports = new TransferenciaService();