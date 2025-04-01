// Configuración de la estrategia de Google OAuth con Passport
import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback
} from 'passport-google-oauth20';
import { findUserByEmail, createUserService } from '../services/userService.js';
import type UserI from '../types/UserI.js';

passport.use(
  new GoogleStrategy(
    {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      callbackURL: '/api/v1/auth/google/web/callback'
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ): Promise<void> => {
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
            // eslint-disable-next-line @typescript-eslint/naming-convention
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
