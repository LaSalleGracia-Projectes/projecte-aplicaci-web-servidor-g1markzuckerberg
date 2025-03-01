import Joi from 'joi';

const updateUserByAdminSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  birthDate: Joi.date().optional(),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  is_admin: Joi.boolean().optional(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,15}$/) // Contraseña válida si se envía
    .optional(),
}).unknown(false); // 🔹 Evita que se envíen campos no permitidos

export { updateUserByAdminSchema };