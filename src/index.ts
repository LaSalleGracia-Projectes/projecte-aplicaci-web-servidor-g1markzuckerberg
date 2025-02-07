import './loadEnvironment.js';
import { type Request, type Response, type NextFunction } from 'express';
import express, { type Express } from 'express';
import createConnection from './config/db.js';
import apiRouter from './api/index.js';
import 'dotenv/config.js';

// Initialize express
const app: Express = express();
const port = process.env.HOST_PORT ?? '3000';

// Connectar a la BBDD
await createConnection();

app.use((req: Request, res: Response, next: NextFunction) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

app.use('/api/v1', apiRouter);


app.listen(process.env.HOST_PORT, () => {
	console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;
