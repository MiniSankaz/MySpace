import { Router, Request, Response } from "express";
import { currencyService } from "../services/currency.service";
import { logger } from "../utils/logger";

const router = Router();

// Get exchange rate
router.get("/rate", async (req: Request, res: Response) => {
  try {
    const { from = 'USD', to = 'THB' } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: from, to"
      });
    }

    const rate = await currencyService.getExchangeRate(
      from as string, 
      to as string
    );

    res.json({
      success: true,
      data: {
        from: from as string,
        to: to as string,
        rate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error("Error fetching exchange rate:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get batch exchange rates
router.post("/rates/batch", async (req: Request, res: Response) => {
  try {
    const { base = 'USD', targets = ['THB', 'EUR', 'GBP'] } = req.body;
    
    const rates = await currencyService.getBatchRates(base, targets);
    
    res.json({
      success: true,
      data: {
        base,
        rates: Object.fromEntries(rates),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error("Error fetching batch rates:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Convert amount between currencies
router.post("/convert", async (req: Request, res: Response) => {
  try {
    const { amount, from = 'USD', to = 'THB' } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: amount"
      });
    }

    const converted = await currencyService.convertAmount(
      amount,
      from,
      to
    );

    res.json({
      success: true,
      data: {
        originalAmount: amount,
        from,
        to,
        convertedAmount: converted,
        rate: converted / amount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error("Error converting currency:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Format currency for display
router.post("/format", async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'THB', locale, showSign, compact } = req.body;
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: amount"
      });
    }

    const formatted = currencyService.formatCurrency(
      amount,
      currency,
      { locale, showSign, compact }
    );

    res.json({
      success: true,
      data: {
        amount,
        currency,
        formatted,
        symbol: currencyService.getCurrencySymbol(currency)
      }
    });
  } catch (error: any) {
    logger.error("Error formatting currency:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported currencies
router.get("/supported", async (req: Request, res: Response) => {
  try {
    const currencies = [
      { code: 'THB', symbol: '฿', name: 'Thai Baht' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
      { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
      { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
      { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
      { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
      { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
    ];

    res.json({
      success: true,
      data: currencies
    });
  } catch (error: any) {
    logger.error("Error fetching supported currencies:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get market currency
router.get("/market/:exchange", async (req: Request, res: Response) => {
  try {
    const { exchange } = req.params;
    
    const currency = currencyService.getMarketCurrency(exchange);
    const isThaiMarket = currencyService.isThaiMarket(exchange);

    res.json({
      success: true,
      data: {
        exchange,
        currency,
        symbol: currencyService.getCurrencySymbol(currency),
        isThaiMarket
      }
    });
  } catch (error: any) {
    logger.error("Error fetching market currency:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate currency code
router.get("/validate/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const isValid = currencyService.isValidCurrency(code);

    res.json({
      success: true,
      data: {
        code: code.toUpperCase(),
        isValid,
        symbol: isValid ? currencyService.getCurrencySymbol(code) : null
      }
    });
  } catch (error: any) {
    logger.error("Error validating currency:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache statistics
router.get("/cache/stats", async (req: Request, res: Response) => {
  try {
    const stats = currencyService.getCacheStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error("Error fetching cache stats:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
router.post("/cache/clear", async (req: Request, res: Response) => {
  try {
    currencyService.clearCache();

    res.json({
      success: true,
      message: "Currency cache cleared successfully"
    });
  } catch (error: any) {
    logger.error("Error clearing cache:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;