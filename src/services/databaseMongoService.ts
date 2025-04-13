import { type Document } from 'mongoose';
import type ContactForm from '../types/ContactFormMongo.js';
import type UserI from '../types/UserI.js';
import contactFormModel from '../models/ContactFormSchema.js';

/**
 * Crea un nuevo formulario de contacto.
 * Esta operación es pública, ya que el correo se obtiene desde res.locals y el usuario ingresa el mensaje.
 *
 * @param correo - Correo del usuario, obtenido de res.locals.
 * @param mensaje - Mensaje escrito por el usuario.
 * @returns El formulario de contacto guardado en la base de datos.
 */
const createContactForm = async (
  correo: string,
  mensaje: string
): Promise<ContactForm & Document> => {
  try {
    // eslint-disable-next-line new-cap
    const newContactForm = new contactFormModel({
      correo,
      mensaje,
      resolved: false
    });
    return await newContactForm.save();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Obtiene todos los formularios de contacto.
 * Esta operación solo puede realizarse por un usuario administrador.
 *
 * @param user - Objeto usuario obtenido de res.locals (debe tener is_admin true).
 * @returns Lista de formularios de contacto ordenados desde el más reciente al más antiguo.
 */
const getAllContactForms = async (
  user: UserI
): Promise<Array<ContactForm & Document>> => {
  if (!user.is_admin) {
    throw new Error('No autorizado: Solo administradores pueden obtener todos los formularios.');
  }

  try {
    return await contactFormModel.find({}).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Actualiza el campo "resolved" de un formulario de contacto.
 * Esta operación solo puede realizarla un administrador y únicamente se permite actualizar el campo "resolved".
 *
 * @param user - Objeto usuario obtenido de res.locals (debe tener is_admin true).
 * @param id - Identificador del formulario a actualizar.
 * @param updateData - Objeto con el campo "resolved" a actualizar (ejemplo: { resolved: true }).
 * @returns El formulario de contacto actualizado o null en caso de no encontrarlo.
 */
const updateContactForm = async (
  user: UserI,
  id: string,
  updateData: Partial<ContactForm>
): Promise<(ContactForm & Document) | undefined> => {
  if (!user.is_admin) {
    throw new Error('No autorizado: Solo administradores pueden actualizar formularios.');
  }

  // Validar que únicamente se actualice el campo "resolved"
  const allowedKeys = ['resolved'];
  const updateKeys = Object.keys(updateData);
  if (updateKeys.length === 0) {
    throw new Error('Debe incluir al menos el campo "resolved" para actualizar.');
  }

  const invalidKeys = updateKeys.filter(key => !allowedKeys.includes(key));
  if (invalidKeys.length > 0) {
    throw new Error('Solo se permite actualizar el campo "resolved".');
  }

  try {
    const updatedForm = await contactFormModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    return updatedForm ?? undefined;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

export { createContactForm, getAllContactForms, updateContactForm };