import { Router } from 'express';
import { registerWeb, registerMobile, loginWeb, loginMobile, logoutWeb, logoutMobile, regenerateWebToken} from '../controllers/authController.js';
import { registerSchema } from '../models/Joi/authSchemas.js';
import validate from '../middlewares/joiValidation.js';
import { getUserByMail, deleteAccountByMail } from '../controllers/adminController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const authRouter = Router();

authRouter.get('/user/:correo', getUserByMail);
authRouter.delete('/user/delete', deleteAccountByMail);

authRouter.post('/signup', validate(registerSchema, 'body'), registerWeb);
authRouter.post('/signupMobile', registerMobile);
authRouter.post('/login', loginWeb);
authRouter.post('/loginMobile', loginMobile);
authRouter.put('/regenerate', regenerateWebToken);
authRouter.post('/logout', authMiddleware, logoutWeb);
authRouter.post('/logoutMobile', authMiddleware, logoutMobile);


export default authRouter;
