"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { X, Plus, Edit2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Transaction {
  id: string;
  type: "BUY" | "SELL" | "DIVIDEND" | "TRANSFER_IN" | "TRANSFER_OUT";
  symbol: string;
  quantity: number;
  price: number;
  fees: number;
  total: number;
  notes?: string;
  executedAt: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  transaction?: Transaction | null;
  mode?: "create" | "edit" | "delete";
  onSuccess?: (transaction?: any) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  portfolioId,
  transaction,
  mode = "create",
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/v1/transactions/${transaction.id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": "test-user", // TODO: ใช้ user ID จริงจาก context
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  // Modal title based on mode
  const getModalTitle = () => {
    switch (mode) {
      case "edit":
        return (
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Edit Transaction
          </div>
        );
      case "delete":
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete Transaction
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Transaction
          </div>
        );
    }
  };

  // Modal content based on mode
  const renderContent = () => {
    if (mode === "delete") {
      return (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
          </div>

          {transaction && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Type:</div>
                <div className="font-medium">{transaction.type}</div>
                
                <div className="text-gray-600">Symbol:</div>
                <div className="font-medium">{transaction.symbol}</div>
                
                <div className="text-gray-600">Quantity:</div>
                <div className="font-medium">
                  {transaction.type !== "DIVIDEND" ? transaction.quantity : "-"}
                </div>
                
                <div className="text-gray-600">Price:</div>
                <div className="font-medium">${transaction.price.toFixed(2)}</div>
                
                <div className="text-gray-600">Total:</div>
                <div className="font-medium">${transaction.total.toFixed(2)}</div>
                
                <div className="text-gray-600">Date:</div>
                <div className="font-medium">
                  {new Date(transaction.executedAt).toLocaleDateString()}
                </div>
              </div>
              
              {transaction.notes && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600">Notes:</div>
                  <div className="text-sm mt-1">{transaction.notes}</div>
                </div>
              )}
            </div>
          )}

          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{deleteError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Transaction"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <TransactionForm
        portfolioId={portfolioId}
        initialData={
          transaction
            ? {
                type: transaction.type,
                symbol: transaction.symbol,
                quantity: transaction.quantity,
                price: transaction.price,
                fees: transaction.fees,
                notes: transaction.notes,
                executedAt: transaction.executedAt.split("T")[0],
              }
            : undefined
        }
        mode={mode}
        onSuccess={(data) => {
          if (onSuccess) {
            onSuccess(data);
          }
          onClose();
        }}
        onCancel={onClose}
      />
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size={mode === "delete" ? "sm" : "lg"}
    >
      {renderContent()}
    </Modal>
  );
};

// คอมโพเนนต์สำหรับ Confirmation Dialog
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};