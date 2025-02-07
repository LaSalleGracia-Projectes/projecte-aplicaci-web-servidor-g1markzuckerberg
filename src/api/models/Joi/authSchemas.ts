import Joi from "joi";

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,15}$/).required(),
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required(),
});

export { registerSchema }