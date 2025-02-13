import { Router } from 'express';
import { registerWeb, registerMobile, loginWeb, loginMobile, logoutWeb, regenerateWebToken} from '../controllers/authController.js';
import { registerSchema } from '../models/Joi/authSchemas.js';
import validate from '../middlewares/joiValidation.js';
import { getUserByMail } from '../controllers/adminController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const authRouter = Router();

authRouter.get('/user/:correo', getUserByMail);
authRouter.post('/signup', validate(registerSchema, 'body'), registerWeb);
authRouter.post('/login', loginWeb);
authRouter.post('/loginMobile', loginMobile);
authRouter.post('/regenerate', regenerateWebToken);
authRouter.post('/logout', authMiddleware, logoutWeb);

authRouter.put('/signupMobile', registerMobile);


export default authRouter;
