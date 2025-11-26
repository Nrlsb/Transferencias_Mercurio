import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Estado para almacenar la lista de transferencias
  const [transferencias, setTransferencias] = useState([]);
  // Estado para manejar la carga de datos
  const [loading, setLoading] = useState(true);
  // Estado para manejar posibles errores
  const [error, setError] = useState(null);

  // useEffect se ejecuta cuando el componente se monta
  useEffect(() => {
    // Definimos una función asíncrona para traer los datos
    const fetchTransferencias = async () => {
      try {
        // Construimos la URL completa para la API.
        // En producción, usará la variable de entorno de Vercel.
        // En desarrollo, esta variable no existirá y el fetch fallará si no se define en un .env.local,
        // pero el proxy de Vite seguirá funcionando para las pruebas locales si se usa la ruta relativa.
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transferencias`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTransferencias(data); // Guardamos los datos en el estado
      } catch (e) {
        setError(e.message); // Guardamos el mensaje de error
      } finally {
        setLoading(false); // Dejamos de cargar, ya sea con éxito o con error
      }
    };

    fetchTransferencias(); // Ejecutamos la función
  }, []); // El array vacío [] significa que este efecto se ejecuta solo una vez

  return (
    <div className="App">
      <header className="App-header">
        <h1>Visualizador de Transferencias</h1>
        <p>Últimos pagos recibidos de Mercado Pago</p>
      </header>
      <main>
        {loading && <p>Cargando transferencias...</p>}
        {error && <p>Error al cargar los datos: {error}</p>}
        {!loading && !error && (
          <div className="transferencias-list">
            {/* Por ahora, mostramos los datos en formato JSON para verificar */}
            <pre>{JSON.stringify(transferencias, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
