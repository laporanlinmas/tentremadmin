import React, { useEffect } from 'react';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
}

export const Modal: React.FC<ModalProps> = ({
  show,
  onClose,
  title,
  footer,
  children,
  size = 'md',
  style,
}) => {
  // Lock body scroll saat modal aktif
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="mov on" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`mbox ${size}`} style={style}>
        <div className="mhd">
          <h5>{title}</h5>
          <button className="bx" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="mbd">
          {children}
        </div>
        {footer && (
          <div className="mft mft-compact">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
