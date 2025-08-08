/**
 * SmartForm - Auto-generating form component with validation
 *
 * @example
 * ```tsx
 * <SmartForm
 *   schema={userSchema}
 *   onSubmit={handleSubmit}
 *   defaultValues={{ name: '', email: '' }}
 * />
 * ```
 */

import React from "react";
import { useForm, Controller, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/shared/lib/utils";
import { ActionButton } from "../buttons/ActionButton";

interface SmartFormProps<T extends z.ZodRawShape> {
  /** Zod schema for validation */
  schema: z.ZodObject<T>;
  /** Submit handler */
  onSubmit: (data: z.infer<z.ZodObject<T>>) => void | Promise<void>;
  /** Default form values */
  defaultValues?: Partial<z.infer<z.ZodObject<T>>>;
  /** Form className */
  className?: string;
  /** Submit button text */
  submitText?: string;
  /** Loading state */
  loading?: boolean;
  /** Form layout */
  layout?: "vertical" | "horizontal" | "grid";
  /** Grid columns (for grid layout) */
  columns?: number;
}

interface FieldConfig {
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "date";
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
}

export function SmartForm<T extends z.ZodRawShape>({
  schema,
  onSubmit,
  defaultValues,
  className,
  submitText = "Submit",
  loading = false,
  layout = "vertical",
  columns = 2,
}: SmartFormProps<T>) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues as any,
  });

  // Extract field configurations from schema
  const fieldConfigs = extractFieldConfigs(schema);

  const isLoading = loading || isSubmitting;

  const formClasses = cn(
    "space-y-6",
    layout === "horizontal" && "space-y-4",
    layout === "grid" && `grid gap-4 grid-cols-1 md:grid-cols-${columns}`,
    className,
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formClasses}>
      {Object.entries(fieldConfigs).map(([fieldName, config]) => (
        <div
          key={fieldName}
          className={cn(
            layout === "horizontal" && "flex items-center space-x-4",
            layout === "grid" &&
              config.type === "textarea" &&
              "md:col-span-full",
          )}
        >
          <label
            htmlFor={fieldName}
            className={cn(
              "block text-sm font-medium text-gray-700",
              layout === "horizontal" && "w-1/4 flex-shrink-0",
            )}
          >
            {config.label}
          </label>

          <div className={cn(layout === "horizontal" && "flex-1")}>
            <Controller
              name={fieldName as any}
              control={control}
              render={({ field }) => (
                <FormField
                  {...field}
                  type={config.type}
                  placeholder={config.placeholder}
                  options={config.options}
                  rows={config.rows}
                  error={errors[fieldName]?.message as string}
                  disabled={isLoading}
                />
              )}
            />
          </div>
        </div>
      ))}

      <div
        className={cn(
          "flex justify-end",
          layout === "grid" && "md:col-span-full",
        )}
      >
        <ActionButton
          type="submit"
          loading={isLoading}
          variant="primary"
          size="md"
        >
          {submitText}
        </ActionButton>
      </div>
    </form>
  );
}

interface FormFieldProps {
  type: FieldConfig["type"];
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  error?: string;
  disabled?: boolean;
  value: any;
  onChange: (value: any) => void;
  onBlur: () => void;
  name: string;
}

function FormField({
  type,
  placeholder,
  options,
  rows = 3,
  error,
  disabled,
  value,
  onChange,
  onBlur,
  name,
}: FormFieldProps) {
  const baseInputClasses = cn(
    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "disabled:bg-gray-50 disabled:text-gray-500",
    error && "border-red-300 focus:ring-red-500 focus:border-red-500",
  );

  const renderField = () => {
    switch (type) {
      case "textarea":
        return (
          <textarea
            id={name}
            name={name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={baseInputClasses}
          />
        );

      case "select":
        return (
          <select
            id={name}
            name={name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">Select...</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={name} className="ml-2 text-sm text-gray-700">
              {placeholder}
            </label>
          </div>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value || ""}
            onChange={(e) =>
              onChange(
                type === "number"
                  ? parseFloat(e.target.value) || 0
                  : e.target.value,
              )
            }
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div>
      {renderField()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Extract field configurations from Zod schema
 * This is a simplified implementation - in real usage, you'd want more sophisticated parsing
 */
function extractFieldConfigs(
  schema: z.ZodObject<any>,
): Record<string, FieldConfig> {
  // This is a placeholder implementation
  // In a real scenario, you'd parse the Zod schema to extract field information
  return {
    name: {
      type: "text",
      label: "Name",
      placeholder: "Enter name",
    },
    email: {
      type: "email",
      label: "Email",
      placeholder: "Enter email address",
    },
    description: {
      type: "textarea",
      label: "Description",
      placeholder: "Enter description",
      rows: 4,
    },
  };
}

export default SmartForm;
