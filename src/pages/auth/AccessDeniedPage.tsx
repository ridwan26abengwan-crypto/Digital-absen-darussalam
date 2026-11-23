import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  const fallbackPath =
    userProfile?.role === 'ADMIN' ? '/admin/dashboard' : '/guru/dashboard';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(fallbackPath, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fallbackPath, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] dark:bg-[#070d12] p-6">
      <div className="surface-card max-w-md w-full border-rose-200 dark:border-rose-900/70 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-rose-700 dark:text-rose-400">
          ACCESS DENIED
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Anda tidak memiliki hak akses untuk membuka halaman administrasi tersebut.
          Anda akan diarahkan kembali dalam{' '}
          <span className="font-mono font-bold tabular-nums">{countdown}</span> detik.
        </p>
        <button
          type="button"
          onClick={() => navigate(fallbackPath, { replace: true })}
          className="btn-primary mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
};
