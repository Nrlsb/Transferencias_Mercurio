const supabase = require('../config/supabase');

class TransferenciaService {

    // --- MÉTODOS UNIFICADOS (MP + MANUAL) ---

    /**
     * Obtiene transferencias unificadas de ambas fuentes con filtros avanzados.
     */
    async getTransferencias(userId, isAdmin, filters = {}) {
        const {
            monto,
            history,
            emailReclamador,
            fechaDesde,
            fechaHasta,
            confirmed,
            // Nuevos filtros
            bancos,         // String: "Mercado Pago,Santander,Macro" o vacío
            estadoReclamo,  // String: "all", "claimed", "unclaimed"
            // Paginación
            page,
            limit
        } = filters || {};

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const isHistoryMode = history === 'true';

        // --- LOGICA DE BANCOS ---
        // Determinamos qué tablas consultar basándonos en el filtro de bancos
        const banksArray = bancos ? bancos.split(',') : [];
        const hasBankFilter = banksArray.length > 0 && !banksArray.includes('Todas');

        // Mercado Pago se consulta si no hay filtro, si se selecciona "Todas", o si "Mercado Pago" está explícitamente seleccionado
        const includeMP = !hasBankFilter || banksArray.includes('Mercado Pago');

        // Manuales se consultan si no hay filtro, "Todas", o si hay bancos manuales específicos seleccionados
        const specificManualBanks = banksArray.filter(b => b !== 'Mercado Pago' && b !== 'Todas');
        const includeManual = !hasBankFilter || specificManualBanks.length > 0;


        // --- PREPARACIÓN DE QUERIES ---

        // 1. Query Mercado Pago
        let queryMP = null;
        if (includeMP) {
            let joinTypeMP = emailReclamador ? '!inner' : '';
            let selectQueryMP = isAdmin ? `*, usuarios!fk_claimed_by${joinTypeMP}(email)` : '*';
            queryMP = supabase.from('transferencias').select(selectQueryMP, { count: 'exact' }).range(from, to).limit(limitNum);
        }

        // 2. Query Manuales
        let queryMan = null;
        if (includeManual) {
            let joinTypeMan = emailReclamador ? '!inner' : '';
            let selectQueryMan = isAdmin ? `*, usuarios${joinTypeMan}(email)` : '*';
            queryMan = supabase.from('transferencias_manuales').select(selectQueryMan, { count: 'exact' }).range(from, to).limit(limitNum);
        }

        // --- APLICAR FILTROS ---

        // Filtros Admin
        if (isAdmin) {
            // FILTRO DE ESTADO RECLAMO (Tri-estado)
            if (queryMP) {
                if (estadoReclamo === 'claimed') queryMP = queryMP.not('claimed_by', 'is', null);
                else if (estadoReclamo === 'unclaimed') queryMP = queryMP.is('claimed_by', null);
            }
            if (queryMan) {
                if (estadoReclamo === 'claimed') queryMan = queryMan.not('fecha_reclamo', 'is', null);
                else if (estadoReclamo === 'unclaimed') queryMan = queryMan.is('fecha_reclamo', null);
            }

            // Filtro Email
            if (emailReclamador) {
                if (queryMP) queryMP = queryMP.ilike('usuarios.email', `%${emailReclamador}%`);
                if (queryMan) queryMan = queryMan.ilike('usuarios.email', `%${emailReclamador}%`);
            }

            // Filtro Confirmado (Tab 0 vs Tab 1)
            if (confirmed === 'true') {
                if (queryMP) queryMP = queryMP.eq('confirmed', true);
                if (queryMan) queryMan = queryMan.eq('confirmed', true);
            } else if (confirmed === 'false') {
                if (queryMP) queryMP = queryMP.or('confirmed.eq.false,confirmed.is.null');
                if (queryMan) queryMan = queryMan.or('confirmed.eq.false,confirmed.is.null');
            }

            // Filtro Específico de Bancos Manuales
            if (queryMan && specificManualBanks.length > 0) {
                queryMan = queryMan.in('banco', specificManualBanks);
            }

        } else if (isHistoryMode) {
            // User History Logic (CLIENTE - PESTAÑA HISTORIAL)
            // FIX: Asegurarse que el userId exista antes de filtrar
            if (!userId) {
                // Si no hay ID de usuario en modo historial, no se puede devolver nada.
                // Esto previene un error 500 si userId es undefined.
                queryMP = null;
                queryMan = null;
            } else {
                if (queryMP) queryMP = queryMP.eq('claimed_by', userId);

                // MODIFICACIÓN: En el historial del cliente, SOLO mostramos las manuales YA RECLAMADAS
                if (queryMan) queryMan = queryMan.eq('user_id', userId).not('fecha_reclamo', 'is', null);
            }
        } else {
            // User Search Logic
            if (queryMP) queryMP = queryMP.is('claimed_by', null);
            queryMan = null; // Usuarios no buscan manuales en búsqueda general
        }

        // Filtros comunes (Monto y Fechas)
        if (monto) {
            if (queryMP) queryMP = queryMP.eq('monto', parseFloat(monto));
            if (queryMan) queryMan = queryMan.eq('monto', parseFloat(monto));
        }

        if (fechaDesde || fechaHasta) {
            const fromIso = fechaDesde ? new Date(fechaDesde).toISOString() : null;
            let toIso = null;
            if (fechaHasta) {
                const d = new Date(fechaHasta);
                d.setHours(23, 59, 59, 999);
                toIso = d.toISOString();
            }

            if (queryMP) {
                if (fromIso) queryMP = queryMP.gte('fecha_aprobado', fromIso);
                if (toIso) queryMP = queryMP.lte('fecha_aprobado', toIso);
            }
            if (queryMan) {
                if (fromIso) queryMan = queryMan.gte('fecha_carga', fromIso);
                if (toIso) queryMan = queryMan.lte('fecha_carga', toIso);
            }
        }

        // --- EJECUCIÓN PARALELA SEGURA ---
        const promises = [];
        if (queryMP) promises.push(queryMP);
        if (queryMan) promises.push(queryMan);

        if (promises.length === 0) return { data: [], totalCount: 0 }; // Si los filtros excluyen todo

        const results = await Promise.all(promises);

        let combined = [];
        let totalCount = 0;

        // Procesar resultados MP (siempre es el primero si existe)
        if (queryMP) { // Usar queryMP para saber si la promesa existía
            const resMP = results.shift();
            if (resMP.error) throw new Error('MP Error: ' + resMP.error.message);
            combined = [...combined, ...(resMP.data || [])];
            totalCount += resMP.count || 0;
        }

        // Procesar resultados Manual
        if (queryMan) { // Usar queryMan para saber si la promesa existía
            const resMan = results.shift();
            if (resMan.error) throw new Error('Manual Error: ' + resMan.error.message);
            combined = [...combined, ...(resMan.data || [])];
            totalCount += resMan.count || 0;
        }

        // Ordenamiento final
        if (!isAdmin && isHistoryMode) {
            // Para el historial del cliente, ordenar por fecha de reclamo descendente.
            // En el modo historial, ambas transferencias (MP y Manual) ya han sido reclamadas 
            // y por lo tanto tienen un campo `fecha_reclamo`.
            combined.sort((a, b) => {
                const dateA = new Date(a.fecha_reclamo);
                const dateB = new Date(b.fecha_reclamo);
                return dateB - dateA;
            });
        } else {
            // Para administradores y búsqueda de clientes, ordenar por fecha de carga/aprobación descendente.
            combined.sort((a, b) => {
                const dateA = new Date(a.fecha_aprobado || a.fecha_carga);
                const dateB = new Date(b.fecha_aprobado || b.fecha_carga);
                return dateB - dateA;
            });
        }

        return { data: combined, totalCount: totalCount };
    }

    // --- CONFIRMACIÓN MASIVA UNIFICADA ---
    async confirmBatch(ids) {
        if (!ids || ids.length === 0) return [];

        // Intentamos confirmar en AMBAS tablas.
        const p1 = supabase
            .from('transferencias')
            .update({ confirmed: true })
            .in('id_pago', ids)
            .select();

        const p2 = supabase
            .from('transferencias_manuales')
            .update({ confirmed: true })
            .in('id_transaccion', ids)
            .select();

        const [resMP, resMan] = await Promise.all([p1, p2]);

        if (resMP.error) throw new Error(resMP.error.message);
        if (resMan.error) throw new Error(resMan.error.message);

        return [...(resMP.data || []), ...(resMan.data || [])];
    }

    // --- MÉTODOS INDIVIDUALES MP ---

    async claimTransferencia(idPago, userId) {
        // MODIFICADO: Ahora guarda fecha_reclamo al momento de reclamar
        const { data, error } = await supabase
            .from('transferencias')
            .update({
                claimed_by: userId,
                fecha_reclamo: new Date().toISOString()
            })
            .eq('id_pago', idPago)
            .is('claimed_by', null)
            .select();
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error('Ya reclamada.');
        return data[0];
    }

    async unclaimTransferencia(idPago) {
        const { data, error } = await supabase
            .from('transferencias')
            .update({
                claimed_by: null,
                fecha_reclamo: null
            })
            .eq('id_pago', idPago)
            .select();

        if (error) throw new Error(error.message);
        return data ? data[0] : null;
    }

    // SOLO MOSTRAR LAS NO CONFIRMADAS EN LA PESTAÑA "OTROS BANCOS" (ADMIN)
    async getManualTransfers() {
        let query = supabase
            .from('transferencias_manuales')
            .select('*, usuarios(email)')
            .or('confirmed.eq.false,confirmed.is.null')
            .order('fecha_carga', { ascending: false });

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }

    async getAllUsers() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, email')
            .order('email', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    async getManualTransfersByUserId(userId, onlyUnclaimed = false) {
        // Este método lo usa el usuario para "Mis Transferencias Manuales"
        let query = supabase
            .from('transferencias_manuales')
            .select('*')
            .eq('user_id', userId);

        // Si onlyUnclaimed es true, solo traemos las que NO han sido reclamadas (fecha_reclamo es null)
        if (onlyUnclaimed) {
            query = query.is('fecha_reclamo', null);
        }

        query = query.order('fecha_carga', { ascending: false });

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }

    async updateManualTransfer(idTransaccion, { banco, monto, userId, fecha_real }) {
        const updateData = {};
        if (banco) updateData.banco = banco;
        if (monto) updateData.monto = parseFloat(monto);
        if (userId !== undefined) updateData.user_id = userId || null;
        if (fecha_real) updateData.fecha_real = fecha_real;

        const { data, error } = await supabase
            .from('transferencias_manuales')
            .update(updateData)
            .eq('id_transaccion', idTransaccion)
            .select();

        if (error) throw new Error(error.message);
        return data[0];
    }

    async createManualTransfer({ id_transaccion, banco, monto, userId, fecha_real }) {
        // Llama a la función RPC (Remote Procedure Call) de Supabase para ejecutar la función de base de datos.
        const { data, error } = await supabase.rpc('create_manual_transfer_atomic', {
            p_id_transaccion: id_transaccion,
            p_banco: banco,
            p_monto: parseFloat(monto), // Asegurarse de que el tipo sea NUMERIC/FLOAT en la DB
            p_user_id: userId || null,
            p_fecha_real: fecha_real || null
        });

        if (error) {
            // Supabase RPC devuelve un error si la función de DB lanza una excepción.
            // Adaptar el mensaje de error si es necesario, o relanzar el original.
            console.error("Error al llamar a create_manual_transfer_atomic:", error.message);
            throw new Error(`Error en la transacción de transferencia manual: ${error.message}`);
        }
        // La función RPC devuelve un array de registros, si la función SQL devuelve SETOF.
        // Si se espera un único registro, se puede tomar el primero.
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

    // --- REGISTRO DE CLICKS (AUDITORÍA) ---
    async registerClick(id, isManual, userEmail) {
        const table = isManual ? 'transferencias_manuales' : 'transferencias';
        const idField = isManual ? 'id_transaccion' : 'id_pago';

        const { data: current, error: fetchError } = await supabase
            .from(table)
            .select('clicks_count, clicks_history')
            .eq(idField, id)
            .single();

        if (fetchError) throw new Error(fetchError.message);

        const newCount = (current.clicks_count || 0) + 1;
        const currentHistory = current.clicks_history || [];
        const newEntry = {
            date: new Date().toISOString(),
            user: userEmail
        };

        const { error: updateError } = await supabase
            .from(table)
            .update({
                clicks_count: newCount,
                clicks_history: [...currentHistory, newEntry]
            })
            .eq(idField, id);

        if (updateError) throw new Error(updateError.message);
        return true;
    }

    // --- WEBHOOK (MERCADO PAGO) ---
    async createTransferenciaFromWebhook(paymentData) {
        // Solo procesamos si tenemos un ID
        if (!paymentData || !paymentData.id) {
            throw new Error("Datos de pago inválidos (falta ID)");
        }

        // Mapeo de datos SEGÚN SCHEMA REAL (Español)
        const transferData = {
            id_pago: paymentData.id, // int8
            monto: paymentData.transaction_amount,
            fecha_aprobado: paymentData.date_approved,
            estado: paymentData.status, // columna 'estado'
            descripcion: paymentData.description || null, // columna 'descripcion'
            email_pagador: paymentData.payer?.email || null, // columna 'email_pagador'
            datos_completos: paymentData // columna 'datos_completos' (jsonb)
        };

        // Upsert: Si ya existe (por ID), se actualiza. Si no, se crea.
        const { data, error } = await supabase
            .from('transferencias')
            .upsert(transferData, { onConflict: 'id_pago' })
            .select();

        if (error) {
            console.error("❌ Error guardando transferencia MP en DB:", error.message);
            throw new Error(error.message);
        }

        return data ? data[0] : null;
    }
}

module.exports = new TransferenciaService();