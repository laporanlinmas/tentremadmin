import React, { useRef, useState } from 'react';

interface FileDropzoneProps {
  accept?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
  style?: React.CSSProperties;
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>;
  onMouseOut?: React.MouseEventHandler<HTMLDivElement>;
  onFile: (file: File) => void;
  children: React.ReactNode;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept = 'image/*',
  disabled = false,
  inputRef,
  className = '',
  style,
  onMouseOver,
  onMouseOut,
  onFile,
  children,
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const resolvedInputRef = inputRef || internalInputRef;

  const selectFile = (file?: File) => {
    if (!disabled && file) onFile(file);
  };

  return (
    <div
      className={`${className}${isDragging ? ' file-dropzone-active' : ''}`}
      style={style}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onClick={(event) => {
        if (!disabled && !(event.target as HTMLElement).closest('button, input, a')) {
          resolvedInputRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        selectFile(event.dataTransfer.files?.[0]);
      }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          resolvedInputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <input
        ref={resolvedInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {children}
    </div>
  );
};

export default FileDropzone;