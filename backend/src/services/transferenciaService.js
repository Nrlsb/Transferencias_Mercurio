const supabase = require('../config/supabase');

class TransferenciaService {
  
  /**
   * Obtiene transferencias.
   * - Si es Admin: Ve TODAS y trae la relación de usuario que reclamó.
   * - Si history=true: Devuelve TODO lo reclamado por el usuario.
   * - Si history=false (y no admin): Exige filtros.
   */
  async getTransferencias(userId, isAdmin, filters = {}) {
    const { monto, dni, fecha, history, emailReclamador, fechaDesde, fechaHasta, soloReclamados } = filters || {};
    const isHistoryMode = history === 'true';

    // 1. Validación de reglas de negocio para Búsqueda Pública (Solo NO Admins)
    if (!isAdmin && !isHistoryMode) {
        // Validar longitud mínima de DNI si está presente
        if (dni && dni.length < 8) {
            throw new Error('El DNI debe tener al menos 8 números para realizar la búsqueda.');
        }

        // CORRECCIÓN: Eliminado el typo "SH" y agregados fechaDesde/fechaHasta al conteo de filtros activos.
        const activeFilters = [monto, dni, fecha, fechaDesde, fechaHasta].filter(val => val !== undefined && val !== null && val !== '');
        
        // Mantenemos la regla: Mínimo 2 filtros para evitar scraping
        if (activeFilters.length < 2) return []; 
    }

    // 2. Construcción de Query
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
            query = query.ilike('usuarios.email', `%${emailReclamador}%`);
        }
        
        // Nuevo Filtro: Ver solo transferencias usadas/reclamadas
        if (soloReclamados === 'true') {
            query = query.not('claimed_by', 'is', null);
        }

    } else if (isHistoryMode) {
        // Historial: Solo lo que reclamó el usuario
        query = query.eq('claimed_by', userId);
    } else {
        // Búsqueda Pública (Usuario Normal):
        // Solo transferencias NO reclamadas (claimed_by IS NULL).
        query = query.is('claimed_by', null);
    }

    // 4. Filtros DB Nativos (Comunes)
    if (monto) {
        query = query.eq('monto', parseFloat(monto));
    }

    if (dni) {
        query = query.filter('datos_completos->payer->identification->>number', 'ilike', `%${dni}%`);
    }

    // 5. Lógica de Fechas (Mejorada para rangos de día completo)
    if (fechaDesde || fechaHasta) {
        if (fechaDesde) {
            // Aseguramos inicio del día (00:00:00) local o UTC según input
            const fromDate = new Date(fechaDesde);
            fromDate.setHours(0, 0, 0, 0);
            query = query.gte('fecha_aprobado', fromDate.toISOString());
        }
        if (fechaHasta) {
            // Aseguramos fin del día (23:59:59)
            const toDate = new Date(fechaHasta);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('fecha_aprobado', toDate.toISOString());
        }
    } else if (fecha) {
        // Lógica Legacy / Usuario Normal: Ventana de 10 minutos
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

  // NUEVO METODO PARA LIBERAR TRANSFERENCIA (ADMIN)
  async unclaimTransferencia(idPago) {
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: null })
      .eq('id_pago', idPago)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  // Lógica Mejorada: Soporta INSERT o UPDATE (Upsert manual)
  async createTransferenciaFromWebhook(paymentDetails) {
    // 1. Verificamos si existe
    const { data: existing } = await supabase
        .from('transferencias')
        .select('id_pago')
        .eq('id_pago', paymentDetails.id)
        .single();
    
    // Preparar objeto de datos
    const datosTransferencia = {
        id_pago: paymentDetails.id,
        fecha_aprobado: paymentDetails.date_approved,
        estado: paymentDetails.status,
        monto: paymentDetails.transaction_amount,
        descripcion: paymentDetails.description,
        email_pagador: paymentDetails.payer ? paymentDetails.payer.email : null,
        datos_completos: paymentDetails,
        // IMPORTANTE: No sobreescribimos claimed_by en updates para no perder el reclamo
    };

    if (existing) {
        // 2. CASO UPDATE: Si ya existe, actualizamos la info (ej: nombre del pagador que llega tarde)
        console.log(`🔄 Actualizando pago ${paymentDetails.id} con nuevos datos de webhook...`);
        
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
        // 3. CASO INSERT: Nuevo pago
        console.log(`✨ Insertando nuevo pago ${paymentDetails.id}...`);
        
        // Para insert inicial, aseguramos que claimed_by sea null explícitamente si se requiere
        const { error } = await supabase
            .from('transferencias')
            .insert([{ ...datosTransferencia, claimed_by: null }]);

        if (error) throw error;
    }

    return true;
  }
}

module.exports = new TransferenciaService();