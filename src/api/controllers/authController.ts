import { type Request, type Response, type NextFunction } from 'express';
import { findUserByEmail, createUserService, updateUserTokens } from '../../services/userService.js';
import type UserI from '../../types/UserI.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import httpStatus from '../config/httpStatusCodes.js';
import { OAuth2Client } from 'google-auth-library';

// Expiración de tokens
const webTokenExpiration = '1h';
const mobileTokenExpiration = '365d';
const refreshWebTokenExpiration = '7d';

const generateToken = (user: UserI, expiresIn: string) => 
  jwt.sign(
    { id: user.id, correo: user.correo, isAdmin: user.is_admin },
    process.env.JWT_SECRET_KEY ?? 'secret',
    { expiresIn }
  );

const registerWeb = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, correo, password } = req.body as { username: string; correo: string; password: string };
    const existingUser = await findUserByEmail(correo);
    if (existingUser) {
      return res.status(httpStatus.badRequest).send({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: UserI = { username, correo, password: hashedPassword };
    const userCreated = await createUserService(user);
    if (!userCreated) {
      return res.status(httpStatus.internalServerError).send({ error: 'User could not be created' });
    }

    // Generar tokens para web: webToken y refreshToken
    const webToken = generateToken(userCreated, webTokenExpiration);
    const refreshWebToken = generateToken(userCreated, refreshWebTokenExpiration);
    await updateUserTokens(userCreated.id!, { webToken, refreshWebToken });

    res.status(httpStatus.created).send({
      user: { id: userCreated.id, username, correo },
      tokens: { webToken, refreshWebToken }
    });
  } catch (error) {
    next(error);
  }
};

const registerMobile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, correo, password } = req.body as { username: string; correo: string; password: string };
    const existingUser = await findUserByEmail(correo);
    if (existingUser) {
      return res.status(httpStatus.badRequest).send({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: UserI = { username, correo, password: hashedPassword };
    const userCreated = await createUserService(user);
    if (!userCreated) {
      return res.status(httpStatus.internalServerError).send({ error: 'User could not be created' });
    }

    // Generar token para móvil (no se utiliza refresh)
    const mobileToken = generateToken(userCreated, mobileTokenExpiration);
    await updateUserTokens(userCreated.id!, { mobileToken });

    res.status(httpStatus.created).send({
      user: { id: userCreated.id, username, correo },
      tokens: { mobileToken }
    });
  } catch (error) {
    next(error);
  }
};

const loginWeb = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo, password } = req.body as { correo: string; password: string };
    const user = await findUserByEmail(correo);
    if (!user || !(await bcrypt.compare(password, user.password!))) {
      return res.status(httpStatus.unauthorized).send({ error: 'Invalid credentials' });
    }

    // Generar nuevos tokens para web: webToken y refreshToken
    const webToken = generateToken(user, webTokenExpiration);
    const refreshWebToken = generateToken(user, refreshWebTokenExpiration);
    await updateUserTokens(user.id!, { webToken, refreshWebToken });

    res.status(httpStatus.ok).send({ tokens: { webToken, refreshWebToken } });
  } catch (error) {
    next(error);
  }
};

const loginMobile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo, password } = req.body as { correo: string; password: string };
    const user = await findUserByEmail(correo);
    if (!user || !(await bcrypt.compare(password, user.password!))) {
      return res.status(httpStatus.unauthorized).send({ error: 'Invalid credentials' });
    }

    // Generar token para móvil
    const mobileToken = generateToken(user, mobileTokenExpiration);
    await updateUserTokens(user.id!, { mobileToken });

    res.status(httpStatus.ok).send({ tokens: { mobileToken } });
  } catch (error) {
    next(error);
  }
};

const logoutWeb = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Se asume que el usuario autenticado se encuentra en res.locals.user (configurado por un middleware)
    const userId = (res.locals.user as UserI).id;
    await updateUserTokens(userId!, { webToken: undefined, refreshWebToken: undefined });
    res.status(httpStatus.ok).send({ message: 'Web session closed successfully' });
  } catch (error) {
    next(error);
  }
};

const logoutMobile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (res.locals.user as UserI).id;
    await updateUserTokens(userId!, { mobileToken: undefined });
    res.status(httpStatus.ok).send({ message: 'Mobile session closed successfully' });
  } catch (error) {
    next(error);
  }
};

const regenerateWebToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obtener el token desde el header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(httpStatus.badRequest).send({ error: 'Refresh token is required in Authorization header' });
    }

    const refreshToken = authHeader.split(' ')[1]; // Extraer solo el token

    jwt.verify(refreshToken, process.env.JWT_SECRET_KEY ?? 'secret', async (err, decoded: any) => {
      if (err) {
        return res.status(httpStatus.unauthorized).send({ error: 'Invalid refresh token' });
      }

      const decodedToken = decoded as { correo: string };
      const user = await findUserByEmail(decodedToken.correo);

      if (!user) {
        return res.status(httpStatus.notFound).send({ error: 'User not found' });
      }

      // Generar nuevo webToken y actualizarlo en la BD
      const newWebToken = generateToken(user, webTokenExpiration);
      await updateUserTokens(user.id!, { webToken: newWebToken });

      res.status(httpStatus.ok).send({ tokens: { webToken: newWebToken } });
    });
  } catch (error) {
    next(error);
  }
};

const googleWebCallback = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as UserI | undefined;
  const jwtSecret = process.env.JWT_SECRET_KEY;

  if (!user?.id || !user.correo || !jwtSecret) {
    res.redirect('/login');
    return;
  }

  const webToken = jwt.sign({ id: user.id, correo: user.correo, isAdmin: user.is_admin }, jwtSecret, { expiresIn: '1h' });
  const refreshWebToken = jwt.sign({ id: user.id, correo: user.correo, isAdmin: user.is_admin }, jwtSecret, { expiresIn: '7d' });

  await updateUserTokens(user.id, { webToken, refreshWebToken });

  res.redirect(`http://localhost:3000?webToken=${webToken}&refreshWebToken=${refreshWebToken}`);
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleMobileCallBack = async (req: Request, res: Response): Promise<Response | void> => {
  const { idToken } = req.body as { idToken: string };

  console.log('[BACKEND] Recibido idToken:', (idToken?.slice(0, 20) ?? '') + '...');

  if (!idToken) {
    console.warn('[BACKEND] ❌ Falta el idToken en la petición');
    return res.status(400).json({ error: 'Falta el idToken' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('[BACKEND] Payload del token:', payload);

    if (!payload?.email) {
      console.warn('[BACKEND] ❌ Token inválido (sin email)');
      return res.status(401).json({ error: 'Token inválido' });
    }

    const correo = payload.email;
    const username = payload.name ?? '';
    const googleId = payload.sub;

    console.log(`[BACKEND] Usuario identificado: ${correo} (${username})`);

    let user: UserI | undefined = await findUserByEmail(correo);

    if (user) {
      console.log('[BACKEND] Usuario existente encontrado.');
    } else {
      console.log('[BACKEND] Usuario no existe, creando nuevo...');
      const newUser: UserI = {
        correo,
        username,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        google_id: googleId
      };
      user = await createUserService(newUser);
    }

    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      console.error('[BACKEND] ❌ No hay JWT_SECRET_KEY');
      return res.status(500).json({ error: 'No hay JWT_SECRET_KEY' });
    }

    const mobileToken = jwt.sign(
      { id: user.id, correo: user.correo, isAdmin: user.is_admin },
      jwtSecret,
      { expiresIn: '365d' }
    );

    console.log('[BACKEND] Token generado correctamente, actualizando base de datos...');
    await updateUserTokens(user.id!, { mobileToken });

    console.log('[BACKEND] ✅ Login completado con éxito para:', correo);
    res.json({ mobileToken });
  } catch (error) {
    console.error('[BACKEND] ❌ Error verificando idToken de Google:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

export {
  registerWeb,
  registerMobile,
  loginWeb,
  loginMobile,
  logoutWeb,
  logoutMobile,
  regenerateWebToken,
  googleWebCallback,
  googleMobileCallBack

};
