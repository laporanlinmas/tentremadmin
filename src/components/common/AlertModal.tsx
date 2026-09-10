import { Info } from 'lucide-react';
import React from 'react';
import { Modal } from './Modal';

interface AlertModalProps {
  show: boolean;
  title?: string;
  msg: string;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  show,
  title = 'Informasi',
  msg,
  onClose,
}) => {
  return (
    <Modal
      show={show}
      onClose={onClose}
      size="sm"
      title={
        <span style={{ color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Info className="w-4 h-4 inline-block align-middle" /> {title}
        </span>
      }
      footer={
        <button className="bp" onClick={onClose} style={{ padding: '6px 20px' }}>
          OK
        </button>
      }
    >
      <p style={{ fontSize: '.8rem', color: 'var(--mid)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
        {msg}
      </p>
    </Modal>
  );
};

