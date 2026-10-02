import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import {
    CheckCircleIcon,
    CopySimpleIcon,
    ListPlusIcon,
    SparkleIcon,
    XIcon
} from '@phosphor-icons/react';
import { WizardGradingPeriodComponentItem, WizardTermItem } from '@type/school-year.type';
import { useMemo, useState } from 'react';
import { DEFAULT_GRADING_COMPONENTS } from './wizard.constants';

export interface CopyComponentBreakdownModalProps {
    open: boolean;
    onClose: () => void;
    targetTermIndex: number;
    targetPeriodIndex: number;
    targetTermName: string;
    targetPeriodName: string;
    terms: WizardTermItem[];
    onApply: (
        components: WizardGradingPeriodComponentItem[],
        applyToAllInTerm: boolean,
        sourceLabel: string
    ) => void;
}

interface ComponentPresetOption {
    id: string;
    title: string;
    description: string;
    components: WizardGradingPeriodComponentItem[];
    isPreset: boolean;
}

const PRESET_OPTIONS: ComponentPresetOption[] = [
    {
        id: 'preset_standard_30_30_40',
        title: 'Standard 30 / 30 / 40 Breakdown',
        description: 'Balanced for general collegiate courses with quizzes, coursework, and major exam.',
        isPreset: true,
        components: [
            { id: 'c1', name: 'Quizzes', weight: 30 },
            { id: 'c2', name: 'Class Standing', weight: 30 },
            { id: 'c3', name: 'Major Exam', weight: 40 }
        ]
    },
    {
        id: 'preset_four_tier_20_20_30_30',
        title: '4-Tier Comprehensive (20 / 20 / 30 / 30)',
        description: 'Includes written works, regular quizzes, performance tasks, and periodic examination.',
        isPreset: true,
        components: [
            { id: 'c1', name: 'Written Works', weight: 20 },
            { id: 'c2', name: 'Quizzes & Assignments', weight: 20 },
            { id: 'c3', name: 'Performance Tasks', weight: 30 },
            { id: 'c4', name: 'Major Examination', weight: 30 }
        ]
    },
    {
        id: 'preset_even_split_50_50',
        title: '50 / 50 Assessment & Major Exam',
        description: 'Even distribution between ongoing coursework/projects and terminal examination.',
        isPreset: true,
        components: [
            { id: 'c1', name: 'Coursework & Performance Tasks', weight: 50 },
            { id: 'c2', name: 'Major Examination', weight: 50 }
        ]
    }
];

export default function CopyComponentBreakdownModal({
    open,
    onClose,
    targetTermIndex,
    targetPeriodIndex,
    targetTermName,
    targetPeriodName,
    terms,
    onApply
}: CopyComponentBreakdownModalProps) {
    const [selectedOptionId, setSelectedOptionId] = useState<string>('');
    const [applyToAllInTerm, setApplyToAllInTerm] = useState(false);

    // Collect configured periods from all terms except the current target period
    const availablePeriodSources = useMemo(() => {
        const list: {
            id: string;
            termIndex: number;
            periodIndex: number;
            termLabel: string;
            periodLabel: string;
            components: WizardGradingPeriodComponentItem[];
            totalWeight: number;
        }[] = [];

        terms.forEach((term, tIdx) => {
            const tLabel = term.term_type_label || `Term #${tIdx + 1}`;
            (term.grading_periods || []).forEach((gp, pIdx) => {
                // Skip the target period itself
                if (tIdx === targetTermIndex && pIdx === targetPeriodIndex) {
                    return;
                }

                if (gp.components && gp.components.length > 0) {
                    const totalWeight = gp.components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
                    list.push({
                        id: `source_${tIdx}_${pIdx}`,
                        termIndex: tIdx,
                        periodIndex: pIdx,
                        termLabel: tLabel,
                        periodLabel: gp.name || `Period #${pIdx + 1}`,
                        components: gp.components,
                        totalWeight
                    });
                }
            });
        });

        return list;
    }, [terms, targetTermIndex, targetPeriodIndex]);

    // Set default selection when modal opens
    const allOptions = useMemo(() => {
        return [
            ...availablePeriodSources.map((s) => ({
                id: s.id,
                title: `${s.termLabel} — ${s.periodLabel}`,
                badge: `${s.totalWeight}/100`,
                components: s.components,
                isFromPeriod: true
            })),
            ...PRESET_OPTIONS.map((p) => ({
                id: p.id,
                title: p.title,
                badge: '100/100',
                description: p.description,
                components: p.components,
                isFromPeriod: false
            }))
        ];
    }, [availablePeriodSources]);

    const activeSelectedId = selectedOptionId || allOptions[0]?.id || '';

    function handleConfirm() {
        const selected = allOptions.find((opt) => opt.id === activeSelectedId);
        if (!selected) return;

        const clonedComponents: WizardGradingPeriodComponentItem[] = selected.components.map((c, i) => ({
            ...c,
            id: `comp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
        }));

        onApply(clonedComponents, applyToAllInTerm, selected.title);
        onClose();
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-xl p-0 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]'
            }}
            fullWidth
            maxWidth="sm"
            open={open}
            onClose={onClose}
        >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CopySimpleIcon className="w-5 h-5" weight="bold" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Copy Component Breakdown
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Target: <span className="font-semibold text-slate-800 dark:text-slate-200">{targetTermName}</span> &rsaquo; <span className="font-semibold text-brand-600 dark:text-brand-400">{targetPeriodName}</span>
                        </p>
                    </div>
                </div>

                <button
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-zinc-900/40">
                {/* Available Source Periods */}
                <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <ListPlusIcon className="w-4 h-4 text-brand-600" />
                        <span>Copy from Another Grading Period</span>
                    </div>

                    {availablePeriodSources.length === 0 ? (
                        <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-800/40 text-xs text-slate-500">
                            No other configured grading periods with components yet. You can pick a standard template below.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {availablePeriodSources.map((source) => {
                                const isSelected = activeSelectedId === source.id;

                                return (
                                    <div
                                        key={source.id}
                                        className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                                            isSelected
                                                ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 shadow-xs ring-1 ring-blue-500/20'
                                                : 'bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                                        }`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedOptionId(source.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedOptionId(source.id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-600 text-white'
                                                            : 'border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                                                    }`}
                                                >
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {source.termLabel} — {source.periodLabel}
                                                </span>
                                            </div>

                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-300 shrink-0">
                                                {source.totalWeight}/100
                                            </span>
                                        </div>

                                        {/* Component Chips */}
                                        <div className="flex items-center gap-1.5 flex-wrap pl-6">
                                            {source.components.map((comp, cIdx) => (
                                                <span
                                                    key={comp.id || cIdx}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                                                >
                                                    <span>{comp.name || `Component ${cIdx + 1}`}</span>
                                                    <span className="font-bold text-brand-600 dark:text-brand-400">{comp.weight}%</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Preset Templates */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <SparkleIcon className="w-4 h-4 text-amber-500" />
                        <span>Standard Breakdown Templates</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        {PRESET_OPTIONS.map((preset) => {
                            const isSelected = activeSelectedId === preset.id;

                            return (
                                <div
                                    key={preset.id}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                                        isSelected
                                            ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 shadow-xs ring-1 ring-blue-500/20'
                                            : 'bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                                    }`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedOptionId(preset.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedOptionId(preset.id);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                                                }`}
                                            >
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                {preset.title}
                                            </span>
                                        </div>

                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                            100/100
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 mb-2">
                                        {preset.description}
                                    </p>

                                    {/* Component Chips */}
                                    <div className="flex items-center gap-1.5 flex-wrap pl-6">
                                        {preset.components.map((comp, cIdx) => (
                                            <span
                                                key={comp.id || cIdx}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                                            >
                                                <span>{comp.name}</span>
                                                <span className="font-bold text-brand-600 dark:text-brand-400">{comp.weight}%</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Apply to all in term checkbox */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 cursor-pointer select-none">
                        <input
                            checked={applyToAllInTerm}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            type="checkbox"
                            onChange={(e) => setApplyToAllInTerm(e.target.checked)}
                        />
                        <div className="text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Also apply this breakdown to all grading periods in {targetTermName}
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex items-center justify-end gap-2.5">
                <CommonButton
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={onClose}
                >
                    Cancel
                </CommonButton>
                <CommonButton
                    color="primary"
                    size="small"
                    startIcon={<CheckCircleIcon className="w-4 h-4" weight="bold" />}
                    variant="contained"
                    onClick={handleConfirm}
                >
                    Apply Breakdown
                </CommonButton>
            </div>
        </CommonModal>
    );
}
