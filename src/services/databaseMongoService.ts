import { type Document } from 'mongoose';
import type ContactForm from '../types/ContactFormMongo.js';
import type UserI from '../types/UserI.js';
import contactFormModel from '../models/ContactFormSchema.js';
import { sql } from './supabaseService.js';
import { userTable } from '../models/User.js';

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
 * Solo administradores (verificado en Supabase) pueden llamarlo.
 *
 * @param adminId - ID del usuario que hace la petición (de res.locals).
 */
const getAllContactForms = async (
  adminId: number
): Promise<Array<ContactForm & Document>> => {
  // Verificar en Supabase si es admin
  const [admin] = await sql<Array<{ is_admin: boolean }>>`
    SELECT is_admin
    FROM ${sql(userTable)}
    WHERE id = ${adminId}
    LIMIT 1;
  `;
  if (!admin || !admin.is_admin) {
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
 * Solo administradores (verificado en Supabase) y solo el campo "resolved".
 *
 * @param adminId - ID del usuario que hace la petición (de res.locals).
 * @param id - ID del formulario de contacto en Mongo.
 * @param updateData - { resolved: boolean }.
 */
const updateContactForm = async (
  adminId: number,
  id: string,
  updateData: Partial<ContactForm>
): Promise<(ContactForm & Document) | undefined> => {
  // Verificar en Supabase si es admin
  const [admin] = await sql<Array<{ is_admin: boolean }>>`
    SELECT is_admin
    FROM ${sql(userTable)}
    WHERE id = ${adminId}
    LIMIT 1;
  `;
  if (!admin || !admin.is_admin) {
    throw new Error('No autorizado: Solo administradores pueden actualizar formularios.');
  }

  // Validar que solo venga "resolved"
  const allowedKeys = ['resolved'];
  const updateKeys = Object.keys(updateData);
  if (updateKeys.length === 0) {
    throw new Error('Debe incluir al menos el campo "resolved" para actualizar.');
  }

  const invalid = updateKeys.filter(k => !allowedKeys.includes(k));
  if (invalid.length > 0) {
    throw new Error('Solo se permite actualizar el campo "resolved".');
  }

  try {
    const updated = await contactFormModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    return updated ?? undefined;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

export { createContactForm, getAllContactForms, updateContactForm };