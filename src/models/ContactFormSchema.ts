import type { Document } from 'mongoose';
import { Schema, model } from 'mongoose';
import type ContactForm from '../types/ContactFormMongo';

const contactFormSchema = new Schema<ContactForm & Document>(
  {
    correo: { type: String, required: true },
    mensaje: { type: String, required: true },
    resolved: { type: Boolean, default: false, required: true }
  },
  {
    timestamps: true
  }
);

const contactFormModel = model<ContactForm & Document>('ContactForm', contactFormSchema);

export default contactFormModel;