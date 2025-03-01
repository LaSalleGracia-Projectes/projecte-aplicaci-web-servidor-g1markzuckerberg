import Joi from "joi";

const updatePwdSchema = Joi.object({
  password: Joi.string().required(), // Contraseña actual obligatoria
  newPassword: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,15}$/) // Al menos 1 mayúscula, 1 minúscula y 1 número (6-15 caracteres)
    .required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(), // Debe coincidir con newPassword
});

const updateUsernameSchema = Joi.object({
  username: Joi.string().min(3).max(30).required()
});

const updateBirthDateSchema = Joi.object({
  birthDate: Joi.date().required()
});

export { updatePwdSchema, updateUsernameSchema, updateBirthDateSchema };