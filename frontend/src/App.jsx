import { useState, useEffect } from 'react';
import './App.css';
import Transferencia from './components/Transferencia'; // Importamos el nuevo componente

function App() {
  // Estado para almacenar la lista de transferencias
  const [transferencias, setTransferencias] = useState([]);
  // Estado para manejar la carga de datos
  const [loading, setLoading] = useState(true);
  // Estado para manejar posibles errores
  const [error, setError] = useState(null);

  // --- Estados para los filtros ---
  const [montoFilter, setMontoFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');

  // useEffect se ejecuta para buscar los datos
  const fetchTransferencias = async (queryParams = '') => {
    setLoading(true);
    setError(null);
    try {
      // Corregimos la URL de la API a /api/pagos
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transferencias${queryParams}`;
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

  // Cargar los datos iniciales cuando el componente se monta
  useEffect(() => {
    fetchTransferencias();
  }, []); // El array vacío [] significa que este efecto se ejecuta solo una vez

  // --- Función para manejar el filtrado ---
  const handleFilter = (e) => {
    e.preventDefault(); // Evitamos que el formulario recargue la página
    const params = new URLSearchParams();
    if (montoFilter) params.append('monto', montoFilter);
    if (dniFilter) params.append('dni', dniFilter);
    if (fechaFilter) {
      // Convertir la fecha local del input a un string ISO (UTC)
      const utcDateString = new Date(fechaFilter).toISOString();
      params.append('fecha', utcDateString);
    }
    
    fetchTransferencias(`?${params.toString()}`);
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Visualizador de Transferencias</h1>
        <p>Últimos pagos recibidos de Mercado Pago</p>
      </header>

      {/* --- Formulario de Filtros --- */}
      <form className="filter-form" onSubmit={handleFilter}>
        <div className="filter-inputs">
          <input
            type="number"
            placeholder="Monto exacto"
            value={montoFilter}
            onChange={(e) => setMontoFilter(e.target.value)}
          />
          <input
            type="text"
            placeholder="DNI del pagador"
            value={dniFilter}
            onChange={(e) => setDniFilter(e.target.value)}
          />
          <input
            type="datetime-local"
            value={fechaFilter}
            onChange={(e) => setFechaFilter(e.target.value)}
          />
        </div>
        <button type="submit">Filtrar</button>
      </form>

      <main>
        {loading && <p>Cargando transferencias...</p>}
        {error && <p>Error al cargar los datos: {error}</p>}
        {!loading && !error && (
          <div className="transferencias-list">
            {transferencias.length > 0 ? (
              transferencias.map(transferencia => (
                // Corregimos la key a id_pago
                <Transferencia key={transferencia.id_pago} transferencia={transferencia} />
              ))
            ) : (
              <p>No se encontraron transferencias con los filtros aplicados.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
