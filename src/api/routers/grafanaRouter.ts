import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { fetchGrafanaImage, fetchGrafanaImageUser } from "../../services/grafanaService.js";

const grafanaRouter = Router();

grafanaRouter.get(
  "/grafico/:playerId",
  async (req: Request, res: Response, next: NextFunction) => {
    const { playerId } = req.params;

    if (!playerId) {
      res.status(400).json({ error: "Falta parámetro playerId" });
      return;
    }

    try {
      const grafanaResp = await fetchGrafanaImage(playerId);
      res.setHeader("Content-Type", "image/png");
      (grafanaResp.data as NodeJS.ReadableStream).pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

grafanaRouter.get(
  "/graficoUser/:ligaId/:usuarioId",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ligaId, usuarioId } = req.params;

    if (!ligaId || !usuarioId) {
      res.status(400).json({ error: "Faltan parámetros ligaId o usuarioId" });
      return;
    }

    try {
      const grafanaResp = await fetchGrafanaImageUser(ligaId, usuarioId);
      res.setHeader("Content-Type", "image/png");
      (grafanaResp.data as NodeJS.ReadableStream).pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

export default grafanaRouter;