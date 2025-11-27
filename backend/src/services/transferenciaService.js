const supabase = require('../config/supabase');
const { MercadoPagoConfig, Payment } = require("mercadopago");
const dotenv = require("dotenv");

dotenv.config();

// Inicializamos el cliente de MP aquí también para poder hacer consultas directas
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const paymentClient = new Payment(client);

class TransferenciaService {
  
  /**
   * Obtiene transferencias (Existente)
   */
  async getTransferencias(userId, isAdmin, filters = {}) {
    const { monto, dni, fecha, history, emailReclamador, fechaDesde, fechaHasta, soloReclamados } = filters || {};
    const isHistoryMode = history === 'true';

    // 1. Validación de reglas de negocio para Búsqueda Pública (Solo NO Admins)
    if (!isAdmin && !isHistoryMode) {
        if (dni && dni.length < 8) {
            throw new Error('El DNI debe tener al menos 8 números para realizar la búsqueda.');
        }

        const activeFilters = [monto, dni, fecha, fechaDesde, fechaHasta].filter(val => val !== undefined && val !== null && val !== '');
        
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

    // 3. Aplicación de Scopes
    if (isAdmin) {
        if (emailReclamador) {
            query = query.ilike('usuarios.email', `%${emailReclamador}%`);
        }
        if (soloReclamados === 'true') {
            query = query.not('claimed_by', 'is', null);
        }
    } else if (isHistoryMode) {
        query = query.eq('claimed_by', userId);
    } else {
        query = query.is('claimed_by', null);
    }

    // 4. Filtros DB Nativos
    if (monto) query = query.eq('monto', parseFloat(monto));
    if (dni) query = query.filter('datos_completos->payer->identification->>number', 'ilike', `%${dni}%`);

    // 5. Lógica de Fechas
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
        constYZTarget = new Date(fecha);
        if (!isNaN(fechaTarget.getTime())) {
            const diezMinutosEnMs = 10 * 60 * 1000;
            const minDate = new Date(fechaTarget.getTime() - diezMinutosEnMs).toISOString();
            const maxDate = new Date(fechaTarget.getTime() + diezMinutosEnMs).toISOString();
            query = query.gte('fecha_aprobado', minDate);
            query = query.lte('fecha_aprobado', maxDate);
        }
    }

    query = query.order('fecha_aprobado', { ascending: false });

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

  async unclaimTransferencia(idPago) {
    const { data, error } = await supabase
      .from('transferencias')
      .update({ claimed_by: null })
      .eq('id_pago', idPago)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  }

  // --- NUEVA FUNCIÓN SOLICITADA ---
  /**
   * Busca el ID en BD para verificar existencia, luego consulta a MP
   * para obtener el nombre REAL del titular bancario (como en la imagen).
   */
  async consultarTitularReal(idPago) {
    // 1. Verificar que existe en nuestra BD (Seguridad)
    const { data: exists, error } = await supabase
        .from('transferencias')
        .select('id_pago')
        .eq('id_pago', idPago)
        .single();

    if (error || !exists) {
        throw new Error("La operación no existe en nuestra base de datos.");
    }

    try {
        // 2. Consultar a Mercado Pago en VIVO para obtener datos frescos
        const paymentData = await paymentClient.get({ id: idPago });
        
        // 3. Lógica de extracción "Deep Dive" para encontrar el nombre exacto
        let titular = "Desconocido";
        let origen = "Desconocido";

        // CASO A: Transferencia Bancaria (Lo que muestra tu imagen)
        // La ruta suele ser: point_of_interaction -> transaction_data -> bank_info -> payer -> long_name
        const bankInfo = paymentData.point_of_interaction?.transaction_data?.bank_info;
        
        if (bankInfo && bankInfo.payer && bankInfo.payer.long_name) {
            titular = bankInfo.payer.long_name; // Ej: LUCAS SEBASTIAN BENITEZ
            origen = "Transferencia Bancaria (CBU)";
        } 
        // CASO B: Dinero en cuenta Mercado Pago
        else if (paymentData.payer && (paymentData.payer.first_name || paymentData.payer.last_name)) {
            titular = `${paymentData.payer.first_name || ''} ${paymentData.payer.last_name || ''}`.trim();
            origen = "Cuenta Mercado Pago";
        }
        // CASO C: Email como fallback
        else if (paymentData.payer && paymentData.payer.email) {
            titular = paymentData.payer.email;
            origen = "Email";
        }

        // Devolvemos la info estructurada
        return {
            id_operacion: idPago,
            nombre_titular: titular,
            origen_dato: origen,
            fecha_creacion: paymentData.date_created,
            monto: paymentData.transaction_amount,
            estado: paymentData.status
        };

    } catch (mpError) {
        console.error("Error consultando MP API:", mpError);
        throw new Error("Error al comunicarse con Mercado Pago para validar titular.");
    }
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
        console.log(`🔄 Actualizando pago ${paymentDetails.id}...`);
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
        console.log(`✨ Insertando nuevo pago ${paymentDetails.id}...`);
        const { error } = await supabase
            .from('transferencias')
            .insert([{ ...datosTransferencia, claimed_by: null }]);
        if (error) throw error;
    }
    return true;
  }
}

module.exports = new TransferenciaService();