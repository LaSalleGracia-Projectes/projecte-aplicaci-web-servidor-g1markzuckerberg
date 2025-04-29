import './loadEnvironment.js';
import { type Request, type Response, type NextFunction } from 'express';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createMongoConnection, createPostgresConnection } from './config/db.js';
import apiRouter from './api/index.js';
import 'dotenv/config.js';
import { startJornadaCronJob } from './api/controllers/jornadaCronCrontoller.js';
import passport from 'passport';
import './config/passport.js';

// Inicializar Express
const app: Express = express();
const port = process.env.HOST_PORT ?? '3000';

const startServer = async () => {
  try {
    console.log('🔄 Connecting to databases...');

    await createMongoConnection();
    const sql = await createPostgresConnection();

    console.log('🚀 All databases connected successfully!');

    // CORS middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    app.use(passport.initialize());

    // API routes
    app.use('/api/v1', apiRouter);

    // Crear servidor HTTP
    const httpServer = createServer(app);

    // Configurar Socket.IO
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      const { userId } = socket.handshake.query;
      const userIdStr: string = Array.isArray(userId) ? userId[0] : (userId ?? "");
      console.log(`✅ Socket conectado: ${socket.id} (userId=${userIdStr})`);
      socket.on('join', (room: unknown) => {
        const roomStr = room as string;
        if (roomStr === `user_${userIdStr}`) {
          void socket.join(roomStr);
          console.log(`🔔 Usuario ${userIdStr} unido a la sala: ${roomStr}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`❌ Socket desconectado: ${socket.id}`);
      });
    });

    // Hacer io accesible desde controllers
    app.locals.io = io;

    // Iniciar el servidor HTTP
    httpServer.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
      // AstartJornadaCronJob();
    });

    return sql;
  } catch (error) {
    console.error('❌ ERROR initializing database connections:', error);
  }
};

startServer().catch((error) => {
  console.error('❌ ERROR starting server:', error);
});

export default app;
