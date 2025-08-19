import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { 
  validateCreateTransaction,
  validateUpdateTransaction,
  validateGetTransactions,
  validateTransactionId,
  validatePortfolioId
} from "../middlewares/validation.middleware";

const router = Router();
const transactionController = new TransactionController();

// All routes require authentication
router.use(authenticate);

// Transaction routes for a portfolio
router.post("/portfolios/:portfolioId/transactions", 
  validateCreateTransaction,
  transactionController.createTransaction.bind(transactionController));

router.get("/portfolios/:portfolioId/transactions", 
  validateGetTransactions,
  transactionController.getTransactions.bind(transactionController));

router.put("/portfolios/:portfolioId/transactions/:transactionId", 
  validateUpdateTransaction,
  transactionController.updateTransaction.bind(transactionController));

router.delete("/portfolios/:portfolioId/transactions/:transactionId", 
  validateTransactionId,
  transactionController.deleteTransaction.bind(transactionController));

router.get("/portfolios/:portfolioId/transactions/stats", 
  validatePortfolioId,
  transactionController.getTransactionStats.bind(transactionController));

export default router;