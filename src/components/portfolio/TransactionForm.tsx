"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Calendar, DollarSign, TrendingUp, TrendingDown, FileText, Calculator } from "lucide-react";

export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "TRANSFER_IN" | "TRANSFER_OUT";

interface TransactionFormData {
  type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  fees: number;
  notes?: string;
  executedAt: string;
}

interface TransactionFormProps {
  portfolioId: string;
  onSuccess?: (transaction: any) => void;
  onCancel?: () => void;
  initialData?: Partial<TransactionFormData>;
  mode?: "create" | "edit";
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  portfolioId,
  onSuccess,
  onCancel,
  initialData,
  mode = "create",
}) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    type: initialData?.type || "BUY",
    symbol: initialData?.symbol || "",
    quantity: initialData?.quantity || 0,
    price: initialData?.price || 0,
    fees: initialData?.fees || 0,
    notes: initialData?.notes || "",
    executedAt: initialData?.executedAt || new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // คำนวณยอดรวมอัตโนมัติ
  const calculateTotal = () => {
    const subtotal = formData.quantity * formData.price;
    if (formData.type === "BUY" || formData.type === "TRANSFER_IN") {
      return subtotal + formData.fees;
    } else if (formData.type === "SELL" || formData.type === "TRANSFER_OUT") {
      return subtotal - formData.fees;
    } else if (formData.type === "DIVIDEND") {
      return formData.price - formData.fees; // price เป็นยอดเงินปันผล
    }
    return subtotal;
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TransactionFormData, string>> = {};

    if (!formData.symbol.trim()) {
      newErrors.symbol = "Symbol is required";
    }

    if (formData.quantity <= 0 && formData.type !== "DIVIDEND") {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    if (formData.price <= 0) {
      newErrors.price = formData.type === "DIVIDEND" ? "Dividend amount is required" : "Price must be greater than 0";
    }

    if (formData.fees < 0) {
      newErrors.fees = "Fees cannot be negative";
    }

    if (!formData.executedAt) {
      newErrors.executedAt = "Execution date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // เรียก API สร้าง transaction
      const response = await fetch(`/api/v1/portfolios/${portfolioId}/transactions`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "test-user", // TODO: ใช้ user ID จริงจาก context
        },
        body: JSON.stringify({
          ...formData,
          total: calculateTotal(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transaction");
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data.data);
      }
    } catch (error: any) {
      setSubmitError(error.message || "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleChange = (field: keyof TransactionFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Transaction type options
  const transactionTypes = [
    { value: "BUY", label: "Buy", icon: TrendingUp, color: "text-green-600" },
    { value: "SELL", label: "Sell", icon: TrendingDown, color: "text-red-600" },
    { value: "DIVIDEND", label: "Dividend", icon: DollarSign, color: "text-blue-600" },
    { value: "TRANSFER_IN", label: "Transfer In", icon: TrendingUp, color: "text-purple-600" },
    { value: "TRANSFER_OUT", label: "Transfer Out", icon: TrendingDown, color: "text-orange-600" },
  ];

  const selectedType = transactionTypes.find((t) => t.value === formData.type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          {submitError}
        </Alert>
      )}

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {transactionTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleChange("type", type.value)}
                className={`
                  flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
                  ${
                    formData.type === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${type.color}`} />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Symbol & Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Symbol <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.symbol}
            onChange={(e) => handleChange("symbol", e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            className={errors.symbol ? "border-red-500" : ""}
          />
          {errors.symbol && (
            <p className="text-sm text-red-500 mt-1">{errors.symbol}</p>
          )}
        </div>

        {formData.type !== "DIVIDEND" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.quantity || ""}
              onChange={(e) => handleChange("quantity", parseFloat(e.target.value) || 0)}
              placeholder="0"
              step="0.000001"
              className={errors.quantity ? "border-red-500" : ""}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
            )}
          </div>
        )}
      </div>

      {/* Price & Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {formData.type === "DIVIDEND" ? "Dividend Amount" : "Price per Share"} <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            value={formData.price || ""}
            onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            className={errors.price ? "border-red-500" : ""}
          />
          {errors.price && (
            <p className="text-sm text-red-500 mt-1">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fees & Commissions
          </label>
          <Input
            type="number"
            value={formData.fees || ""}
            onChange={(e) => handleChange("fees", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            className={errors.fees ? "border-red-500" : ""}
          />
          {errors.fees && (
            <p className="text-sm text-red-500 mt-1">{errors.fees}</p>
          )}
        </div>
      </div>

      {/* Execution Date & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Execution Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type="date"
              value={formData.executedAt}
              onChange={(e) => handleChange("executedAt", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className={errors.executedAt ? "border-red-500" : ""}
            />
            <Calendar className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.executedAt && (
            <p className="text-sm text-red-500 mt-1">{errors.executedAt}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <div className="relative">
            <Input
              type="text"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any notes..."
            />
            <FileText className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Total Calculation Display */}
      {(formData.quantity > 0 || formData.type === "DIVIDEND") && formData.price > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Total Amount</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                ${calculateTotal().toFixed(2)}
              </p>
              {formData.type !== "DIVIDEND" && (
                <p className="text-sm text-gray-500">
                  {formData.quantity} shares × ${formData.price.toFixed(2)}
                  {formData.fees > 0 && ` + $${formData.fees.toFixed(2)} fees`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? "Saving..." : mode === "edit" ? "Update Transaction" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
};