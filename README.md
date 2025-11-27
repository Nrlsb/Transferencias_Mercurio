# Proyecto de Transferencia Full-Stack

Esta aplicación es un sistema full-stack que permite a los usuarios registrarse, iniciar sesión y realizar transferencias de dinero simuladas utilizando la plataforma de Mercado Pago. Cuenta con un frontend construido en React y un backend en Node.js, con Supabase como proveedor de base de datos.

## Características

-   **Autenticación de Usuarios:** Registro e inicio de sesión seguros mediante JWT.
-   **Panel de Control:** Un dashboard para que los usuarios vean su información.
-   **Creación de Transferencias:** Interfaz para iniciar una transferencia de dinero.
-   **Integración con Mercado Pago:** El backend procesa los pagos a través de la API de Mercado Pago.
-   **Notificaciones:** Un webhook para recibir notificaciones de estado de los pagos.

## Tech Stack

**Frontend:**
-   **Framework:** React 19 con Vite
-   **UI:** Material-UI (MUI)
-   **Cliente de API:** Supabase Client

**Backend:**
-   **Runtime:** Node.js
-   **Framework:** Express
-   **Base de Datos:** Supabase (PostgreSQL)
-   **Autenticación:** JSON Web Tokens (JWT)
-   **Procesamiento de Pagos:** Mercado Pago SDK

---

## Estructura del Proyecto

El repositorio está organizado en dos carpetas principales:

-   `./frontend`: Contiene la aplicación cliente desarrollada con React. Incluye componentes, estilos y la lógica para interactuar con el backend.
-   `./backend`: Contiene el servidor Node.js/Express, responsable de la lógica de negocio, la autenticación y la comunicación con la base de datos y la API de Mercado Pago.

---

## Configuración del Proyecto

### Prerrequisitos
-   Node.js (v18 o superior)
-   npm (o un gestor de paquetes equivalente)
-   Una cuenta de Supabase
-   Una cuenta de Mercado Pago con credenciales de API

### 1. Configuración del Backend

1.  **Navega al directorio del backend:**
    ```bash
    cd backend
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Crea un archivo `.env`** en la raíz del directorio `backend` y añade las siguientes variables de entorno:

    ```env
    # URL de tu proyecto en Supabase
    SUPABASE_URL=TU_SUPABASE_URL
    # La SERVICE_KEY de tu proyecto en Supabase (¡secreto!)
    SUPABASE_SERVICE_KEY=TU_SUPABASE_SERVICE_KEY
    # Un secreto fuerte para firmar los JWT
    JWT_SECRET=TU_JWT_SECRET
    # Token de acceso de la API de Mercado Pago (¡secreto!)
    MERCADOPAGO_ACCESS_TOKEN=TU_MERCADOPAGO_ACCESS_TOKEN
    # Puerto para el servidor backend
    PORT=3001
    ```

4.  **Inicia el servidor de desarrollo:**
    ```bash
    npm start
    ```
    El servidor estará corriendo en `http://localhost:3001`.

### 2. Configuración del Frontend

1.  **Navega al directorio del frontend:**
    ```bash
    cd ../frontend
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Crea un archivo `.env.local`** en la raíz del directorio `frontend` y añade las siguientes variables:

    *Nota: Las variables de entorno en Vite deben empezar con `VITE_`.*

    ```env
    # URL de tu proyecto en Supabase
    VITE_SUPABASE_URL=TU_SUPABASE_URL
    # La ANON_KEY (pública) de tu proyecto en Supabase
    VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
    ```

4.  **Inicia la aplicación de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne).