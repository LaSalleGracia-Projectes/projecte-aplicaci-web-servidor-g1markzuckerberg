import { Router } from "express";
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { createDraftController, getDraftController, updateDraftController,
  saveDraftController, getTempDraftController } from "../controllers/draftController.js";

const draftRouter = Router();

// Ejemplo: POST /draft/create con body
draftRouter.post("/create", authMiddleware, createDraftController);

// Ejemplo: PUT /draft/update/:ligaId con body
draftRouter.put("/update/:ligaId", authMiddleware, updateDraftController);

// Ejemplo: POST /draft/saveDraft
draftRouter.post("/saveDraft", authMiddleware, saveDraftController);

// Ejemplo: GET /draft/getuserDraft?ligaId=123&roundName=24
draftRouter.get("/getuserDraft", authMiddleware, getDraftController);

// Ejemplo: GET /draft/tempDraft/:ligaId
draftRouter.get("/tempDraft/:ligaId", authMiddleware, getTempDraftController);

export default draftRouter;