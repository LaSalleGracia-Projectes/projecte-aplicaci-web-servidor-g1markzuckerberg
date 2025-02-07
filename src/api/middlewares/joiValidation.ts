/* eslint-disable arrow-body-style */
import { type NextFunction, type Request, type Response } from 'express';
import type Joi from "joi";
import httpStatus from '../config/httpStatusCodes.js';

const validate = <ReqParams, ReqBody, ReqQuery>(schema: Joi.ObjectSchema, validation: 'body' | 'params' | 'query') => {
  // Aquesta funció retorna el middleware.
  return (req: Request<ReqParams, any, ReqBody, ReqQuery>, res: Response, next: NextFunction) => {
    const objToValidate: ReqParams | ReqBody | ReqQuery = req[validation];
    if (!objToValidate) {
      next(new Error('Validation type not supported'));
      return;
    }

    const result = schema.validate(objToValidate);
    if (result.error) {
      const responseObj = { msg: result.error.details[0].message };
      res.status(httpStatus.badRequest).send(responseObj);
    } else {
      next();
    }
  }
}

export default validate;