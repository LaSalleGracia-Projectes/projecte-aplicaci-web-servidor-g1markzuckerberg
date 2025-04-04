import { Router } from 'express';
import { createLiga, joinLiga, getUsersByLiga, getLigaCodeById, removeUserFromLiga,
  assignNewCaptain, abandonLiga, uploadLeagueImageByCaptainController, getLeagueImageController } from '../controllers/ligaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import validate from '../middlewares/joiValidation.js';
import { createLigaSchema } from '../models/Joi/ligaSchemas.js';
import { uploadLeagueImage } from '../middlewares/multerLeagueMiddleware.js'; // Asegúrate de que la ruta sea correcta

const ligaRouter = Router();
ligaRouter.post(
  '/create',
  authMiddleware,
  uploadLeagueImage.single('image'),
  validate(createLigaSchema, 'body'),
  authMiddleware, createLiga
);

ligaRouter.post('/create', authMiddleware, createLiga);
ligaRouter.post('/join/:ligaCode', authMiddleware, joinLiga); // Ahora se requiere autenticación
// Example: /api/v1/ligas/users/ABC123?jornada_id=22
ligaRouter.get('/users/:ligaCode', authMiddleware, getUsersByLiga);
ligaRouter.get('/code/:ligaId', authMiddleware, getLigaCodeById);
ligaRouter.delete('/kickUser/:ligaId/:userId', authMiddleware, removeUserFromLiga);

ligaRouter.put('/make-captain/:ligaId/:newCaptainId', authMiddleware, assignNewCaptain);
ligaRouter.delete('/leave/:ligaId', authMiddleware, abandonLiga);

ligaRouter.put(
  '/:ligaId/upload-image',
  authMiddleware,
  uploadLeagueImage.single('image'),
  uploadLeagueImageByCaptainController
);

ligaRouter.get('/image/:ligaId', getLeagueImageController);

export default ligaRouter;
