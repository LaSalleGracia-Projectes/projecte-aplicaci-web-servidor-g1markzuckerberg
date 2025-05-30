import { Router } from 'express';
import authMiddleware from '../../../api/middlewares/authMiddleware.js';
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
  authMiddleware,
  getAllNewPlayersController
);

// Obtener un jugador por ID
newPlayerRouter.get(
  '/:id',
  authMiddleware,
  getNewPlayerByIdController
);

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
  authMiddleware,
  deleteNewPlayerController
);

export default newPlayerRouter;