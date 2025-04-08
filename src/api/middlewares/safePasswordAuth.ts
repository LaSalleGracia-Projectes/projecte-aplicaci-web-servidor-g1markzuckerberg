import passport from 'passport';
import type { AuthenticateOptions } from 'passport';
import type { RequestHandler } from 'express';

export const safePassportAuth = (
  strategy: string,
  options: AuthenticateOptions
): RequestHandler => passport.authenticate(strategy, options) as RequestHandler;
