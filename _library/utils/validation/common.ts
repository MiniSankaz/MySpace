/**
 * Common validation utilities
 * Reusable validation functions for forms and data processing
 */

import { z } from "zod";

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Thailand format)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ""));
};

// Thai ID validation
export const validateThaiId = (id: string): boolean => {
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
};

// Password strength validation
export const validatePasswordStrength = (
  password: string,
): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("Password must be at least 8 characters long");
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Password must contain at least one lowercase letter");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Password must contain at least one uppercase letter");
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push("Password must contain at least one number");
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Password must contain at least one special character");
  }

  return { score, feedback };
};

// URL validation
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Credit card validation (Luhn algorithm)
export const validateCreditCard = (cardNumber: string): boolean => {
  const number = cardNumber.replace(/\D/g, "");

  if (number.length < 13 || number.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

// File size validation
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// File type validation
export const validateFileType = (
  file: File,
  allowedTypes: string[],
): boolean => {
  return allowedTypes.includes(file.type);
};

// Business validation rules
export const businessValidation = {
  // Tax ID validation (Thailand)
  taxId: (taxId: string): boolean => {
    if (!/^\d{13}$/.test(taxId)) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(taxId[i]) * (13 - i);
    }

    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(taxId[12]);
  },

  // Company registration number
  companyRegistration: (regNumber: string): boolean => {
    return /^\d{10}$/.test(regNumber);
  },

  // VAT number
  vatNumber: (vatNumber: string): boolean => {
    return /^\d{13}$/.test(vatNumber);
  },
};

// Common Zod schemas
export const commonSchemas = {
  email: z.string().email("Invalid email format"),

  phone: z.string().refine(validatePhone, "Invalid phone number format"),

  thaiId: z.string().refine(validateThaiId, "Invalid Thai ID number"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character",
    ),

  url: z.string().url("Invalid URL format"),

  positiveNumber: z.number().positive("Must be a positive number"),

  nonEmptyString: z.string().min(1, "This field is required"),

  optionalString: z.string().optional(),

  date: z.date().or(z.string().pipe(z.coerce.date())),

  futureDate: z
    .date()
    .refine((date) => date > new Date(), "Date must be in the future"),

  pastDate: z
    .date()
    .refine((date) => date < new Date(), "Date must be in the past"),
};

// Form validation helper
export const createFormSchema = <T extends Record<string, any>>(fields: {
  [K in keyof T]: z.ZodType<T[K]>;
}): z.ZodObject<{ [K in keyof T]: z.ZodType<T[K]> }> => {
  return z.object(fields);
};

// Async validation
export const asyncValidation = {
  // Check if email exists
  emailExists: async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/users/check-email?email=${encodeURIComponent(email)}`,
      );
      const data = await response.json();
      return data.exists;
    } catch {
      return false;
    }
  },

  // Check if username is available
  usernameAvailable: async (username: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/users/check-username?username=${encodeURIComponent(username)}`,
      );
      const data = await response.json();
      return data.available;
    } catch {
      return false;
    }
  },
};

// Validation error formatter
export const formatValidationErrors = (
  errors: z.ZodIssue[],
): Record<string, string> => {
  const formatted: Record<string, string> = {};

  errors.forEach((error) => {
    const path = error.path.join(".");
    formatted[path] = error.message;
  });

  return formatted;
};

// Sanitization utilities
export const sanitize = {
  // Remove HTML tags
  html: (input: string): string => {
    return input.replace(/<[^>]*>/g, "");
  },

  // Remove special characters except allowed ones
  alphanumeric: (input: string, allowSpaces = true): string => {
    const pattern = allowSpaces ? /[^a-zA-Z0-9\s]/g : /[^a-zA-Z0-9]/g;
    return input.replace(pattern, "");
  },

  // Trim and normalize whitespace
  whitespace: (input: string): string => {
    return input.trim().replace(/\s+/g, " ");
  },

  // Remove SQL injection patterns (basic)
  sql: (input: string): string => {
    return input.replace(/['";\\]/g, "");
  },
};

export default {
  validateEmail,
  validatePhone,
  validateThaiId,
  validatePasswordStrength,
  validateUrl,
  validateCreditCard,
  validateFileSize,
  validateFileType,
  businessValidation,
  commonSchemas,
  createFormSchema,
  asyncValidation,
  formatValidationErrors,
  sanitize,
};
