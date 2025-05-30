import Joi from 'joi';

export const createNewPlayerSchema = Joi.object({
  teamName: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': `"teamName" debe ser un texto`,
      'string.empty': `"teamName" no puede estar vacío`,
      'any.required': `"teamName" es obligatorio`
    }),
  positionId: Joi.number()
    .valid(24, 25, 26, 27)
    .required()
    .messages({
      'any.only': `"positionId" debe ser uno de [24, 25, 26, 27]`,
      'any.required': `"positionId" es obligatorio`
    }),
  name: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': `"name" debe ser un texto`,
      'string.empty': `"name" no puede estar vacío`,
      'any.required': `"name" es obligatorio`
    }),
  imageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': `"imageUrl" debe ser una URL válida`
    })
})
.unknown(false); // no se permiten campos extra

export const updateNewPlayerSchema = Joi.object({
  teamName: Joi.string()
    .min(1)
    .optional()
    .messages({
      'string.base': `"teamName" debe ser un texto`,
      'string.empty': `"teamName" no puede estar vacío`
    }),
  positionId: Joi.number()
    .valid(24, 25, 26, 27)
    .optional()
    .messages({
      'any.only': `"positionId" debe ser uno de [24, 25, 26, 27]`
    }),
  name: Joi.string()
    .min(1)
    .optional()
    .messages({
      'string.base': `"name" debe ser un texto`,
      'string.empty': `"name" no puede estar vacío`
    }),
  imageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': `"imageUrl" debe ser una URL válida`
    })
})
.or('teamName', 'positionId', 'name', 'imageUrl') // al menos un campo debe estar presente
.unknown(false);