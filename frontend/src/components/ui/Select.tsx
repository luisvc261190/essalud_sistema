import React, { forwardRef } from "react";
import "./Select.css";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder = "Seleccionar...",
      fullWidth = false,
      className = "",
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div
        className={`select-wrapper ${fullWidth ? "select-full-width" : ""}`}
      >
        {label && (
          <label htmlFor={selectId} className="select-label">
            {label}
            {props.required && <span className="select-required">*</span>}
          </label>
        )}
        <div className="select-container">
          <select
            ref={ref}
            id={selectId}
            className={`select ${error ? "select-error" : ""} ${className}`}
            onChange={handleChange}
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="select-arrow">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {error && <span className="select-error-text">{error}</span>}
        {!error && helperText && (
          <span className="select-helper-text">{helperText}</span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
