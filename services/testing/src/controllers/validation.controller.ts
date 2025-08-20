import { Router, Request, Response } from 'express';
import { ValidationService } from '../services/validation.service';
import { logger } from '../utils/logger';

export const validationController = Router();
const validator = new ValidationService();

// Validate command
validationController.post('/', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }
    
    const result = validator.validateCommand(command);
    
    logger.info(`Command validation: ${command}`, result);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error validating command:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate command'
    });
  }
  return;
});