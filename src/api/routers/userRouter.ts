import { Router } from 'express';
import { upload } from '../../api/middlewares/multerMiddleware.js';
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { uploadUserImageController } from '../../api/controllers/userController.js';

const userRouter = Router();

// Ruta para subir la imagen de usuario
userRouter.post('/upload-image', authMiddleware, upload.single('image'), uploadUserImageController);

export default userRouter;