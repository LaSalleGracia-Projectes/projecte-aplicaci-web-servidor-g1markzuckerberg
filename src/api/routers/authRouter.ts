import { Router } from 'express';
import { register } from '../controllers/authController.js';
import validate from '../middlewares/joiValidation.js';
import { registerSchema} from '../models/Joi/authSchemas.js';

const authRouter = Router();

authRouter.post('/signup',
  validate(registerSchema, 'body'),
  register
);

export default authRouter;