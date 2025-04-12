import { type Request, type Response, type NextFunction } from 'express';
import httpStatus from '../config/httpStatusCodes.js';
import { createContactForm, getAllContactForms, updateContactForm } from '../../services/databaseMongoService.js';

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
 * Solo se permite acceder a esta operación si el usuario es administrador.
 */
const getAllContactFormsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = res.locals as { user?: { correo?: string } };
    if (!user?.correo) {
      return res.status(httpStatus.unauthorized).json({ error: "No está autenticado" });
    }
    
    const { correo } = user;
    const contactForms = await getAllContactForms({ correo });
    return res.status(httpStatus.ok).json(contactForms);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller para actualizar el campo "resolved" de un formulario de contacto.
 * Solo se permite actualizar este campo y solo si el usuario es administrador.
 */
const updateContactFormController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = res.locals as { user?: { correo?: string } };
    if (!user?.correo) {
      return res.status(httpStatus.unauthorized).json({ error: "No está autenticado" });
    }
    
    // Se espera que el identificador del formulario venga en los parámetros de la URL.
    const { id } = req.params;
    if (!id) {
      return res.status(httpStatus.badRequest).json({ error: "Falta el identificador del formulario" });
    }
    
    // Solo se permite actualizar el campo "resolved".
    interface UpdateContactFormRequestBody {
      resolved: boolean;
    }
    const { resolved } = req.body as UpdateContactFormRequestBody;
    if (resolved === undefined) {
      return res.status(httpStatus.badRequest).json({ error: 'El campo "resolved" es requerido' });
    }
    
    const updatedForm = await updateContactForm({ correo: user.correo }, id, { resolved });
    if (!updatedForm) {
      return res.status(httpStatus.notFound).json({ error: "Formulario no encontrado" });
    }
    
    return res.status(httpStatus.ok).json(updatedForm);
  } catch (error) {
    next(error);
  }
};

export {
  createContactFormController,
  getAllContactFormsController,
  updateContactFormController
};