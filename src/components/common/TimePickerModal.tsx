import React, { useState } from 'react';

interface TimePickerModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (timeStr: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ show, onClose, onSelect }) => {
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');

  if (!show) return null;

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleConfirm = () => {
    onSelect(`${hour}:${minute} WIB`);
    onClose();
  };

  return (
    <div className="mov on" style={{ display: 'flex', zIndex: 1200 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox sm" style={{ maxWidth: '340px', width: '92vw', padding: '16px' }}>
        <div className="mhd" style={{ paddingBottom: '12px' }}>
          <h5 style={{ fontSize: '1rem', fontWeight: 700 }}>Pilih Waktu (24 Jam)</h5>
          <button className="bx" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="mbd" style={{ padding: '0px' }}>
          {/* Time Preview */}
          <div style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', color: 'var(--blue)', marginBottom: '16px', background: 'var(--bg2)', padding: '10px', borderRadius: '8px' }}>
            {hour} : {minute} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>WIB</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            {/* Hours Column */}
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', textAlign: 'center' }}>Jam</label>
              <div style={{ height: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', background: 'var(--card)' }}>
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    style={{
                      width: '100%',
                      padding: '6px 0',
                      border: 'none',
                      borderRadius: '6px',
                      background: hour === h ? 'var(--blue)' : 'transparent',
                      color: hour === h ? '#fff' : 'var(--text)',
                      fontWeight: hour === h ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '2px',
                      textAlign: 'center'
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', textAlign: 'center' }}>Menit</label>
              <div style={{ height: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', background: 'var(--card)' }}>
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    style={{
                      width: '100%',
                      padding: '6px 0',
                      border: 'none',
                      borderRadius: '6px',
                      background: minute === m ? 'var(--blue)' : 'transparent',
                      color: minute === m ? '#fff' : 'var(--text)',
                      fontWeight: minute === m ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '2px',
                      textAlign: 'center'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button className="bp" style={{ width: '100%', padding: '10px' }} onClick={handleConfirm} type="button">
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
};
