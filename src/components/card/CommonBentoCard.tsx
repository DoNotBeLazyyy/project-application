import { DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { ChangeEventInput, MouseEventButtonElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface BentoCardMetric {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
}

export interface BentoCardProgress {
    current: number;
    formatPercent?: boolean;
    label?: string;
    total: number;
}

export interface BentoCardAction {
    disabled?: boolean;
    label: string;
    onClick: (event?: MouseEventButtonElement) => void;
}

export interface BentoCardFaculty {
    avatarUrl?: string;
    name: string;
    role?: string;
}

export interface CommonBentoCardProps {
    actionMenu?: ReactNode;
    className?: string;
    code?: string;
    extraContent?: ReactNode;
    faculty?: BentoCardFaculty;
    footerMeta?: ReactNode;
    hasCheckbox?: boolean;
    isSelected?: boolean;
    metrics?: BentoCardMetric[];
    primaryAction?: BentoCardAction;
    progress?: BentoCardProgress;
    secondaryAction?: BentoCardAction;
    status?: string;
    subtitle?: string;
    title: string;
    onClick?: () => void;
    onToggleSelect?: (selected: boolean) => void;
}

export default function CommonBentoCard({
    actionMenu,
    className,
    code,
    extraContent,
    faculty,
    footerMeta,
    hasCheckbox = true,
    isSelected = false,
    metrics = [],
    primaryAction,
    progress,
    secondaryAction,
    status = 'Active',
    subtitle,
    title,
    onClick,
    onToggleSelect
}: CommonBentoCardProps) {
    function handleCheckboxChange(event: ChangeEventInput) {
        event.stopPropagation();
        onToggleSelect?.(event.target.checked);
    }

    function handleCardClick() {
        onClick?.();
    }

    const progressPercentage = progress && progress.total > 0
        ? Math.min(100, Math.max(0, Math.round((progress.current / progress.total) * 100)))
        : 0;

    const isHighCapacity = progressPercentage >= 90;

    return (
        <div
            className={classMerge(
                'bg-white border rounded-2xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between select-none relative group',
                isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md',
                onClick
                    ? 'cursor-pointer'
                    : '',
                className
            )}
            onClick={handleCardClick}
        >
            <div>
                {/* 1. Header: Checkbox + Code Pill + Status Pill + Three Dots */}
                <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2 min-w-0">
                        {hasCheckbox && (
                            <div
                                className="shrink-0 flex items-center"
                                onClick={function(e) {
                                    e.stopPropagation();
                                }}
                            >
                                <input
                                    checked={isSelected}
                                    className="h-4.5 w-4.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-colors"
                                    type="checkbox"
                                    onChange={handleCheckboxChange}
                                />
                            </div>
                        )}

                        {code && (
                            <span className="bg-blue-50/90 text-blue-700 font-bold px-2.5 py-0.5 rounded-full text-xs border border-blue-200/70 shrink-0 font-mono tracking-tight">
                                {code}
                            </span>
                        )}

                        {status && (
                            <span
                                className={classMerge(
                                    'px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 border',
                                    status.toLowerCase() === 'active' || status.toLowerCase() === 'open'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                        : status.toLowerCase() === 'ongoing' || status.toLowerCase() === 'full'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                )}>
                                {status}
                            </span>
                        )}
                    </div>

                    <div
                        className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        onClick={function(e) {
                            e.stopPropagation();
                        }}
                    >
                        {actionMenu ?? (
                            <button
                                aria-label="Card actions"
                                className="cursor-pointer flex items-center justify-center"
                                type="button"
                            >
                                <DotsThreeVerticalIcon size={18} weight="bold" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Hero Title & Optional Subtitle */}
                <div className="mb-3.5">
                    <h3
                        className="font-bold text-base text-slate-900 tracking-tight line-clamp-1 leading-snug"
                        title={title}
                    >
                        {title}
                    </h3>
                    {subtitle && subtitle !== title && subtitle !== code && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* 3. Faculty In-Charge Card */}
                {faculty && (
                    <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-2.5 flex items-center gap-3 mb-3">
                        {faculty.avatarUrl
                            ? (
                                <img
                                    alt={faculty.name}
                                    className="h-9 w-9 rounded-full object-cover border border-white shadow-2xs shrink-0"
                                    src={faculty.avatarUrl}
                                />
                            )
                            : (
                                <div className="h-9 w-9 rounded-full bg-slate-200 border border-white shadow-2xs shrink-0 flex items-center justify-center font-bold text-xs text-slate-700">
                                    {faculty.name.split(' ')
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join('')}
                                </div>
                            )
                        }
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase leading-none">
                                {faculty.role ?? 'FACULTY IN-CHARGE'}
                            </p>
                            <p className="text-xs font-bold text-slate-800 leading-tight mt-1 truncate">
                                {faculty.name}
                            </p>
                        </div>
                    </div>
                )}

                {/* 4. 2-Column Metrics Grid */}
                {metrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3.5">
                        {metrics.slice(0, 2)
                            .map(function(metric, index) {
                                return (
                                    <div
                                        className="bg-slate-50/90 border border-slate-100 rounded-xl p-2.5"
                                        key={index}
                                    >
                                        <span className="block text-[10px] font-medium text-slate-400 leading-none">
                                            {metric.label}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-800 leading-tight mt-1 line-clamp-1">
                                            {metric.value}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}

                {/* 5. Capacity / Progress Bar */}
                {progress && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs leading-none">
                            <span className="font-medium text-slate-500">
                                {progress.label ?? 'Capacity'}
                            </span>
                            <span className="font-bold text-slate-800">
                                {progress.current} / {progress.total}
                                {progress.formatPercent !== false && (
                                    <span className="font-normal text-slate-400 text-xs ml-1">
                                        ({progressPercentage}%)
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                                className={classMerge(
                                    'h-full rounded-full transition-all duration-300',
                                    isHighCapacity
                                        ? 'bg-amber-500'
                                        : 'bg-blue-600'
                                )}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {extraContent}
            </div>

            {/* 6. Footer Row: Left Meta + Right Action Buttons */}
            <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between gap-2 mt-auto">
                <div className="text-xs text-slate-400 font-medium truncate min-w-0">
                    {footerMeta ?? '1st Sem AY 25-26'}
                </div>

                <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={function(e) {
                        e.stopPropagation();
                    }}
                >
                    {secondaryAction && (
                        <button
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            disabled={secondaryAction.disabled}
                            type="button"
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.label}
                        </button>
                    )}

                    {primaryAction && (
                        <button
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            disabled={primaryAction.disabled}
                            type="button"
                            onClick={primaryAction.onClick}
                        >
                            {primaryAction.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}