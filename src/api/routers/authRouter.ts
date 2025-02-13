import { Router } from 'express';
import { getUser, register } from '../controllers/authController.js';
import { registerSchema } from '../models/Joi/authSchemas.js';
import validate from '../middlewares/joiValidation.js';

const authRouter = Router();

authRouter.get('/user/:correo', getUser);
authRouter.post('/signup', validate(registerSchema, 'body'), register);

export default authRouter;
