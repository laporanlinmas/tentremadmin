import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (dateStr: string, dayStr: string, rawDate: Date) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ show, onClose, onSelect }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  if (!show) return null;

  const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const INDO_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Generate range of years (2024 to 2030)
  const years = [];
  for (let y = 2030; y >= 2024; y--) {
    years.push(y);
  }

  const firstDayOfMonth = new Date(year, month, 1);
  let startDayIndex = firstDayOfMonth.getDay();
  startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
  };

  const daysGrid = [];

  // Previous month buffer days
  for (let i = startDayIndex - 1; i >= 0; i--) {
    daysGrid.push({
      dayNum: prevTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevTotalDays - i)
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month buffer days
  const remainingCells = 42 - daysGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const handleSelectDay = (date: Date) => {
    const dayName = INDO_DAYS[date.getDay()];
    const dateStr = `${date.getDate()} ${INDO_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    onSelect(dateStr, dayName, date);
    onClose();
  };

  return (
    <div className="mov on" style={{ display: 'flex', zIndex: 1200 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox sm" style={{ maxWidth: '360px', width: '92vw', padding: '16px' }}>
        <div className="mhd" style={{ paddingBottom: '12px' }}>
          <h5 style={{ fontSize: '1rem', fontWeight: 700 }}>Pilih Tanggal</h5>
          <button className="bx" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div className="mbd" style={{ padding: '0px' }}>
          {/* Calendar Header with Dropdowns and Chevron Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
            <button className="iact" style={{ padding: '6px' }} onClick={handlePrevMonth} type="button">
              <ChevronLeft size={16} />
            </button>
            
            <select
              className="fctl"
              style={{ flex: 1.3, padding: '4px 8px', fontSize: '.75rem', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {INDO_MONTHS.map((mName, idx) => (
                <option key={idx} value={idx}>{mName}</option>
              ))}
            </select>
            
            <select
              className="fctl"
              style={{ flex: 1, padding: '4px 8px', fontSize: '.75rem', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {years.map((yVal) => (
                <option key={yVal} value={yVal}>{yVal}</option>
              ))}
            </select>

            <button className="iact" style={{ padding: '6px' }} onClick={handleNextMonth} type="button">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '8px' }}>
            <span>S</span>
            <span>S</span>
            <span>R</span>
            <span>K</span>
            <span>J</span>
            <span>S</span>
            <span style={{ color: 'var(--red)' }}>M</span>
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {daysGrid.map((cell, idx) => {
              const isToday = new Date().toDateString() === cell.date.toDateString();
              const isSunday = cell.date.getDay() === 0;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.date)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: cell.isCurrentMonth ? 600 : 400,
                    cursor: 'pointer',
                    background: isToday ? 'var(--blue)' : 'transparent',
                    color: isToday 
                      ? '#fff' 
                      : !cell.isCurrentMonth 
                        ? 'var(--muted)' 
                        : isSunday 
                          ? 'var(--red)' 
                          : 'var(--text)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!isToday) e.currentTarget.style.backgroundColor = 'var(--bg2)'; }}
                  onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
