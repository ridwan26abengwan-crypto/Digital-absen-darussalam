import React, { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { useSchoolData } from '../../contexts/SchoolDataContext';
import { EmptyState, SkeletonTable } from '../../components/UiStates';

function formatAuditTime(ts: unknown): string {
  if (!ts) return '-';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    const d = (ts as { toDate: () => Date }).toDate();
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(ts);
}

export const AuditLogPage: React.FC = () => {
  const { auditLogs, dataLoading } = useSchoolData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.user.toLowerCase().includes(q) ||
        l.aktivitas.toLowerCase().includes(q) ||
        (l.data ?? '').toLowerCase().includes(q)
    );
  }, [auditLogs, search]);

  if (dataLoading) return <SkeletonTable rows={6} cols={5} />;

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Audit Log Sistem
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rekaman aktivitas penting pengguna yang tersimpan secara permanen dan tidak dapat diubah.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengguna atau aktivitas..."
            aria-label="Cari audit log"
            className="field-input pl-10 py-2"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Belum ada catatan audit"
          description="Aktivitas penting seperti login, absensi, dan perubahan data akan tercatat otomatis."
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="table-head-cell">Waktu</th>
                  <th className="table-head-cell">Pengguna</th>
                  <th className="table-head-cell">Role</th>
                  <th className="table-head-cell">Aktivitas</th>
                  <th className="table-head-cell">Detail Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.slice(0, 100).map((log) => (
                  <tr
                    key={log.logId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="table-body-cell font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {formatAuditTime(log.timestamp)}
                    </td>
                    <td className="table-body-cell font-semibold text-slate-900 dark:text-white">
                      {log.user}
                    </td>
                    <td className="table-body-cell">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {log.role}
                      </span>
                    </td>
                    <td className="table-body-cell font-medium">{log.aktivitas}</td>
                    <td className="table-body-cell text-xs text-slate-500 dark:text-slate-400">
                      {log.data || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
