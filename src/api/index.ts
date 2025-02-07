import express, { Router } from 'express';


const apiRouter = Router();

// Per obtenir el body en format json
apiRouter.use(express.json());


export default apiRouter;