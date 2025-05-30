import { type Document } from 'mongoose';
import type ContactForm from '../types/ContactFormMongo.js';
import type UserI from '../types/UserI.js';
import contactFormModel from '../models/ContactFormSchema.js';
import { sql } from './supabaseService.js';
import { userTable } from '../models/User.js';
import nodemailer, { Transporter } from 'nodemailer';

const fromEmail = process.env.EMAIL_USER;
const fromPass = process.env.EMAIL_PASS;

/**
 * Crea un nuevo formulario de contacto y envía un email con el mensaje.
 *
 * @param correo  - Correo del usuario, obtenido de res.locals.
 * @param mensaje - Mensaje escrito por el usuario.
 * @returns El formulario guardado en MongoDB.
 * @throws Error si falla el guardado o el envío de email.
 */
const createContactForm = async (
  correo: string,
  mensaje: string
): Promise<ContactForm & Document> => {
  if (!fromEmail || !fromPass) {
    throw new Error('Faltan credenciales de email (EMAIL_USER/EMAIL_PASS).');
  }

  // 1) Guardar en MongoDB
  let savedForm: ContactForm & Document;
  try {
    const newForm = new contactFormModel({ correo, mensaje, resolved: false });
    savedForm = await newForm.save();
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Error guardando formulario.'
    );
  }

  // 2) Configurar y enviar email
  let transporter: Transporter;
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: fromEmail,
        pass: fromPass
      },
      tls: {
        // <<< Esto permite certificados autofirmados
        rejectUnauthorized: false
      }
    });

    // opcional: verifica conexión antes de enviar
    await transporter.verify();

    await transporter.sendMail({
      from: `"Soporte FantasyDraft" <${fromEmail}>`,
      to: fromEmail,
      replyTo: correo,
      subject: `Nuevo mensaje de contacto de ${correo}`,
      html: `
        <p><strong>Correo del usuario:</strong> ${correo}</p>
        <p><strong>Mensaje:</strong></p>
        <blockquote style="border-left:2px solid #ccc;padding-left:10px;">
          ${mensaje.replace(/\n/g, '<br>')}
        </blockquote>
        <hr>
        <p>Puedes <strong>responder directamente</strong> a este email y llegará al usuario.</p>
      `
    });
  } catch (err) {
    console.error('❌ Error enviando email de contacto:', err);
    throw new Error('Formulario guardado, pero no se pudo enviar el email.');
  }

  return savedForm;
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