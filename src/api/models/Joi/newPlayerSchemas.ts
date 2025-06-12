import Joi from 'joi';

export const createNewPlayerSchema = Joi.object({
  equipo_id: Joi.number()
    .required()
    .messages({
      'number.base': '"equipo_id" debe ser un número',
      'any.required': '"equipo_id" es obligatorio'
    }),
  position_id: Joi.number()
    .required()
    .messages({
      'number.base': '"position_id" debe ser un número',
      'any.required': '"position_id" es obligatorio'
    }),
  displayname: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"displayname" debe ser un texto',
      'string.empty': '"displayname" no puede estar vacío',
      'any.required': '"displayname" es obligatorio'
    }),
  imagepath: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': '"imagepath" debe ser una URL válida'
    })
})
.unknown(false); // no se permiten campos extra

export const updateNewPlayerSchema = Joi.object({
  equipo_id: Joi.number()
    .optional()
    .messages({
      'number.base': '"equipo_id" debe ser un número'
    }),
  position_id: Joi.number()
    .optional()
    .messages({
      'number.base': '"position_id" debe ser un número'
    }),
  displayname: Joi.string()
    .min(1)
    .optional()
    .messages({
      'string.base': '"displayname" debe ser un texto',
      'string.empty': '"displayname" no puede estar vacío'
    }),
  imagepath: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': '"imagepath" debe ser una URL válida'
    })
})
.unknown(false);