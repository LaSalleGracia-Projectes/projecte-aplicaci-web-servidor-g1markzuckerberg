import './loadEnvironment.js';
import { type Request, type Response, type NextFunction } from 'express';
import express, { type Express } from 'express';
import { createMongoConnection, createPostgresConnection } from './config/db.js';
import apiRouter from './api/index.js';
import 'dotenv/config.js';
import { startJornadaCronJob } from './api/controllers/jornadaCronCrontoller.js';

// Inicializar Express
const app: Express = express();
const port = process.env.HOST_PORT ?? '3000';

// Función para iniciar la aplicación
const startServer = async () => {
  try {
    console.log('🔄 Connecting to databases...');

    // Conectar a MongoDB y PostgreSQL (Supabase)
    await createMongoConnection();
    const sql = await createPostgresConnection();

    console.log('🚀 All databases connected successfully!');

    // Middleware CORS
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Rutas de la API
    app.use('/api/v1', apiRouter);

    // Iniciar servidor
    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
      startJornadaCronJob();
    });

    // Exportar la conexión de Supabase
    return sql;
  } catch (error) {
    console.error('❌ ERROR initializing database connections:', error);
  }
};

// Iniciar el servidor
startServer().catch((error) => {
  console.error('❌ ERROR starting server:', error);
});

// Exportar la app para pruebas u otros usos
export default app;
