* * * * *

Fantasy Draft: El Fantasy Fútbol con Draft Semanal ⚽🏆
==================================================

Fantasy Draft es una innovadora plataforma de Fantasy Fútbol con un sistema de draft semanal, donde los participantes seleccionan sus futbolistas de cada jornada de manera dinámica. Inspirado en el formato FutDraft, este proyecto busca ofrecer una experiencia única, flexible y realista, permitiendo que los usuarios creen su plantilla semanalmente y compitan según el rendimiento real de los jugadores.

Tabla de Contenidos 📚
-------------------

-   Descripción del Proyecto ✨
-   Características ⭐
-   Arquitectura y Tecnologías 🛠️
-   Instalación y Configuración 🚀
-   Variables de Entorno ⚙️
-   Ejecución del Servidor 🔥
-   Documentación de la API 📡
-   Estructura del Proyecto 🗂️
-   Contribuciones 🤝
-   Licencia 📄
-   Autores 👥

Descripción del Proyecto 📝
------------------------

**Fantasy Draft** es un juego en el que los participantes crean y gestionan su equipo basándose en el rendimiento real de los futbolistas. En nuestro sistema, en lugar de tener un equipo fijo durante toda la temporada, cada jornada se inicia con un draft dinámico en el que los usuarios eligen jugadores disponibles según su estado de forma y rendimiento.

Además, el sistema define dos roles principales dentro de una liga:

-   **Fundador:** Quien crea la liga y tiene permisos para gestionar a los usuarios.
-   **Miembro:** Participante que se une a la liga y compite en los drafts semanales.

La aplicación está pensada para ser multiplataforma, manteniendo una única cuenta para el usuario tanto en la web como en la aplicación móvil.

Características 🎯
---------------

-   **Draft Dinámico Semanal:** Cada jornada se genera un nuevo draft con todos los jugadores disponibles. ⚡
-   **Puntuación Realista:** Los puntos de cada jugador se calculan en función de su rendimiento real en partidos (goles, asistencias, paradas, etc.) y bonificaciones (como clean sheets). 📊
-   **Roles Diferenciados:** Distinción entre fundador (creador de la liga) y miembros. 👥
-   **Multiplataforma:** Cuenta única para acceso desde web y móvil. 📱💻
-   **Integración con API Externa:** Uso de la API de Sportmonks para obtener datos en tiempo real de partidos, estadísticas y jugadores. 🌐
-   **Cron Jobs:** Automatización de tareas, como la actualización de la jornada actual. ⏰
-   **Base de Datos Híbrida:** Conexión con MongoDB para ciertos modelos y PostgreSQL (Supabase) para otros servicios. 💾

Arquitectura y Tecnologías 🖥️
--------------------------

-   **Backend:** Node.js con Express. 🚀
-   **Validación:** Uso de Joi para la validación de esquemas. ✅
-   **Autenticación:** Endpoints para registro e inicio de sesión (tanto para web como para móvil) con generación y renovación de tokens. 🔐
-   **APIs Externas:** Integración con Sportmonks para obtener información de partidos y jugadores. 📡
-   **Bases de Datos:**
    -   **MongoDB:** Para almacenamiento de ciertos datos. 🗄️
    -   **PostgreSQL (Supabase):** Para la gestión de usuarios, ligas, jornadas y relaciones. 🗄️
-   **Cron Jobs:** Para la actualización automática de jornadas mediante `startJornadaCronJob`. ⏱️

Instalación y Configuración 🔧
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

Variables de Entorno ⚙️
--------------------

-   **HOST_PORT:** Puerto en el que se ejecutará el servidor (por defecto: 3000). 🔌
-   **API_TOKEN:** Token de la API de Sportmonks para realizar consultas. 🔑
-   **MONGO_URI:** URI de conexión a tu base de datos MongoDB. 🌐
-   **POSTGRES_URI:** URI de conexión a tu base de datos PostgreSQL (o Supabase). 🌐

Ejecución del Servidor 🚀
----------------------

Para iniciar el servidor, utiliza el siguiente comando:
```bash
npm run start

```

El servidor se conectará a MongoDB y PostgreSQL, y arrancará en `http://localhost:3000`. Se iniciará también el cron job para actualizar la jornada actual. 🔥

Documentación de la API 📡
--------------------------

La API se estructura en rutas agrupadas por funcionalidad. Algunos de los endpoints principales son:

### Autenticación (`/api/v1/auth`) 🔒

-   **POST `/signup`**: Registro de usuario (web).
-   **POST `/signupMobile`**: Registro de usuario (móvil).
-   **POST `/login`**: Inicio de sesión (web).
-   **POST `/loginMobile`**: Inicio de sesión (móvil).
-   **POST `/logout`**: Cierre de sesión (web).
-   **POST `/logoutMobile`**: Cierre de sesión (móvil).
-   **PUT `/regenerate`**: Renovación del token web.
-   **GET `/user/:correo`**: Obtener usuario por correo.
-   **DELETE `/user/delete`**: Eliminar cuenta de usuario por correo.

### Ligas (`/api/v1/liga`) 🏆

-   **POST `/create`**: Crear una nueva liga (requiere autenticación).
-   **POST `/join/:ligaCode`**: Unirse a una liga usando un código.
-   **GET `/users/:ligaCode`**: Obtener los usuarios de una liga (opcionalmente por jornada).

### Información de Fútbol y Partidos (`/api/v1/sportmonks` y `/api/v1/partidos`) ⚽

-   **GET `/allPlayers`**: Obtener todos los jugadores.
-   **GET `/jornadas/:roundNumber`**: Obtener partidos (fixtures) de una jornada específica.
-   **GET `/jornadaActual`**: Obtener la jornada actual.
-   **GET `/processRoundFantasyPoints/:roundId`**: Procesar puntos fantasy de una jornada.
-   **GET `/seasonActual`**: Obtener la temporada actual.
-   **GET `/jornadasBySeason/:seasonId`**: Obtener jornadas de una temporada.
-   **GET `/stats/:fixtureId`**: Obtener estadísticas completas de un partido.

### Otras Rutas 🔗

Se incluyen rutas y servicios para el manejo de usuarios, ligas, jornadas y conexión con bases de datos, entre otros.

> **Nota:** Algunos endpoints requieren autenticación. Asegúrate de enviar el token correspondiente en la cabecera de la solicitud.

Estructura del Proyecto 🗂️
---------------------------

La estructura del proyecto se organiza en módulos y carpetas para mantener un código limpio y escalable:

```
/src
  ├── api
  │     ├── controllers      # Controladores de lógica de negocio
  │     ├── middlewares      # Middlewares de validación, autenticación, etc.
  │     ├── models           # Esquemas y validaciones (ej. Joi)
  │     ├── routers          # Rutas y endpoints de la API
  │     └── services         # Conexión y operaciones con bases de datos
  ├── config                 # Configuración de la conexión a bases de datos y otros ajustes
  ├── types                  # Definiciones de tipos y modelos (TypeScript)
  └── loadEnvironment.js     # Carga de variables de entorno y configuraciones iniciales

```

Contribuciones 🤝
-----------------

¡Las contribuciones son bienvenidas! Si deseas colaborar con el proyecto, por favor sigue estos pasos:

1.  Haz un fork del repositorio.
2.  Crea una rama para tu feature o corrección (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza los cambios y haz commit (`git commit -m 'Agrega nueva funcionalidad'`).
4.  Sube la rama (`git push origin feature/nueva-funcionalidad`).
5.  Abre un Pull Request.

Licencia 📄
-----------

Este proyecto se distribuye bajo la licencia MIT.

Autores 👥
----------

-   **Albert Garrido**
-   **Joan Linares**
