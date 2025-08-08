"use client";

import { ReactNode, useState, useRef, useEffect, forwardRef } from "react";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: Option[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  loading?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  className?: string;
  onChange?: (value: string | string[]) => void;
  onSearch?: (query: string) => void;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      placeholder = "Select an option...",
      disabled = false,
      multiple = false,
      clearable = false,
      searchable = false,
      loading = false,
      error,
      label,
      helperText,
      size = "medium",
      fullWidth = false,
      className = "",
      onChange,
      onSearch,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string | string[]>(
      multiple ? [] : value || defaultValue || "",
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const selectRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
      small: "px-3 py-1.5 text-sm",
      medium: "px-3 py-2 text-sm",
      large: "px-4 py-3 text-base",
    };

    const filteredOptions = searchable
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : options;

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchQuery("");
          setHighlightedIndex(-1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && searchable && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isOpen, searchable]);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        setHighlightedIndex(-1);
      }
    };

    const handleOptionSelect = (optionValue: string) => {
      if (multiple) {
        const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter((v) => v !== optionValue)
          : [...currentValues, optionValue];
        setSelectedValue(newValues);
        onChange?.(newValues);
      } else {
        setSelectedValue(optionValue);
        onChange?.(optionValue);
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newValue = multiple ? [] : "";
      setSelectedValue(newValue);
      onChange?.(newValue);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearch?.(query);
      setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          setIsOpen(false);
          setSearchQuery("");
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0) {
            handleOptionSelect(filteredOptions[highlightedIndex].value);
          }
          break;
      }
    };

    const getDisplayValue = () => {
      if (multiple) {
        const values = Array.isArray(selectedValue) ? selectedValue : [];
        if (values.length === 0) return placeholder;
        if (values.length === 1) {
          const option = options.find((opt) => opt.value === values[0]);
          return option?.label || values[0];
        }
        return `${values.length} items selected`;
      }

      const option = options.find((opt) => opt.value === selectedValue);
      return option?.label || placeholder;
    };

    const selectedValues = Array.isArray(selectedValue)
      ? selectedValue
      : [selectedValue];
    const hasValue = multiple
      ? selectedValues.length > 0
      : selectedValue !== "" && selectedValue != null;

    const selectElement = (
      <div
        ref={selectRef}
        className={`relative ${fullWidth ? "w-full" : "inline-block"}`}
      >
        <div
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          className={`
            relative cursor-pointer border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            ${sizeClasses[size]}
            ${error ? "border-red-300" : "border-gray-300"}
            ${disabled ? "bg-gray-50 cursor-not-allowed opacity-50" : "bg-white hover:border-gray-400"}
            ${fullWidth ? "w-full" : "min-w-[200px]"}
            ${className}
          `}
        >
          <div className="flex items-center justify-between">
            <span
              className={`block truncate ${hasValue ? "text-gray-900" : "text-gray-500"}`}
            >
              {getDisplayValue()}
            </span>
            <div className="flex items-center space-x-1">
              {loading && (
                <svg
                  className="w-4 h-4 animate-spin text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {clearable && hasValue && !disabled && (
                <button
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b border-gray-200">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={option.value}
                    onClick={() =>
                      !option.disabled && handleOptionSelect(option.value)
                    }
                    className={`
                      px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                      ${isHighlighted ? "bg-primary-50" : ""}
                      ${isSelected ? "bg-primary-100 text-primary-900" : "text-gray-900"}
                      ${option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}
                    `}
                  >
                    <span>{option.label}</span>
                    {multiple && isSelected && (
                      <svg
                        className="w-4 h-4 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
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
            </label>
          )}
          {selectElement}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          {helperText && !error && (
            <p className="mt-1 text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      );
    }

    return selectElement;
  },
);

Select.displayName = "Select";

export default Select;

// Multi-Select Component
interface MultiSelectProps
  extends Omit<SelectProps, "multiple" | "value" | "onChange"> {
  value?: string[];
  onChange?: (values: string[]) => void;
}

export function MultiSelect({
  value = [],
  onChange,
  ...props
}: MultiSelectProps) {
  return (
    <Select
      {...props}
      multiple
      value={value}
      onChange={onChange as (value: string | string[]) => void}
    />
  );
}

// Async Select Component
interface AsyncSelectProps extends SelectProps {
  loadOptions: (query: string) => Promise<Option[]>;
  loadingMessage?: string;
  noOptionsMessage?: string;
}

export function AsyncSelect({
  loadOptions,
  loadingMessage = "Loading...",
  noOptionsMessage = "No options",
  ...props
}: AsyncSelectProps) {
  const [asyncOptions, setAsyncOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const options = await loadOptions(query);
      setAsyncOptions(options);
    } catch (error) {
      setAsyncOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select
      {...props}
      options={asyncOptions}
      loading={isLoading}
      searchable
      onSearch={handleSearch}
    />
  );
}
