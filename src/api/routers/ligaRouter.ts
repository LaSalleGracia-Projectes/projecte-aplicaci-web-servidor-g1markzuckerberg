import { Router } from 'express';
import { createLiga, joinLiga, getUsersByLiga, getLigaCodeById, removeUserFromLiga,
  assignNewCaptain, abandonLiga, uploadLeagueImageByCaptainController, getLeagueImageController,
  getUserFromLeagueController, updateLigaNameController } from '../controllers/ligaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import validate from '../middlewares/joiValidation.js';
import { createLigaSchema } from '../models/Joi/ligaSchemas.js';
import { uploadLeagueImage } from '../middlewares/multerLeagueMiddleware.js'; // Asegúrate de que la ruta sea correcta
import { getAllTeams } from '../controllers/playserSupaController.js';
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

// Ejemplo de URL: /api/v1/liga/123/user/456
ligaRouter.get('/:leagueId/user/:userId', authMiddleware, getUserFromLeagueController);

ligaRouter.put('/update-name/:ligaId', authMiddleware, updateLigaNameController);

ligaRouter.get('/teams', getAllTeams);

export default ligaRouter;
