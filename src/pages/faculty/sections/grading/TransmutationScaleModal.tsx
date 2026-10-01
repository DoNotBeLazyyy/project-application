import CommonModal from '@components/modal/CommonModal';
import { CheckCircleIcon, ScalesIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';
import { getTransmutationTable } from '@services/grading-config.service';
import { TransmutationRow } from '@type/grading-config.type';
import { useEffect, useState } from 'react';

const FALLBACK_TRANSMUTATION_ROWS = [
    { label: '1.00', min_percentage: 98, max_percentage: 100, transmuted_grade: 1.00, is_passing: true, description: 'Excellent' },
    { label: '1.25', min_percentage: 95, max_percentage: 97, transmuted_grade: 1.25, is_passing: true, description: 'Superior' },
    { label: '1.50', min_percentage: 92, max_percentage: 94, transmuted_grade: 1.50, is_passing: true, description: 'Very Good' },
    { label: '1.75', min_percentage: 89, max_percentage: 91, transmuted_grade: 1.75, is_passing: true, description: 'Good' },
    { label: '2.00', min_percentage: 86, max_percentage: 88, transmuted_grade: 2.00, is_passing: true, description: 'Meritorious' },
    { label: '2.25', min_percentage: 83, max_percentage: 85, transmuted_grade: 2.25, is_passing: true, description: 'Very Satisfactory' },
    { label: '2.50', min_percentage: 80, max_percentage: 82, transmuted_grade: 2.50, is_passing: true, description: 'Satisfactory' },
    { label: '2.75', min_percentage: 77, max_percentage: 79, transmuted_grade: 2.75, is_passing: true, description: 'Fairly Satisfactory' },
    { label: '3.00', min_percentage: 75, max_percentage: 76, transmuted_grade: 3.00, is_passing: true, description: 'Passing Grade' },
    { label: '4.00', min_percentage: 70, max_percentage: 74, transmuted_grade: 4.00, is_passing: false, description: 'Conditional' },
    { label: '5.00', min_percentage: 0, max_percentage: 69, transmuted_grade: 5.00, is_passing: false, description: 'Failed' },
    { label: 'INC', min_percentage: null, max_percentage: null, transmuted_grade: null, is_passing: false, description: 'Incomplete' },
    { label: 'DRP', min_percentage: null, max_percentage: null, transmuted_grade: null, is_passing: false, description: 'Officially Dropped' }
];

interface TransmutationScaleModalProps {
    open: boolean;
    onClose: () => void;
}

export default function TransmutationScaleModal({ open, onClose }: TransmutationScaleModalProps) {
    const [rows, setRows] = useState<typeof FALLBACK_TRANSMUTATION_ROWS>(FALLBACK_TRANSMUTATION_ROWS);

    useEffect(() => {
        if (!open) return;
        async function fetchScale() {
            const res = await getTransmutationTable();
            if (res.data && res.data.length > 0) {
                // map to format
                const mapped = res.data.map((r: TransmutationRow) => ({
                    description: r.description || '',
                    is_passing: Number(r.transmuted_grade) <= 3.00,
                    label: String(r.transmuted_grade),
                    max_percentage: null as number | null,
                    min_percentage: Number(r.min_percentage),
                    transmuted_grade: Number(r.transmuted_grade)
                }));
                // compute max percentage based on previous
                for (let i = 0; i < mapped.length; i++) {
                    if (i === 0) {
                        mapped[i].max_percentage = 100;
                    } else if (mapped[i - 1].min_percentage !== null) {
                        mapped[i].max_percentage = (mapped[i - 1].min_percentage as number) - 1;
                    }
                }
                setRows(mapped);
            }
        }
        fetchScale();
    }, [open]);

    if (!open) return null;

    return (
        <CommonModal
            dialogProps={{
                fullWidth: true,
                maxWidth: 'md'
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col max-h-[85vh] bg-white dark:bg-zinc-950 text-slate-800 dark:text-slate-100 rounded-2xl overflow-hidden p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                            <ScalesIcon size={20} weight="duotone" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                                Academic Year Transmutation Schema
                            </h3>
                            <p className="text-xs text-slate-500">
                                Official institutional conversion ladder from raw percentage scores to transmuted grades.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <XIcon size={18} weight="bold" />
                    </button>
                </div>

                {/* Body: Bento Card Grid of Transmutation Ladder */}
                <div className="flex-1 min-h-0 overflow-y-auto py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rows.map((row, idx) => {
                            const isPassing = row.is_passing;
                            const isSpecial = row.label === 'INC' || row.label === 'DRP';

                            return (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 shadow-2xs ${
                                        isSpecial
                                            ? 'bg-slate-50/80 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800'
                                            : isPassing
                                            ? 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                                            : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-base px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200">
                                                {row.label}
                                            </span>
                                            {isSpecial ? (
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                                                    Special Status
                                                </span>
                                            ) : isPassing ? (
                                                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircleIcon size={12} weight="fill" />
                                                    Passing
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                    <XCircleIcon size={12} weight="fill" />
                                                    Failing
                                                </span>
                                            )}
                                        </div>

                                        <span className="font-mono text-xs font-semibold text-slate-500">
                                            {row.min_percentage !== null
                                                ? `${row.min_percentage}%${row.max_percentage !== null ? ` – ${row.max_percentage}%` : '+'}`
                                                : 'Special'}
                                        </span>
                                    </div>

                                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        {row.description}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Standard institutional grading scale (Passing threshold: 75% / 3.00)</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </CommonModal>
    );
}
