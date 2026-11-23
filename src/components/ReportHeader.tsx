import React from 'react';
import { DEFAULT_LEFT_LOGO, DEFAULT_RIGHT_LOGO } from '../constants/schoolDefaults';
import type { SchoolSettings } from '../types';

interface ReportHeaderProps {
  settings: SchoolSettings;
  compact?: boolean;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({ settings, compact = false }) => {
  const leftLogo = settings.logoKiriUrl || DEFAULT_LEFT_LOGO;
  const rightLogo = settings.logoKananUrl || DEFAULT_RIGHT_LOGO;

  return (
    <div className="w-full bg-white text-slate-900 select-none">
      <div className={`flex items-center justify-between gap-4 ${compact ? 'pb-2' : 'pb-3'}`}>
        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <img
            src={leftLogo}
            alt="Logo Madrasah Ibtidaiyah Darussalam"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 text-center leading-tight">
          <p className="font-display font-bold text-xs sm:text-sm tracking-wide uppercase text-slate-900">
            {settings.namaYayasan}
          </p>
          <h2 className="font-display font-extrabold text-sm sm:text-lg tracking-wide uppercase text-emerald-900 mt-0.5">
            {settings.namaMadrasah}
          </h2>
          <p className="text-[11px] sm:text-xs font-medium text-slate-700 mt-0.5 font-mono tabular-nums">
            NSM : {settings.nsm} &nbsp;&nbsp;|&nbsp;&nbsp; NPSM : {settings.npsm}
          </p>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-800 mt-0.5">
            TERAKREDITASI : &quot;{settings.akreditasi}&quot; BAN-PDM Nomor : {settings.nomorAkreditasi}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5">
            {settings.alamat} &nbsp; Tlp. {settings.telepon}
          </p>
        </div>

        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <img
            src={rightLogo}
            alt="Logo Yayasan Pendidikan Islam Daaruttaqwa"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Double horizontal border matching KOP SURAT.docx */}
      <div className="w-full border-t-[2.5px] border-slate-900 pt-[2px]">
        <div className="w-full border-t border-slate-900" />
      </div>
    </div>
  );
};
