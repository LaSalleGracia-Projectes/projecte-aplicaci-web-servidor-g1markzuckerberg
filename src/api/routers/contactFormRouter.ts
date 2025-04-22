import { Router } from 'express';
import authMiddleware from '../../api/middlewares/authMiddleware.js';
import { createContactFormController, getAllContactFormsController, updateContactFormController } from '../../api/controllers/contactFormController.js';

const contactFormRouter = Router();

// Ruta para crear un formulario de contacto
contactFormRouter.post('/create', authMiddleware, createContactFormController);

// Ruta para obtener todos los formularios de contacto (solo administradores)
contactFormRouter.get('/getAll', authMiddleware, getAllContactFormsController);

// Ruta para actualizar el campo "resolved" de un formulario de contacto (solo administradores)
contactFormRouter.put('/update/:id', authMiddleware, updateContactFormController);

export default contactFormRouter;