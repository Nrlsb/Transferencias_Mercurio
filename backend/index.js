const express = require("express");
const { MercadoPagoConfig, Payment } = require("mercadopago");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");

// Carga las variables de entorno
dotenv.config();

// --- Configuración de Clientes ---

// Cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);

// Cliente de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


const app = express();
const port = 3000;

// Middlewares necesarios para recibir datos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Rutas de la Aplicación ---

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Servidor de webhooks activo.");
});

// Ruta para obtener todas las transferencias para el frontend
app.get("/api/transferencias", async (req, res) => {
  console.log("🚚 Solicitud recibida en /api/transferencias");
  try {
    const { data, error } = await supabase
      .from('transferencias')
      .select('*')
      .order('fecha_aprobado', { ascending: false }); // Ordenar por más reciente

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al obtener transferencias de Supabase:", error.message);
    res.status(500).json({ error: "Error interno del servidor al consultar la base de datos." });
  }
});

// Ruta del Webhook de Mercado Pago
app.post("/webhook", async (req, res) => {
  // Respondemos 200 OK inmediatamente para evitar timeouts
  res.sendStatus(200);

  try {
    const body = req.body || {};
    const query = req.query || {};
    
    let paymentId;
    let source = "";

    // Detección de ID de pago desde diferentes tipos de notificaciones
    if (body.type === "payment" && body.data && body.data.id) {
      paymentId = body.data.id;
      source = "Webhook V2";
    } else if (query.topic === "payment" && query.id) {
      paymentId = query.id;
      source = "IPN (Query)";
    } else if (body.topic === "payment" && body.resource) {
       const parts = body.resource.split("/");
       paymentId = parts[parts.length - 1];
       source = "IPN (Body)";
    }

    if (paymentId) {
      console.log(`🔔 Notificación recibida (${source}). ID Pago: ${paymentId}`);
      
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`🔍 Consultando API de MP para pago ${paymentId}...`);
      const paymentDetails = await payment.get({ id: paymentId });

      // Aquí mostramos los datos en consola como antes
      console.log("✅ DATOS COMPLETOS DEL PAGO RECIBIDO:");
      console.log("=========================================");
      console.log(`🆔 ID: ${paymentDetails.id} | 📊 Estado: ${paymentDetails.status}`);
      console.log(`💰 Monto: ${paymentDetails.transaction_amount} | 📝 Desc: ${paymentDetails.description}`);
      console.log("=========================================");

      // --- INICIO: Guardado en Supabase ---
      console.log("💾 Intentando guardar en Supabase...");
      
      const { error: supabaseError } = await supabase
        .from('transferencias')
        .insert([
          {
            id_pago: paymentDetails.id,
            fecha_aprobado: paymentDetails.date_approved,
            estado: paymentDetails.status,
            monto: paymentDetails.transaction_amount,
            descripcion: paymentDetails.description,
            email_pagador: paymentDetails.payer ? paymentDetails.payer.email : null,
            datos_completos: paymentDetails // Guardamos el JSON completo por si necesitamos más datos en el futuro
          }
        ]);

      if (supabaseError) {
        console.error("❌ Error al guardar en Supabase:", supabaseError.message);
      } else {
        console.log("✅ Pago guardado en Supabase exitosamente.");
      }
      // --- FIN: Guardado en Supabase ---

    } else {
      // console.log("ℹ️ Evento recibido sin ID de pago compatible.");
    }

  } catch (error) {
    console.error("⚠️ Error procesando el webhook:", error.message);
  }
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});