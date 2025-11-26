const supabase = require('../config/supabase');

class TransferenciaService {
  
  /**
   * Obtiene transferencias.
   * - Si es Admin: Ve TODAS y trae la relación de usuario que reclamó.
   * - Si history=true: Devuelve TODO lo reclamado por el usuario.
   * - Si history=false (y no admin): Exige filtros.
   */
  async getTransferencias(userId, isAdmin, filters = {}) {
    const { monto, dni, fecha, history, emailReclamador, fechaDesde, fechaHasta } = filters || {};
    const isHistoryMode = history === 'true';

    // 1. Validación de reglas de negocio para Búsqueda Pública (Solo NO Admins)
    if (!isAdmin && !isHistoryMode) {
        // Validar longitud mínima de DNI si está presente
        if (dni && dni.length < 8) {
            throw new Error('El DNI debe tener al menos 8 números para realizar la búsqueda.');
        }

        // Creamos un array seguro con los valores de los filtros
        const activeFilters = [monto, dni, fecha].filter(val => val !== undefined && val !== null && val !== '');
        
        // Mantenemos la regla: Mínimo 2 filtros para evitar scraping
        if (activeFilters.length < 2) return []; 
    }

    // 2. Construcción de Query
    // Si filtramos por email del reclamador, necesitamos un INNER JOIN (!inner) para que el filtro aplique
    // Si no, usamos un LEFT JOIN estándar para traer el dato si existe
    let joinType = emailReclamador ? '!inner' : '';
    let selectQuery = isAdmin 
        ? `*, usuarios!fk_claimed_by${joinType}(email)` 
        : '*';

    let query = supabase
      .from('transferencias')
      .select(selectQuery);

    // 3. Aplicación de Scopes (Permisos de visualización)
    if (isAdmin) {
        // Admin ve todo
        // Filtro específico de Admin: Por Email de quien reclamó
        if (emailReclamador) {
            // Nota: Al usar !inner en el select, podemos filtrar por la tabla relacionada
            query = query.ilike('usuarios.email', `%${emailReclamador}%`);
        }
    } else if (isHistoryMode) {
        query = query.eq('claimed_by', userId);
    } else {
        // Usuario normal buscando: Ve libres O suyas
        query = query.or(`claimed_by.is.null,claimed_by.eq.${userId}`);
    }

    // 4. Filtros DB Nativos (Comunes)
    if (monto) {
        query = query.eq('monto', parseFloat(monto));
    }

    if (dni) {
        // Usamos ->> para extraer como texto y poder usar ilike
        query = query.filter('datos_completos->payer->identification->>number', 'ilike', `%${dni}%`);
    }

    // 5. Lógica de Fechas
    // Si es admin y manda rango, usamos rango. Si no, lógica normal o específica.
    if (fechaDesde || fechaHasta) {
        if (fechaDesde) query = query.gte('fecha_aprobado', new Date(fechaDesde).toISOString());
        if (fechaHasta) query = query.lte('fecha_aprobado', new Date(fechaHasta).toISOString());
    } else if (fecha) {
        // Lógica Legacy / Usuario Normal: Ventana de 10 minutos
        // Si el admin usa el campo "fecha" exacto (input viejo), se mantiene esta lógica, 
        // pero ahora tiene los campos de rango.
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