import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getAllPlayersFromTeams } from '../services/PlayerService.js';
import authRouter from './routers/authRouter.js';


const apiRouter = Router();

// Per obtenir el body en format json
apiRouter.use(express.json());
// Agregar rutas de autenticación
apiRouter.use('/auth', authRouter);

// NUEVA RUTA: GET /api/v1/players
apiRouter.get("/players", async (req: Request, res: Response) => {
    try {
        const players = await getAllPlayersFromTeams();
        return res.status(200).json(players);
    } catch (error) {
        console.error("Error al obtener jugadores:", error);
        return res.status(500).json({ error: "Ocurrió un error al obtener los jugadores" });
    }
});


export default apiRouter;