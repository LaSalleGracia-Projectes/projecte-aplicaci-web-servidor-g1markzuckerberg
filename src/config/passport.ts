/* eslint-disable @typescript-eslint/naming-convention */
// Configuración de la estrategia de Google OAuth con Passport
import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { findUserByEmail, createUserService } from '../services/userService.js';
import type UserI from '../types/UserI.js';

// Estrategia para Web (React)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: '/api/v1/auth/google/web/callback'
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> => {
      try {
        const correo = profile.emails?.[0]?.value;
        const username = profile.displayName;
        const googleId = profile.id;

        if (!correo) {
          done(new Error('No email found from Google'));
          return;
        }

        let user: UserI | undefined = await findUserByEmail(correo);

        if (!user) {
          const newUser: UserI = {
            correo,
            username,
            google_id: googleId
          };
          user = await createUserService(newUser);
        }

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

// Estrategia para Móvil (Android Studio)
// Se utiliza el clientID específico para la app móvil (GOOGLE_CLIENT_MOBILE_ID).
// Nota: En aplicaciones móviles se recomienda utilizar el flujo PKCE para no exponer el client secret.
// En este ejemplo reutilizamos el secret de web para simplificar.
passport.use(
  'google-mobile',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_MOBILE_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: '/api/v1/auth/google/mobile/callback'
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> => {
      try {
        const correo = profile.emails?.[0]?.value;
        const username = profile.displayName;
        const googleId = profile.id;

        if (!correo) {
          done(new Error('No email found from Google'));
          return;
        }

        let user: UserI | undefined = await findUserByEmail(correo);

        if (!user) {
          const newUser: UserI = {
            correo,
            username,
            google_id: googleId
          };
          user = await createUserService(newUser);
        }

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

export default passport;
