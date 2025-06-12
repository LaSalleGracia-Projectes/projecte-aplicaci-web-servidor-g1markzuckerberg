import { Router } from 'express';
import {
  getAllNewPlayersController,
  getNewPlayerByIdController,
  createNewPlayerController,
  updateNewPlayerController,
  deleteNewPlayerController
} from '../../controllers/NicoController/newPlayerController.js';
import {
  createNewPlayerSchema,
  updateNewPlayerSchema
} from '../../models/Joi/newPlayerSchemas.js';
import validate from '../../middlewares/joiValidation.js';

const newPlayerRouter = Router();

// Obtener todos los jugadores manuales
newPlayerRouter.get(
  '/',
  getAllNewPlayersController
);

// ===== RUTAS ESPECÍFICAS PRIMERO =====
// Crear un nuevo jugador (body: { teamName, positionId, name, imageUrl? })
newPlayerRouter.post(
  '/create',
  validate(createNewPlayerSchema, 'body'),
  createNewPlayerController
);

// Actualizar un jugador existente (body: { teamName, positionId, name, imageUrl? })
newPlayerRouter.put(
  '/update/:id',
  validate(updateNewPlayerSchema, 'body'),
  updateNewPlayerController
);

// Eliminar un jugador por ID
newPlayerRouter.delete(
  '/delete/:id',
  deleteNewPlayerController
);

// ===== RUTA CON PARÁMETRO AL FINAL =====
// Obtener un jugador por ID (IMPORTANTE: debe ir al final para evitar conflictos)
newPlayerRouter.get(
  '/:id',
  getNewPlayerByIdController
);

export default newPlayerRouter;