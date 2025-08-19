import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  position?: "top" | "bottom";
  maxHeight?: number;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  multiple = false,
  searchable = false,
  clearable = false,
  disabled = false,
  className,
  label,
  error,
  position = "bottom",
  maxHeight = 300,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchQuery
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const currentValues = (value as string[]) || [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : "");
  };

  const getSelectedLabel = () => {
    if (multiple) {
      const selectedValues = (value as string[]) || [];
      if (selectedValues.length === 0) return placeholder;
      if (selectedValues.length === 1) {
        const option = options.find((o) => o.value === selectedValues[0]);
        return option?.label || placeholder;
      }
      return `${selectedValues.length} selected`;
    } else {
      const option = options.find((o) => o.value === value);
      return option?.label || placeholder;
    }
  };

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return ((value as string[]) || []).includes(optionValue);
    }
    return value === optionValue;
  };

  const hasValue = multiple ? (value as string[])?.length > 0 : Boolean(value);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between",
          "px-3 py-2 text-sm",
          "border rounded-lg",
          "transition-colors",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500",
          disabled
            ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
            : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
        )}
      >
        <span
          className={cn(
            "truncate",
            !hasValue && "text-gray-500 dark:text-gray-400",
          )}
        >
          {getSelectedLabel()}
        </span>

        <div className="flex items-center space-x-1 ml-2">
          {clearable && hasValue && !disabled && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="h-3 w-3 text-gray-500" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-full mt-1",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-lg shadow-lg",
            position === "top" && "bottom-full mb-1 mt-0",
          )}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full flex items-center justify-between",
                    "px-3 py-2 text-sm text-left",
                    "transition-colors",
                    option.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700",
                    isSelected(option.value) &&
                      "bg-blue-50 dark:bg-blue-900/30",
                  )}
                >
                  <div className="flex items-center space-x-2">
                    {option.icon && (
                      <option.icon className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected(option.value) && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
