import { CaretDownIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { useState } from 'react';

export interface ModalStepItem {
    step: number;
    title: string;
    subtitle?: string;
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

    const activeStepConfig = steps.find((s) => s.step === currentStep) || steps[0];

    function handleSelectStep(stepNumber: number) {
        setIsMenuOpen(false);
        onStepClick(stepNumber);
    }

    return (
        <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 px-4 py-3 shrink-0 relative">
            <button
                className="w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs transition-all group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {currentStep}
                    </span>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                Step {currentStep} of {steps.length}
                            </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {activeStepConfig?.title}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Choose Step
                    </span>
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-700/60 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-blue-600 transition-colors">
                        <CaretDownIcon className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} weight="bold" />
                    </div>
                </div>
            </button>

            {/* Backdrop for click outside */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Stepper Dropdown List */}
            {isMenuOpen && (
                <div className="absolute top-full left-4 right-4 mt-2 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2.5 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Navigate Steps
                    </div>
                    <div className="pt-1.5 flex flex-col gap-1">
                        {steps.map((s) => {
                            const isActive = currentStep === s.step;
                            const isDone = currentStep > s.step;

                            return (
                                <button
                                    key={s.step}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-100'
                                            : 'hover:bg-slate-50 dark:hover:bg-zinc-800/70 text-slate-700 dark:text-slate-300'
                                    }`}
                                    type="button"
                                    onClick={() => handleSelectStep(s.step)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${
                                                isDone
                                                    ? 'bg-emerald-500 text-white'
                                                    : isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {isDone ? <CheckCircleIcon className="w-4 h-4" weight="bold" /> : s.step}
                                        </span>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-xs font-bold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                                Step {s.step}: {s.title}
                                            </span>
                                            {s.subtitle && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {s.subtitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isActive && (
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 ml-2">
                                            Current
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
