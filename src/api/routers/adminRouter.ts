import { Router } from 'express';
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { adminUpdateUserController } from '../../api/controllers/adminController.js';
import validate from '../middlewares/joiValidation.js';
import { updateUserByAdminSchema } from '../models/Joi/adminSchemas.js';

const adminRouter = Router();

// Ruta para actualizar el username del usuario
adminRouter.put('/update-user/:userId', authMiddleware, validate(updateUserByAdminSchema, 'body'), adminUpdateUserController);

export default adminRouter;