const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config'); // Importamos la configuración validada

const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    // 1. Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // 2. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insertar en la tabla personalizada (por defecto is_admin es false en DB)
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ email, password: hashedPassword }])
      .select()
      .single();

    if (error) throw error;

    // 4. Generar Token (Incluimos is_admin en el payload)
    const token = jwt.sign(
      { 
        id: data.id, 
        email: data.email, 
        is_admin: data.is_admin || false 
      }, 
      config.jwtSecret, 
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente',
      token,
      user: { 
        id: data.id, 
        email: data.email, 
        is_admin: data.is_admin || false 
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar usuario
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 2. Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. Generar Token (Incluimos is_admin en el payload)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        is_admin: user.is_admin || false 
      }, 
      config.jwtSecret, 
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        is_admin: user.is_admin || false 
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  register,
  login
};