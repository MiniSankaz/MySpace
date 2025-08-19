import { Router } from 'express';
import { QuoteController } from '@controllers/quote.controller';

const router = Router();
const quoteController = new QuoteController();

// Quote endpoints
router.get('/quote/:symbol', quoteController.getQuote.bind(quoteController));
router.get('/quotes', quoteController.getBatchQuotes.bind(quoteController));
router.post('/quotes/cache/clear', quoteController.clearCache.bind(quoteController));

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'market-data',
    timestamp: new Date().toISOString()
  });
});

export default router;