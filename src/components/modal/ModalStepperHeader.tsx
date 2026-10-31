import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { CaretDownIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

export interface ModalStepItem {
    step: number;
    title: string;
    subtitle?: string;
    diffCount?: number;
}

interface ModalStepperHeaderProps {
    steps: ModalStepItem[];
    currentStep: number;
    onStepClick: (stepNumber: number) => void;
    readOnly?: boolean;
}

export default function ModalStepperHeader({
    steps,
    currentStep,
    onStepClick,
    readOnly = false
}: ModalStepperHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    // Each step starts at the top: the step body is the scrollable element rendered after this header
    useEffect(() => {
        let body = headerRef.current?.nextElementSibling ?? null;
        while (body && !body.className.includes('overflow-y-auto')) {
            body = body.querySelector('.overflow-y-auto');
        }
        if (body) {
            body.scrollTop = 0;
        }
    }, [currentStep]);

    const activeStepConfig = steps.find((s) => s.step === currentStep) || steps[0];
    const hasDiffTracking = steps.some((s) => typeof s.diffCount === 'number');
    const activeHasDiff = (activeStepConfig?.diffCount ?? 0) > 0;

    function handleSelectStep(stepNumber: number) {
        setIsMenuOpen(false);
        onStepClick(stepNumber);
    }

    return (
        <div
            className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 px-2 py-1 sm:px-5 sm:py-2.5 shrink-0 relative space-y-2"
            ref={headerRef}
        >
            <div
                className={`w-full flex items-center justify-between gap-2.5 p-1.5 sm:p-3 rounded-xl bg-white dark:bg-zinc-800 border shadow-xs transition-all group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 select-none ${
                    activeHasDiff
                        ? 'border-amber-300 dark:border-amber-700/80 hover:border-amber-400 dark:hover:border-amber-600'
                        : 'border-slate-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsMenuOpen((prev) => !prev);
                    }
                }}
            >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${
                            activeHasDiff
                                ? 'bg-amber-500 dark:bg-amber-600'
                                : 'bg-blue-600'
                        }`}
                    >
                        {currentStep}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="hidden sm:flex items-center gap-2 flex-wrap">
                            <span
                                className={`text-[11px] font-semibold uppercase tracking-wide ${
                                    activeHasDiff
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-blue-600 dark:text-blue-400'
                                }`}
                            >
                                Step {currentStep} of {steps.length}
                            </span>
                            {typeof activeStepConfig?.diffCount === 'number' && (
                                <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none ${
                                        activeHasDiff
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                            : 'bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-slate-400'
                                    }`}
                                >
                                    {activeHasDiff
                                        ? `${activeStepConfig.diffCount} ${activeStepConfig.diffCount === 1
                                            ? 'diff'
                                            : 'diffs'}`
                                        : 'No diff'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                <span className="font-semibold sm:hidden text-blue-600 dark:text-blue-400">
                                    {currentStep}/{steps.length} ·{' '}
                                </span>
                                {activeStepConfig?.title}
                            </span>
                            {activeStepConfig?.subtitle && (
                                <div
                                    className="inline-flex shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                >
                                    <CommonInfoTooltip
                                        content={activeStepConfig.subtitle}
                                        label={`Info for Step ${currentStep}: ${activeStepConfig.title}`}
                                        size={15}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Choose Step
                    </span>
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-700/60 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-blue-600 transition-colors">
                        <CaretDownIcon
                            className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen
                                ? 'rotate-180'
                                : ''}`}
                            weight="bold"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Step Diff Indicator Strip when comparing versions */}
            {hasDiffTracking && (
                <div className="hidden sm:grid sm:grid-cols-6 gap-1.5">
                    {steps.map((s) => {
                        const isCurrent = s.step === currentStep;
                        const diffCount = s.diffCount ?? 0;
                        const hasDiff = diffCount > 0;

                        return (
                            <button
                                className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer min-w-0 ${
                                    hasDiff
                                        ? isCurrent
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100/80 dark:hover:bg-amber-900/50'
                                        : isCurrent
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-white dark:bg-zinc-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800'
                                }`}
                                key={s.step}
                                title={`Step ${s.step}: ${s.title}${hasDiff
                                    ? ` (${diffCount} ${diffCount === 1
                                        ? 'difference'
                                        : 'differences'})`
                                    : ' (No differences)'}`}
                                type="button"
                                onClick={() => handleSelectStep(s.step)}
                            >
                                <span className="truncate">
                                    S{s.step}: {s.title}
                                </span>
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 ${
                                        hasDiff
                                            ? isCurrent
                                                ? 'bg-white/25 text-white'
                                                : 'bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                                            : isCurrent
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    {diffCount}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Backdrop for click outside */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Stepper Dropdown List */}
            {isMenuOpen && (
                <div className="absolute top-full left-3.5 right-3.5 sm:left-5 sm:right-5 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2.5 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Navigate Steps
                    </div>
                    <div className="pt-1.5 flex flex-col gap-1">
                        {steps.map((s) => {
                            const isActive = currentStep === s.step;
                            const isDone = !readOnly && !hasDiffTracking && currentStep > s.step;
                            const diffCount = s.diffCount ?? 0;
                            const hasDiff = diffCount > 0;

                            return (
                                <div
                                    className={`w-full flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl text-left transition-all cursor-pointer select-none ${
                                        hasDiff
                                            ? isActive
                                                ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
                                                : 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 text-slate-800 dark:text-slate-200'
                                            : isActive
                                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-100'
                                                : 'hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-slate-700 dark:text-slate-300 border border-transparent'
                                    }`}
                                    key={s.step}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelectStep(s.step)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleSelectStep(s.step);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span
                                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${
                                                hasDiff
                                                    ? 'bg-amber-500 text-white'
                                                    : isDone
                                                        ? 'bg-emerald-500 text-white'
                                                        : isActive
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {isDone
                                                ? (
                                                    <CheckCircleIcon
                                                        className="w-4 h-4"
                                                        weight="bold"
                                                    />
                                                )
                                                : s.step}
                                        </span>
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span
                                                className={`text-xs font-bold truncate ${
                                                    hasDiff
                                                        ? 'text-amber-800 dark:text-amber-300'
                                                        : isActive
                                                            ? 'text-blue-700 dark:text-blue-300'
                                                            : 'text-slate-800 dark:text-slate-200'
                                                }`}
                                            >
                                                Step {s.step}: {s.title}
                                            </span>
                                            {s.subtitle && (
                                                <div
                                                    className="inline-flex shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                >
                                                    <CommonInfoTooltip
                                                        content={s.subtitle}
                                                        label={`Info for Step ${s.step}: ${s.title}`}
                                                        size={13}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {typeof s.diffCount === 'number' && (
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    hasDiff
                                                        ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400'
                                                }`}
                                            >
                                                {hasDiff
                                                    ? `${diffCount} ${diffCount === 1
                                                        ? 'diff'
                                                        : 'diffs'}`
                                                    : '0 diffs'}
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}