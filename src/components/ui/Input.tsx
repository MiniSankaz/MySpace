import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  fullWidth?: boolean;
  variant?: "default" | "filled" | "outline";
  inputSize?: "small" | "medium" | "large";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      fullWidth = false,
      variant = "default",
      inputSize = "medium",
      className = "",
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      default:
        "border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent",
      filled:
        "border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-primary-500",
      outline:
        "border-2 border-gray-300 bg-transparent focus:border-primary-500",
    };

    const sizeClasses = {
      small: "px-3 py-1.5 text-sm",
      medium: "px-3 py-2 text-sm",
      large: "px-4 py-3 text-base",
    };

    const inputClasses = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[inputSize],
      leftIcon && "pl-10",
      rightIcon && "pr-10",
      leftAddon && "rounded-l-none",
      rightAddon && "rounded-r-none",
      !leftAddon && !rightAddon && "rounded-md",
      error && "border-red-300 focus:ring-red-500 focus:border-red-500",
      fullWidth ? "w-full" : "w-auto",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const inputElement = (
      <div className={`relative ${fullWidth ? "w-full" : "inline-block"}`}>
        {leftAddon && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center">
            <span className="px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-gray-500 text-sm">
              {leftAddon}
            </span>
          </div>
        )}

        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}

        <input ref={ref} className={inputClasses} {...props} />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}

        {rightAddon && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center">
            <span className="px-3 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md text-gray-500 text-sm">
              {rightAddon}
            </span>
          </div>
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <div className={`${fullWidth ? "w-full" : "inline-block"}`}>
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {inputElement}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          {helperText && !error && (
            <p className="mt-1 text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      );
    }

    return inputElement;
  },
);

Input.displayName = "Input";

export { Input };

// Search Input Component
interface SearchInputProps extends Omit<InputProps, "leftIcon" | "type"> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

export function SearchInput({
  onSearch,
  searchDelay = 300,
  placeholder = "Search...",
  ...props
}: SearchInputProps) {
  const searchIcon = (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  return (
    <Input
      type="search"
      icon={searchIcon}
      placeholder={placeholder}
      {...props}
    />
  );
}

// Password Input Component
interface PasswordInputProps extends Omit<InputProps, "type" | "rightIcon"> {
  showToggle?: boolean;
}

export function PasswordInput({
  showToggle = true,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleIcon = showToggle ? (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-gray-400 hover:text-gray-600"
    >
      {showPassword ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  ) : undefined;

  return (
    <Input
      type={showPassword ? "text" : "password"}
      rightIcon={toggleIcon}
      {...props}
    />
  );
}

// Number Input Component
interface NumberInputProps extends Omit<InputProps, "type"> {
  min?: number;
  max?: number;
  step?: number;
  showStepper?: boolean;
}

export function NumberInput({
  min,
  max,
  step = 1,
  showStepper = true,
  value,
  onChange,
  ...props
}: NumberInputProps) {
  const handleIncrement = () => {
    const currentValue =
      typeof value === "string"
        ? parseFloat(value) || 0
        : (value as number) || 0;
    const newValue = currentValue + step;
    if (max === undefined || newValue <= max) {
      onChange?.({
        target: { value: newValue.toString() },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleDecrement = () => {
    const currentValue =
      typeof value === "string"
        ? parseFloat(value) || 0
        : (value as number) || 0;
    const newValue = currentValue - step;
    if (min === undefined || newValue >= min) {
      onChange?.({
        target: { value: newValue.toString() },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const stepper = showStepper ? (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleIncrement}
        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border-l border-gray-300"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={handleDecrement}
        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border-l border-t border-gray-300"
      >
        ▼
      </button>
    </div>
  ) : undefined;

  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      rightAddon={stepper}
      {...props}
    />
  );
}

// File Input Component
interface FileInputProps extends Omit<InputProps, "type"> {
  accept?: string;
  multiple?: boolean;
  onFileSelect?: (files: FileList | null) => void;
}

export function FileInput({
  accept,
  multiple = false,
  onFileSelect,
  onChange,
  label,
  ...props
}: FileInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect?.(e.target.files);
    onChange?.(e);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}

// Export as default for backward compatibility
export default Input;
