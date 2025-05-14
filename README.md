* * * * *

Fantasy Draft: El Fantasy Fútbol con Draft Semanal ⚽🏆
==================================================

Fantasy Draft es una innovadora plataforma de Fantasy Fútbol con un sistema de draft semanal, donde los participantes seleccionan sus futbolistas de cada jornada de manera dinámica. Inspirado en el formato FutDraft, este proyecto busca ofrecer una experiencia única, flexible y realista, permitiendo que los usuarios creen su plantilla semanalmente y compitan según el rendimiento real de los jugadores.

## Tabla de Contenidos 📚
- [Descripción del Proyecto ✨](#descripcion-del-proyecto)
- [Características 🎯](#caracteristicas)
- [Arquitectura y Tecnologías 🖥️](#arquitectura-y-tecnologias)
- [Instalación y Configuración 🚀](#instalacion-y-configuracion)
- [Variables de Entorno ⚙️](#variables-de-entorno)
- [Documentación de la API 📡](#documentacion-de-la-api)
- [Estructura del Proyecto 🗂️](#estructura-del-proyecto)
- [Licencia 📄](#licencia)
- [Autores 👥](#autores)


## Descripción del Proyecto 📝
------------------------

**Fantasy Draft** es un juego en el que los participantes crean y gestionan su equipo basándose en el rendimiento real de los futbolistas. En nuestro sistema, en lugar de tener un equipo fijo durante toda la temporada, cada jornada se inicia con un draft dinámico en el que los usuarios eligen jugadores disponibles según su estado de forma y rendimiento.

Además, el sistema define dos roles principales dentro de una liga:

-   **Fundador:** Quien crea la liga y tiene permisos para gestionar a los usuarios.
-   **Miembro:** Participante que se une a la liga y compite en los drafts semanales.

La aplicación está pensada para ser multiplataforma, manteniendo una única cuenta para el usuario tanto en la web como en la aplicación móvil.

## Características 🎯

- **Gestión de Usuarios y Roles** 👥  
  - Registro y login web (con refresh token) y móvil (sin refresh) usando JWT.  
  - Soporte de OAuth2 con Google (web y móvil).  
  - Endpoints de administración: listado, obtención, edición parcial y eliminación de usuarios.  

- **Control de Ligas Completo** 🏆  
  - Crear ligas (el creador se une automáticamente como capitán).  
  - Unirse, abandonar, expulsar usuarios y reasignar capitán.  
  - Obtener código de liga, listar participantes con su ranking y puntos.  
  - Subida y obtención de imágenes de la liga por el capitán.  
  - Renombrar ligas (solo capitán).  

- **Draft Semanal Dinámico** ⚡  
  - Crear o recuperar el borrador de la próxima jornada con la formación elegida.  
  - Actualizar opciones en tiempo real a medida que el usuario elige futbolistas.  
  - Guardar la plantilla final y bloquear el draft.  
  - Endpoints para obtener la plantilla definitiva y el estado del borrador.  

- **Procesamiento de Puntuaciones Fantasy** 📊  
  - Cálculo y subida de puntos por jornada (`uploadRoundFantasyPointsController`).  
  - Cron job automático que recorre cada jornada hasta la actual para sincronizar puntos.  

- **Actualización Automática (Cron Jobs)** ⏰  
  - Sincronización de temporadas, jornadas, equipos y jugadores desde Sportmonks a Supabase.  
  - Detección y marcado de la jornada “is_current”.  
  - Notificación global a las 6 AM del comienzo del plazo de draft.  

- **Notificaciones en Tiempo Real** 🔔  
  - Generación de notificaciones globales y específicas en BD.  
  - Emisión via Socket.IO y push notifications a través de FCM.  

- **Formularios de Contacto** ✉️  
  - Crear mensajes de usuario, listar todos (solo admins) y marcar como “resolved”.  

- **Estadísticas de Partidos y Equipos** ⚽  
  - Endpoints para fixtures de una jornada, jornada actual, estadísticas de un partido.  
  - Listado de equipos y jugadores desde Supabase con filtros por puntos y equipo.  

- **Personalización de Perfil** 🖼️  
  - Subida y servicio de imagen de usuario.  
  - Actualización de username, fecha de nacimiento y contraseña (con verificación).  

- **Seguridad y Validaciones** 🔒  
  - Validación de esquemas con Joi y manejo centralizado de errores HTTP.  
  - Middleware de autenticación que inyecta `res.locals.user` en todos los controladores.  


## Arquitectura y Tecnologías 🖥️

La capa de **Backend** está diseñada siguiendo un patrón MVC ligero con servicios, persistencia y controladores bien separados. A continuación, las piezas clave:

- **Lenguaje y Runtime:**  
  - Node.js ≥ v16 como entorno de ejecución.  
  - TypeScript para tipado estático (extensiones `.ts`/`.js`).  

- **Framework Web:**  
  - Express para enrutamiento, middlewares y manejo de peticiones HTTP.  

- **Validación de Datos:**  
  - Joi en cada `middleware` para validar esquemas de request antes de llegar al controlador. ✅  

- **Autenticación y Autorización:**  
  - **JWT**: generación de access y refresh tokens (1 h acceso web, 7 d refresh, 365 d móvil).  
  - **bcrypt** para hash y comparación segura de contraseñas.  
  - **Google OAuth2** con `google-auth-library` (web y móvil).  
  - Middleware que inyecta `res.locals.user` tras validar el token. 🔐  

- **Bases de Datos:**  
  - **MongoDB** (Mongoose) para datos no relacionales:  
    - Formularios de contacto, logs, sesiones temporales, etc. 🗄️  
  - **PostgreSQL (Supabase)** para datos relacionales:  
    - Usuarios, ligas, plantillas, jornadas, relaciones many-to-many.  
    - Cliente oficial de Supabase y `sql-template-tag` para queries. 🗄️  

- **Integración con APIs Externas:**  
  - **Sportmonks**: obtención de temporadas, jornadas, fixtures y estadísticas con Axios. 📡  
  - Rutas bajo `/api/v1/sportmonks` y `/api/v1/partidos`.  

- **Programación de Tareas (Cron Jobs):**  
  - `node-cron` para:  
    - Sincronizar temporadas, jornadas, equipos y jugadores (cada minuto).  
    - Actualizar `is_current` de la jornada actual (cada 30 s).  
    - Ejecutar el cálculo de puntos fantasy (cada dia a las 00:00).  
    - Notificar la apertura del draft. ⏱️  

- **Notificaciones en Tiempo Real & Push:**  
  - **Socket.IO**: emisión de eventos (nueva liga, expulsión, draft abierto, etc.).  
  - **Firebase Admin SDK + FCM**: envío de push notifications a dispositivos móviles. 🔔  

- **Gestión de Archivos y Multimedia:**  
  - **Multer** para subida de imágenes (usuarios y ligas).  
  - `fs` / `sendFile` para servir imágenes estáticas desde `public/img`. 🖼️  

- **Configuración y Entorno:**  
  - `dotenv` para cargar variables de entorno (`.env`).  
  - Separación de URIs y claves sensibles (Mongo, Supabase, JWT, Google, SMTP, Firebase). ⚙️  

- **Manejo de Errores y Códigos HTTP:**  
  - Centralizado en `httpStatusCodes.js` y middleware de captura de errores.

## Instalación y Configuración 🔧
---------------------------

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/LaSalleGracia-Projectes/projecte-aplicaci-web-servidor-g1markzuckerberg.git
    cd projecte-aplicaci-web-servidor-g1markzuckerberg
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
    ```env
    HOST_PORT=
    API_TOKEN=
    MONGO_URI=
    POSTGRES_URI=
    ```

4.  **Compilar:**
    ```bash
    npm run build
    ```
5. **Ejecución del Servidor** 🚀

Para iniciar el servidor, utiliza el siguiente comando:
```bash
npm run start

```

## Variables de Entorno ⚙️

- **HOST_PORT:** Puerto en el que se ejecutará el servidor (por defecto: `3000`). 🔌  
- **CONTAINER_PORT:** Puerto interno del contenedor Docker (por defecto: `3000`). 📦  
- **DB_URL:** URI de conexión a MongoDB en producción (cluster). 🌐  
- **DB_URL_LOCALHOST:** URI de conexión a MongoDB en local. 🖥️  
- **JWT_SECRET_KEY:** Clave secreta para la firma y verificación de tokens JWT. 🔑  
- **API_TOKEN:** Token de la API de Sportmonks para realizar consultas de datos de fútbol. ⚽️  
- **DATABASE_URL:** URI de conexión a PostgreSQL (Supabase). 🌐  
- **SUPABASE_URL:** URL del proyecto en Supabase. 🚀  
- **GOOGLE_CLIENT_ID:** ID de cliente OAuth2 de Google para login web. 🟢  
- **GOOGLE_CLIENT_SECRET:** Secreto de cliente OAuth2 de Google para login web. 🔒  
- **GOOGLE_CLIENT_MOBILE_ID:** ID de cliente OAuth2 de Google para login móvil. 📱  
- **EMAIL_USER:** Cuenta de correo (SMTP) usada para envíos de notificaciones y restablecimiento de contraseña. ✉️  
- **EMAIL_PASS:** Contraseña o token SMTP para la cuenta `EMAIL_USER`. 🔐  
- **GRAFANA_TOKEN:** Token de autenticación para la API de Grafana (monitorización). 📊  
- **FIREBASE_CREDENTIALS:** Ruta al fichero JSON con credenciales del Admin SDK de Firebase (mensajería). 🔔  


El servidor se conectará a MongoDB y PostgreSQL, y arrancará en `http://localhost:3000`. Se iniciará también el cron job para actualizar la jornada actual. 🔥

Documentación de la API 📡
--------------------------

La API se estructura en rutas agrupadas por funcionalidad. Algunos de los endpoints principales son:

## Documentación de la API 📡

La API se estructura en rutas agrupadas por funcionalidad. Todos los endpoints van bajo el prefijo `/api/v1`.

### Autenticación (`/api/v1/auth`) 🔒

- **POST** `/signup`: Registro de usuario (web).  
- **POST** `/signupMobile`: Registro de usuario (móvil).  
- **POST** `/login`: Inicio de sesión (web).  
- **POST** `/loginMobile`: Inicio de sesión (móvil).  
- **POST** `/logout`: Cierre de sesión (web).  
- **POST** `/logoutMobile`: Cierre de sesión (móvil).  
- **PUT** `/regenerate`: Renovación del token web.  
- **GET** `/user/:correo`: Obtener usuario por correo.  
- **DELETE** `/user/delete`: Eliminar cuenta de usuario por correo.  
- **GET** `/google/web`: Iniciar OAuth2 Google (web).  
- **GET** `/google/web/callback`: Callback OAuth2 Google (web).  
- **POST** `/google/web/token`: Token OAuth2 Google (web).  
- **GET** `/google/mobile`: Iniciar OAuth2 Google (móvil).  
- **GET** `/google/mobile/callback`: Callback OAuth2 Google (móvil).  
- **POST** `/google/mobile/token`: Token OAuth2 Google (móvil).

### Ligas (`/api/v1/liga`) 🏆

- **POST** `/create`: Crear nueva liga (requiere autenticación, puede incluir imagen).  
- **POST** `/join/:ligaCode`: Unirse a una liga por código.  
- **GET** `/users/:ligaCode`: Listar usuarios de una liga (opcional `?jornada=`).  
- **GET** `/code/:ligaId`: Obtener código de la liga (si eres miembro).  
- **DELETE** `/kickUser/:ligaId/:userId`: Expulsar a un usuario (solo capitán).  
- **PUT** `/make-captain/:ligaId/:newCaptainId`: Reasignar capitán.  
- **DELETE** `/leave/:ligaId`: Abandonar liga.  
- **PUT** `/:ligaId/upload-image`: Subir o actualizar imagen de la liga (solo capitán).  
- **GET** `/image/:ligaId`: Descargar imagen de la liga.  
- **GET** `/:leagueId/user/:userId`: Info de un usuario dentro de la liga.  
- **PUT** `/update-name/:ligaId`: Cambiar nombre de la liga.  
- **GET** `/teams`: Listar equipos de la temporada actual.

### Información de Fútbol y Partidos (`/api/v1/sportmonks` y `/api/v1/partidos`) ⚽

- **GET** `/sportmonks/allPlayers`: Obtener todos los jugadores.  
- **GET** `/sportmonks/jornadas/:roundNumber`: Fixtures de una jornada.  
- **GET** `/sportmonks/jornadaActual`: Jornada en curso.  
- **GET** `/sportmonks/processRoundFantasyPoints/:roundId`: Procesar puntos fantasy.  
- **GET** `/sportmonks/seasonActual`: Obtener ID de temporada actual.  
- **GET** `/sportmonks/jornadasBySeason/:seasonId`: Jornadas de una temporada.  
- **GET** `/sportmonks/teams`: Equipos de la temporada actual.  
- **GET** `/partidos/stats/:fixtureId`: Estadísticas completas de un partido.

### Otras Rutas 🔗

- **Administración de Usuarios** (`/api/v1/admin`)  
  - **GET** `/users`  
  - **GET** `/user/:userId`  
  - **PUT** `/update-user/:userId`  
  - **DELETE** `/delete-user/:userId`  

- **Gestión de Perfil y Usuarios** (`/api/v1/user`)  
  - **POST** `/upload-image`  
  - **GET** `/get-image/:userId?`  
  - **PUT** `/update-username`  
  - **PUT** `/update-birthDate`  
  - **PUT** `/update-password`  
  - **GET** `/leagues`  
  - **POST** `/forgot-password`  
  - **GET** `/me`  
  - **GET** `/notifications`  
  - **POST** `/fcm-token`  
  - **GET** `/fcm-token/:id`  

- **Formularios de Contacto** (`/api/v1/contactForm`)  
  - **POST** `/create`  
  - **GET** `/getAll`  
  - **PUT** `/update/:id`  

- **Draft Semanal** (`/api/v1/draft`)  
  - **POST** `/create`: Crea o devuelve el borrador de draft para la próxima jornada.  
  - **PUT** `/update/:ligaId`: Actualiza las opciones del borrador antes de finalizarlo.  
  - **POST** `/saveDraft`: Guarda la selección final y marca el draft como finalizado.  
  - **GET** `/getuserDraft`: Obtiene la plantilla final y los jugadores seleccionados (query params: `ligaId`, `userId?`).  
  - **GET** `/tempDraft/:ligaId`: Recupera el borrador editable de la liga correspondiente.  


> **Nota:** Algunos endpoints requieren autenticación. Asegúrate de enviar el token correspondiente en la cabecera de la solicitud.

## Estructura del Proyecto 🗂️
---------------------------

La estructura del proyecto se organiza en módulos y carpetas para mantener un código limpio y escalable:

```
/src
  ├── api
  │   ├── config           # Configuración HTTP, códigos de estado
  │   ├── controllers      # Controladores de lógica de negocio
  │   ├── middlewares      # Validación, autenticación, manejo de errores
  │   ├── models           # Esquemas Joi y modelos de datos
  │   ├── routers          # Rutas y endpoints de la API
  │   └── services         # Lógica de orquestación y acceso a datos
  ├── config               # Carga de .env, configuración de bases de datos y otros ajustes
  ├── constants            # Valores fijos (cron schedules, salt rounds, etc.)
  ├── models               # Modelos TypeScript y definiciones de esquemas SQL
  ├── services             # Lógica de negocio reutilizable
  ├── types                # Interfaces y tipos globales de TypeScript
  ├── cron                 # Tareas programadas con node-cron
  ├── index.ts             # Punto de entrada de la aplicación
  ├── app.test.ts          # Tests de integración / e2e
  └── loadEnvironment.ts   # Carga y validación de variables de entorno


```


## Licencia 📄
-----------

MIT License

Copyright (c) 2025 Albert Garrido - Joan Linares

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Autores 👥
----------

- [@Albert Garrido](https://github.com/albertgarrido4)
- [@Joan Linares](https://github.com/JoanLinares)
