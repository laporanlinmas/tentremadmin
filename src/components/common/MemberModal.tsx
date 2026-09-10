import { UserPlus, Save } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Anggota } from '../../types';
import { useApp } from '../../App';
import { Modal } from './Modal';
import { KATEGORI_ANGGOTA } from '../../pages/DataAnggota';

// Firebase imports – MemberModal langsung tulis ke Firestore anggotaPoskamling
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(fbApp);

interface CalendarModalProps {
  currentValue: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ currentValue, onSelect, onClose }) => {
  const initialDate = currentValue ? new Date(currentValue) : new Date();
  const validInitial = !isNaN(initialDate.getTime());
  const initialYear = validInitial ? initialDate.getFullYear() : 1990;
  const initialMonth = validInitial ? initialDate.getMonth() : 0;
  const initialDay = validInitial ? initialDate.getDate() : 1;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(validInitial ? initialDay : null);

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1940; y--) {
    years.push(y);
  }

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const daysGrid = [];
  for (let i = 0; i < firstDay; i++) daysGrid.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysGrid.push(d);

  const handleSelectDay = (d: number) => {
    setSelectedDay(d);
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onSelect(`${year}-${mm}-${dd}`);
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] p-5 shadow-lg border border-[var(--border)]"
        style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--blue)' }}>Pilih Tanggal Lahir</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select className="fctl" style={{ flex: 1.3, padding: '6px 10px', fontSize: '.75rem', height: '34px', borderRadius: '10px' }} value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {months.map((mName, idx) => <option key={idx} value={idx}>{mName}</option>)}
          </select>
          <select className="fctl" style={{ flex: 1, padding: '6px 10px', fontSize: '.75rem', height: '34px', borderRadius: '10px' }} value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {years.map((yVal) => <option key={yVal} value={yVal}>{yVal}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '.7rem', fontWeight: 800, marginBottom: '6px', opacity: 0.8 }}>
          <div style={{ color: 'var(--red)' }}>Min</div>
          <div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div>
          <div style={{ color: 'var(--blue)' }}>Sab</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {daysGrid.map((dayVal, idx) => {
            if (dayVal === null) return <div key={`empty-${idx}`} />;
            const isSelected = selectedDay === dayVal && validInitial && year === initialYear && month === initialMonth;
            return (
              <button key={`day-${dayVal}`} onClick={() => handleSelectDay(dayVal)} style={{ border: 'none', padding: '6px 0', borderRadius: '6px', cursor: 'pointer', fontSize: '.72rem', fontWeight: isSelected ? 800 : 500, background: isSelected ? 'var(--blue)' : 'transparent', color: isSelected ? '#ffffff' : 'var(--text)' }} className={isSelected ? '' : 'hover:bg-[rgba(30,111,217,0.1)] dark:hover:bg-[rgba(255,255,255,0.05)]'}>
                {dayVal}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <button className="bg2" style={{ padding: '6px 12px', fontSize: '.68rem', borderRadius: '8px' }} onClick={() => { onSelect(''); onClose(); }}>Hapus</button>
          <button className="bp" style={{ padding: '6px 12px', fontSize: '.68rem', borderRadius: '8px' }} onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
};

interface MemberModalProps {
  member: Anggota | null;
  show: boolean;
  unitOptions?: string[];
  collectionName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  member,
  show,
  unitOptions = [],
  collectionName = 'anggotaPoskamling',
  onClose,
  onSuccess,
}) => {
  const { showLoad, hideLoad, triggerToast } = useApp();

  const [nama, setNama] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [kategori, setKategori] = useState('Anggota');
  const [unit, setUnit] = useState('');
  const [wa, setWa] = useState('');
  const [usiaPreview, setUsiaPreview] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (member) {
      setNama(member.nama || '');
      setTglLahir(member.tglLahir || '');
      setKategori(member.kategori || 'Anggota');
      setUnit(member.unit || '');
      const cleanWa = member.wa ? member.wa.replace(/^Wa\s*:\s*/i, '').replace(/[^0-9]/g, '').trim() : '';
      setWa(cleanWa);
    } else {
      setNama('');
      setTglLahir('');
      setKategori('Anggota');
      setUnit('');
      setWa('');
      setUsiaPreview(null);
    }
  }, [member, show]);

  useEffect(() => {
    if (!tglLahir) { setUsiaPreview(null); return; }
    const d = new Date(tglLahir);
    if (isNaN(d.getTime())) { setUsiaPreview(null); return; }
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    setUsiaPreview(age >= 0 ? age : null);
  }, [tglLahir]);

  const parseAndFormatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  };

  const handleSubmit = async () => {
    if (!nama.trim()) {
      triggerToast('Nama wajib diisi.', 'er');
      return;
    }

    const waClean = wa.replace(/[^0-9]/g, '');
    const now = new Date().toISOString();

    showLoad(member ? 'Menyimpan...' : 'Menambah...');
    onClose();

    try {
      if (member && typeof member._ri === 'string') {
        // Update dokumen existing
        await updateDoc(doc(db, collectionName, member._ri), {
          nama: nama.trim(),
          tglLahir,
          kategori,
          unit,
          wa: waClean,
          usia: usiaPreview ?? null,
          updatedAt: now,
        });
      } else {
        // Tambah dokumen baru
        const newRef = doc(collection(db, collectionName));
        await setDoc(newRef, {
          nama: nama.trim(),
          tglLahir,
          kategori,
          unit,
          wa: waClean,
          usia: usiaPreview ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }
      hideLoad();
      triggerToast(member ? 'Data anggota diperbarui.' : 'Anggota berhasil ditambahkan.', 'ok');
      onSuccess();
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const isEdit = !!member;

  return (
    <>
      <Modal
        show={show}
        onClose={onClose}
        style={{ width: 'fit-content', minWidth: 'min(100%, 420px)', maxWidth: '95vw' }}
        title={
          isEdit ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--blue)' }}>
              <UserPlus className="w-4 h-4 inline-block align-middle" /> Edit Anggota
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--green)' }}>
              <UserPlus className="w-4 h-4 inline-block align-middle" /> Tambah Anggota
            </span>
          )
        }
        footer={
          <>
            <button className="bg2" onClick={onClose}>Batal</button>
            <button className="bp" onClick={handleSubmit}>
              <Save className="w-4 h-4 inline-block align-middle" /> Simpan
            </button>
          </>
        }
      >
        <div className="fgrp">
          <label className="flbl">Nama Lengkap <span className="req">*</span></label>
          <input
            className="fctl"
            placeholder="Nama lengkap"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            style={{ borderRadius: '10px' }}
            autoFocus
          />
        </div>
        <div className="frow">
          <div className="fcol relative">
            <label className="flbl">Tanggal Lahir</label>
            <input
              type="text"
              readOnly
              inputMode="none"
              onFocus={(e) => e.target.blur()}
              className="fctl"
              value={parseAndFormatDate(tglLahir)}
              onClick={() => setShowCalendar(true)}
              placeholder="Pilih tanggal lahir..."
              style={{ minHeight: '38px', padding: '8px 12px', boxSizing: 'border-box', borderRadius: '10px', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '.63rem', color: 'var(--blue)', marginTop: '3px', fontWeight: 700, minHeight: '15px' }}>
              {usiaPreview !== null ? `Usia: ${usiaPreview} tahun` : ''}
            </div>
          </div>
          <div className="fcol">
            <label className="flbl">Kategori</label>
            <select
              className="fctl"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              style={{ borderRadius: '10px' }}
            >
              {KATEGORI_ANGGOTA.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
        {unitOptions.length > 0 && (
          <div className="fgrp">
            <label className="flbl">Unit</label>
            <select
              className="fctl"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{ borderRadius: '10px' }}
            >
              <option value="">Pilih unit...</option>
              {unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        )}
        <div className="fgrp">
          <label className="flbl">Nomor WhatsApp</label>
          <input
            className="fctl"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            placeholder="08xxxxxxxxxx"
            value={wa}
            onChange={(e) => {
              const numVal = e.target.value.replace(/[^0-9]/g, '');
              if (numVal.length <= 12) setWa(numVal);
            }}
            style={{ borderRadius: '10px' }}
          />
        </div>
      </Modal>
      {showCalendar && (
        <CalendarModal
          currentValue={tglLahir}
          onSelect={(dateStr) => setTglLahir(dateStr)}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </>
  );
};

export default MemberModal;
