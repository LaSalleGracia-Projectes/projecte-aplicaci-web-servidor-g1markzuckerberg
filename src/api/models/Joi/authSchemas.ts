import Joi from "joi";

const registerSchema = Joi.object({
  correo: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,15}$/).required(),
  repeatPassword: Joi.string().valid(Joi.ref('password')).required(),
});

const loginSchema = Joi.object({
  correo: Joi.string().email().required(),
  password: Joi.string().required(),
});

export { registerSchema, loginSchema };