import { Router, Request, Response } from 'express';

export const healthController = Router();

healthController.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'Testing Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: process.env.PORT || 4180
  });
});