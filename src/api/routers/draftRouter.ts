import { Router } from "express";
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { createDraftController, getDraftController, updateDraftController, saveDraftController } from "../controllers/draftController.js";

const draftRouter = Router();

// Ejemplo: POST /draft/create con body
draftRouter.post("/create", authMiddleware, createDraftController);

// Ejemplo: PUT /draft/update con body
draftRouter.put("/update", authMiddleware, updateDraftController);

// Ejemplo: POST /draft/saveDraft
draftRouter.post("/saveDraft", authMiddleware, saveDraftController);

// Ejemplo: GET /draft/getuserDraft?roundName=24
draftRouter.get("/getuserDraft", authMiddleware, getDraftController);

export default draftRouter;