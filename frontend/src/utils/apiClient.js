// Variable para almacenar la función de logout
let logoutInterceptor = null;

// URL Base desde variables de entorno
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Configura la acción a ejecutar cuando se detecta una sesión expirada.
 * Se debe llamar desde App.jsx o el punto de entrada principal.
 */
export const setupInterceptors = (logoutFn) => {
  logoutInterceptor = logoutFn;
};

/**
 * Cliente HTTP unificado.
 * Maneja automáticamente: Headers, Token y Errores 401/403.
 * * @param {string} endpoint - Ej: '/api/transferencias'
 * @param {object} options - Opciones de fetch (method, body, etc.)
 */
export const apiClient = async (endpoint, options = {}) => {
  // 1. Obtener token actual
  const token = localStorage.getItem('authToken');

  // 2. Configurar Headers por defecto
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // Permite sobrescribir si es necesario
    },
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // 3. Interceptor de Errores de Autenticación
    if (response.status === 401 || response.status === 403) {
      if (logoutInterceptor) {
        logoutInterceptor(); // Cierra sesión en React y limpia localStorage
      }
      throw new Error('Sesión expirada o inválida. Por favor, inicie sesión nuevamente.');
    }

    // 4. Manejo genérico de errores JSON
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.details
        ? `${errorData.error} (${errorData.details})`
        : (errorData.error || `Error HTTP: ${response.status}`);
      throw new Error(errorMessage);
    }

    // 5. Retornar respuesta parseada (opcional, o retornar response raw)
    // Para mantener flexibilidad, retornamos el objeto response, pero facilitamos el json
    // En este caso, como tu código espera response.json(), retornaremos response
    // pero ya validamos el .ok arriba.
    return response;

  } catch (error) {
    // Aquí podrías enviar logs a un servicio como Sentry
    console.error(`API Error (${endpoint}):`, error.message);
    throw error;
  }
};