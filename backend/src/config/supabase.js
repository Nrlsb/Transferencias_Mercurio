const { createClient } = require('@supabase/supabase-js');
const config = require('./config'); // Importamos la configuración ya validada

// Ya no necesitamos validar aquí, config.js lo hizo al inicio.
// Si config.js pasó, estas variables existen garantizadamente.
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

module.exports = supabase;