import { Router } from 'express';
import { upload } from '../../api/middlewares/multerMiddleware.js';
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { uploadUserImageController, updateBirthDateController, updatePasswordController,
  updateUsernameController, getUserLeagues, getUserImageController, forgotPasswordController,
  getMyUserController } from '../../api/controllers/userController.js';
import validate from '../middlewares/joiValidation.js';
import { updateBirthDateSchema, updatePwdSchema, updateUsernameSchema } from '../models/Joi/userSchemas.js';

const userRouter = Router();

// Ruta para subir la imagen de usuario
userRouter.post('/upload-image', authMiddleware, upload.single('image'), uploadUserImageController);
// Ruta para obtener la imagen de usuario
userRouter.get('/get-image/:userId?', authMiddleware, getUserImageController);
// Ruta para actualizar el username del usuario
userRouter.put('/update-username', authMiddleware, validate(updateUsernameSchema, 'body'), updateUsernameController);
// Ruta para actualizar la fecha de nacimiento del usuario
userRouter.put('/update-birthDate', authMiddleware, validate(updateBirthDateSchema, 'body'), updateBirthDateController);
// Ruta para actualizar la contraseña del usuario
userRouter.put('/update-password', authMiddleware, validate(updatePwdSchema, 'body'), updatePasswordController);
userRouter.get('/leagues', authMiddleware, getUserLeagues);
userRouter.post('/forgot-password', forgotPasswordController);

userRouter.get('/me', authMiddleware, getMyUserController);


export default userRouter;