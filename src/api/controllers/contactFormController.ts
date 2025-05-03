import { type Request, type Response, type NextFunction } from 'express';
import httpStatus from '../config/httpStatusCodes.js';
import { createContactForm, getAllContactForms, updateContactForm} from '../../services/databaseMongoService.js';

/**
 * Controller para la creación de un formulario de contacto.
 * Se espera que el correo del usuario provenga de res.locals.user y el mensaje desde el body de la solicitud.
 */
const createContactFormController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    interface ContactFormRequestBody { mensaje: string; }
    const { mensaje } = req.body as ContactFormRequestBody;
    // Se asume que res.locals.user contiene la información del usuario autenticado.
    const { user } = res.locals as { user?: { correo?: string } };
    if (!user?.correo) {
      return res.status(httpStatus.unauthorized).json({ error: "No está autorizado" });
    }

    const { correo } = user;
    
    const newContactForm = await createContactForm(correo, mensaje);
    return res.status(httpStatus.created).json(newContactForm);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller para obtener todos los formularios de contacto.
 * Solo administradores (verificado por el servicio) pueden acceder.
 */
const getAllContactFormsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = res.locals as { user?: { id: number; correo: string; is_admin: boolean } };
    if (!user?.id) {
      return res.status(httpStatus.unauthorized).json({ error: 'No está autenticado' });
    }

    const forms = await getAllContactForms(user.id);
    return res.status(httpStatus.ok).json(forms);
  } catch (error: any) {
    if (error.message.startsWith('No autorizado')) {
      return res.status(httpStatus.unauthorized).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Controller para actualizar el campo "resolved" de un formulario de contacto.
 * Solo administradores y solo el campo "resolved".
 */
const updateContactFormController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extraemos el adminId de res.locals (inyectado por authMiddleware)
    const { user } = res.locals as { user?: { id?: number; correo?: string; is_admin?: boolean } };
    if (!user?.id) {
      return res
        .status(httpStatus.unauthorized)
        .json({ error: 'No está autenticado' });
    }

    // Validamos que nos pasen el ID del formulario
    const { id } = req.params;
    if (!id) {
      return res
        .status(httpStatus.badRequest)
        .json({ error: 'Falta el identificador del formulario' });
    }

    // Solo permitimos el campo "resolved" en el body
    interface UpdateBody {
      resolved: boolean;
    }
    const { resolved } = req.body as UpdateBody;
    if (resolved === undefined) {
      return res
        .status(httpStatus.badRequest)
        .json({ error: 'El campo "resolved" es requerido' });
    }

    // Llamada al servicio, que internamente validará is_admin en Supabase
    const updated = await updateContactForm(user.id, id, { resolved });

    if (!updated) {
      return res
        .status(httpStatus.notFound)
        .json({ error: 'Formulario no encontrado' });
    }

    return res
      .status(httpStatus.ok)
      .json(updated);

  } catch (error: any) {
    // Si el servicio lanza "No autorizado", devolvemos 403
    if (error.message.includes('No autorizado')) {
      return res
        .status(httpStatus.unauthorized)
        .json({ error: error.message });
    }
    next(error);
  }
};

export {
  createContactFormController,
  getAllContactFormsController,
  updateContactFormController
};