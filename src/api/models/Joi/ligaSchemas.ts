import Joi from 'joi';

export const createLigaSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
}).unknown(true);