import { AlertTriangle, Trash2 } from 'lucide-react';
import React from 'react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  show: boolean;
  title?: string;
  msg: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmClass?: string;
  confirmIcon?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  title = 'Konfirmasi Hapus',
  msg,
  onConfirm,
  onCancel,
  confirmText = 'Hapus',
  confirmClass = 'bd',
  confirmIcon = <Trash2 className="w-4 h-4 inline-block align-middle" />,
}) => {
  return (
    <Modal
      show={show}
      onClose={onCancel}
      size="sm"
      title={
        <span style={{ color: confirmClass === 'bd' ? 'var(--red)' : 'var(--blue)', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <AlertTriangle className="w-4 h-4 inline-block align-middle" /> {title}
        </span>
      }
      footer={
        <>
          <button className="bg2" onClick={onCancel}>
            Batal
          </button>
          <button className={confirmClass} onClick={onConfirm}>
            {confirmIcon && <span style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}>{confirmIcon}</span>}
            {confirmText}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '.8rem', color: 'var(--mid)', lineHeight: '1.6' }}>
        {msg}
      </p>
    </Modal>
  );
};

