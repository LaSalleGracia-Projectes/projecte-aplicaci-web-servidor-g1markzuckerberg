import { Router } from 'express';
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { adminUpdateUserController, adminGetAllUsersController, adminGetUserByIdController,
  adminDeleteUserController } from '../../api/controllers/adminController.js';
import validate from '../middlewares/joiValidation.js';
import { updateUserByAdminSchema } from '../models/Joi/adminSchemas.js';

const adminRouter = Router();

adminRouter.get('/users', authMiddleware, adminGetAllUsersController);

adminRouter.get('/user/:userId', authMiddleware, adminGetUserByIdController);

adminRouter.put('/update-user/:userId', authMiddleware, validate(updateUserByAdminSchema, 'body'), adminUpdateUserController);

adminRouter.delete('/delete-user/:userId', authMiddleware, adminDeleteUserController);

export default adminRouter;