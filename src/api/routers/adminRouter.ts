import { Router } from 'express';
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { adminUpdateUserController, adminGetAllUsersController, adminGetUserByIdController } from '../../api/controllers/adminController.js';
import validate from '../middlewares/joiValidation.js';
import { updateUserByAdminSchema } from '../models/Joi/adminSchemas.js';

const adminRouter = Router();

// Ruta para obtener la lista completa de usuarios (para el listado con paginación en el frontend)
adminRouter.get('/users', authMiddleware, adminGetAllUsersController);

// Ruta para obtener los datos prellenados del usuario (solo los campos editables) al hacer clic para editar
adminRouter.get('/user/:userId', authMiddleware, adminGetUserByIdController);

// Ruta para actualizar el usuario (solo se modifican los campos que hayan cambiado)
adminRouter.put('/update-user/:userId', authMiddleware, validate(updateUserByAdminSchema, 'body'), adminUpdateUserController);
export default adminRouter;