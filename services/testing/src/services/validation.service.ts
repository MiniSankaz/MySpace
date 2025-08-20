import { isCommandSafe } from '../config/whitelist';
import { logger } from '../utils/logger';

export class ValidationService {
  /**
   * Validate a command
   */
  validateCommand(command: string): {
    safe: boolean;
    category?: string;
    description?: string;
    requiresApproval: boolean;
  } {
    logger.debug(`Validating command: ${command}`);
    
    const result = isCommandSafe(command);
    
    if (result.safe) {
      logger.info(`Command approved: ${command}`, {
        category: result.category,
        description: result.description
      });
    } else {
      logger.warn(`Command requires approval: ${command}`);
    }
    
    return result;
  }
}