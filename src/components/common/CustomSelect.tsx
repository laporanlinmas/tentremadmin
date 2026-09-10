import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface CustomSelectOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Pilih opsi',
  ariaLabel,
  className = '',
  menuClassName = '',
  disabled = false,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (option: CustomSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`custom-select ${open ? 'is-open' : ''} ${className}`}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={!selected ? 'custom-select-placeholder' : ''}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="custom-select-chevron" size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className={`custom-select-menu ${menuClassName}`} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`custom-select-option ${option.value === value ? 'is-selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
