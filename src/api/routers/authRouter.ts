import { Router } from 'express';
import type { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
  registerWeb, registerMobile, loginWeb, loginMobile,
  logoutWeb, logoutMobile, regenerateWebToken, googleWebCallback, googleMobileCallback
} from '../controllers/authController.js';
import { loginSchema, registerSchema } from '../models/Joi/authSchemas.js';
import validate from '../middlewares/joiValidation.js';
import { getUserByMail, deleteAccountByMail } from '../controllers/adminController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { safePassportAuth } from '../middlewares/safePasswordAuth.js';

const authRouter = Router();
// Middleware principal
authRouter.get('/user/:correo', getUserByMail);
authRouter.delete('/user/delete', deleteAccountByMail);

authRouter.post('/signup', validate(registerSchema, 'body'), registerWeb);
authRouter.post('/signupMobile', registerMobile);
authRouter.post('/login', validate(loginSchema, 'body'), loginWeb);
authRouter.post('/loginMobile', validate(loginSchema, 'body'), loginMobile);
authRouter.put('/regenerate', regenerateWebToken);
authRouter.post('/logout', authMiddleware, logoutWeb);
authRouter.post('/logoutMobile', authMiddleware, logoutMobile);

// 🔐 Google OAuth - Web
authRouter.get('/google/web', safePassportAuth('google', { scope: ['profile', 'email'] }));
authRouter.get('/google/web/callback', safePassportAuth('google', { failureRedirect: '/login' }), googleWebCallback);

// 📱 Google OAuth - Mobile
authRouter.get('/google/mobile', safePassportAuth('google-mobile', { scope: ['profile', 'email'] }));
authRouter.get('/google/mobile/callback', safePassportAuth('google-mobile', { failureRedirect: '/login' }), googleMobileCallback);

export default authRouter;
