import TruncatedText from '@components/card/TruncatedText';
import { CheckSquareIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { ChangeEventInput, MouseEventButtonElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface BentoCardMetric {
    icon?: ReactNode;
    label: string;
    value: ReactNode;
}

export type BentoCardFactTone = 'danger' | 'info' | 'neutral' | 'positive' | 'warning';

export interface BentoCardFact {
    icon?: ReactNode;
    label: string;
    /** Colour cue: `positive` (good), `warning` (an obligation), `info` (guidance / required condition), `danger` (blocking). */
    tone?: BentoCardFactTone;
    value: string;
}

export interface BentoCardDetail {
    label: string;
    value: string;
    /** Lines shown before the value is clamped and a hover tooltip kicks in. Default 2. */
    lines?: 1 | 2 | 3 | 4;
    /** Placeholder rendered (muted, italic) when `value` is empty. */
    emptyText?: string;
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
    /** Full-width rows for long, user-entered values (description, notes …). Each sits on its own row. */
    details?: BentoCardDetail[];
    extraContent?: ReactNode;
    faculty?: BentoCardFaculty;
    /** Render the faculty box in a muted "Not assigned" state when `faculty` is absent. */
    facultyNotAssigned?: boolean;
    /** Compact attribute chips. They share a row while they fit and stack as the card narrows. */
    facts?: BentoCardFact[];
    footerMeta?: ReactNode;
    hasCheckbox?: boolean;
    isSelected?: boolean;
    metrics?: BentoCardMetric[];
    primaryAction?: BentoCardAction;
    progress?: BentoCardProgress;
    secondaryAction?: BentoCardAction;
    /** How the selection affordance renders: a checkbox (default) or a "Select" button. */
    selectVariant?: 'checkbox' | 'button';
    status?: string;
    subtitle?: string;
    title: string;
    onClick?: () => void;
    onToggleSelect?: (selected: boolean) => void;
}

const FACT_TONE_CLASS: Record<BentoCardFactTone, { container: string; label: string; value: string }> = {
    danger: {
        container: 'bg-rose-50/70 border-rose-100',
        label: 'text-rose-500',
        value: 'text-rose-700'
    },
    info: {
        container: 'bg-blue-50/70 border-blue-100',
        label: 'text-blue-600',
        value: 'text-blue-700'
    },
    neutral: {
        container: 'bg-slate-50/90 border-slate-100',
        label: 'text-slate-400',
        value: 'text-slate-800'
    },
    positive: {
        container: 'bg-emerald-50/70 border-emerald-100',
        label: 'text-emerald-600',
        value: 'text-emerald-700'
    },
    warning: {
        container: 'bg-amber-50/70 border-amber-100',
        label: 'text-amber-600',
        value: 'text-amber-700'
    }
};

export default function CommonBentoCard({
    actionMenu,
    className,
    code,
    details = [],
    extraContent,
    faculty,
    facultyNotAssigned = false,
    facts = [],
    footerMeta,
    hasCheckbox = true,
    isSelected = false,
    metrics = [],
    primaryAction,
    progress,
    secondaryAction,
    selectVariant = 'checkbox',
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
                'bg-white border rounded-2xl p-4.5 shadow-xs transition-all duration-200 flex flex-col justify-between select-none relative group h-full',
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
                <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-2 items-center min-w-0">
                        {hasCheckbox && (
                            <div
                                className="flex items-center shrink-0"
                                onClick={function(e) {
                                    e.stopPropagation();
                                }}
                            >
                                {selectVariant === 'button'
                                    ? (
                                        <button
                                            className={classMerge(
                                                'text-xs font-bold px-2 sm:px-3 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1',
                                                isSelected
                                                    ? 'bg-blue-800 text-white border-blue-800 ring-2 ring-blue-600/30'
                                                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                            )}
                                            type="button"
                                            title={isSelected ? 'Unselect' : 'Select'}
                                            aria-label={isSelected ? 'Unselect' : 'Select'}
                                            onClick={function() {
                                                onToggleSelect?.(!isSelected);
                                            }}
                                        >
                                            <CheckSquareIcon size={14} weight="bold" />
                                            <span className="hidden sm:inline">
                                                {isSelected
                                                    ? 'Unselect'
                                                    : 'Select'}
                                            </span>
                                        </button>
                                    )
                                    : (
                                        <input
                                            checked={isSelected}
                                            className="border-slate-300 cursor-pointer focus:ring-blue-500 h-4.5 rounded-md text-blue-600 transition-colors w-4.5"
                                            type="checkbox"
                                            onChange={handleCheckboxChange}
                                        />
                                    )}
                            </div>
                        )}

                        {code && (
                            <span className="bg-blue-50/90 border border-blue-200/70 font-bold font-mono px-2.5 py-0.5 rounded-full shrink-0 text-blue-700 text-xs tracking-tight">
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

                    {actionMenu && (
                        <div
                            className="hover:bg-slate-100 hover:text-slate-600 p-1 rounded-lg shrink-0 text-slate-400 transition-colors"
                            onClick={function(e) {
                                e.stopPropagation();
                            }}
                        >
                            {actionMenu}
                        </div>
                    )}
                </div>

                {/* 2. Hero Title & Optional Subtitle */}
                <div className="mb-3">
                    <TruncatedText
                        as="h3"
                        className="font-bold leading-snug text-base text-slate-900 tracking-tight"
                        text={title}
                    />
                    {subtitle && subtitle !== title && subtitle !== code && (
                        <TruncatedText
                            className="mt-0.5 text-slate-500 text-xs"
                            text={subtitle}
                        />
                    )}
                </div>

                {/* 3. Faculty In-Charge Card */}
                {(faculty || facultyNotAssigned) && (
                    <div className="bg-slate-50/90 border border-slate-100 flex gap-3 items-center mb-3 p-2.5 rounded-xl">
                        {faculty?.avatarUrl
                            ? (
                                <img
                                    alt={faculty.name}
                                    className="border border-white h-9 object-cover rounded-full shadow-2xs shrink-0 w-9"
                                    src={faculty.avatarUrl}
                                />
                            )
                            : (
                                <div
                                    className={classMerge(
                                        'h-9 w-9 rounded-full border border-white shadow-2xs shrink-0 flex items-center justify-center font-bold text-xs',
                                        faculty
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-slate-100 text-slate-400'
                                    )}
                                >
                                    {faculty
                                        ? faculty.name.split(' ')
                                            .map((n) => n[0])
                                            .slice(0, 2)
                                            .join('')
                                        : '—'}
                                </div>
                            )
                        }
                        <div className="min-w-0">
                            <p className="font-bold leading-none text-[10px] text-slate-400 tracking-wider uppercase">
                                {faculty?.role ?? 'FACULTY IN-CHARGE'}
                            </p>
                            <p
                                className={classMerge(
                                    'text-xs leading-tight mt-1 truncate',
                                    faculty
                                        ? 'font-bold text-slate-800'
                                        : 'font-medium text-slate-400 italic'
                                )}
                            >
                                {faculty
                                    ? faculty.name
                                    : 'Not assigned'}
                            </p>
                        </div>
                    </div>
                )}

                {/* 4. Metrics Grid — 1 column if single metric, 2 columns if multiple */}
                {metrics.length > 0 && (
                    <div
                        className={classMerge(
                            'grid gap-2',
                            metrics.length === 1
                                ? 'grid-cols-1'
                                : 'grid-cols-2',
                            (facts.length > 0 || progress || details.length > 0 || extraContent)
                                ? 'mb-3'
                                : ''
                        )}
                    >
                        {metrics.map(function(metric, index) {
                            return (
                                <div
                                    className="bg-slate-50/90 border border-slate-100 p-2.5 rounded-xl"
                                    key={index}
                                >
                                    <span className="block font-medium leading-none text-[10px] text-slate-400">
                                        {metric.label}
                                    </span>
                                    {typeof metric.value === 'string'
                                        ? (
                                            <TruncatedText
                                                className="font-semibold leading-tight mt-1 text-slate-800 text-xs"
                                                text={metric.value}
                                            />
                                        )
                                        : (
                                            <div className="font-semibold leading-tight line-clamp-1 mt-1 text-slate-800 text-xs">
                                                {metric.value}
                                            </div>
                                        )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 4b. Fact chips — short attributes that sit side by side while
                    there is room. `flex-wrap` + a 7rem basis means as many as fit
                    share the row, the last row stretches to fill, and a narrow card
                    (small screen, or 4 columns on a wide one) drops them to one
                    per row instead of squeezing them. */}
                {facts.length > 0 && (
                    <div
                        className={classMerge(
                            'flex flex-wrap gap-2',
                            (progress || details.length > 0 || extraContent)
                                ? 'mb-3.5'
                                : ''
                        )}
                    >
                        {facts.map(function(fact, index) {
                            const tone = FACT_TONE_CLASS[fact.tone ?? 'neutral'];

                            return (
                                <div
                                    className={classMerge(
                                        'basis-28 border grow min-w-0 p-2.5 rounded-xl',
                                        tone.container
                                    )}
                                    key={index}
                                >
                                    <div className="flex gap-1 items-center">
                                        {fact.icon && (
                                            <span className={classMerge('flex items-center shrink-0', tone.label)}>
                                                {fact.icon}
                                            </span>
                                        )}
                                        <span
                                            className={classMerge(
                                                'font-bold leading-none min-w-0 text-[10px] tracking-wider truncate uppercase',
                                                tone.label
                                            )}
                                        >
                                            {fact.label}
                                        </span>
                                    </div>
                                    <TruncatedText
                                        className={classMerge(
                                            'font-semibold leading-tight mt-1 text-xs',
                                            tone.value
                                        )}
                                        text={fact.value}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 5. Capacity / Progress Bar */}
                {progress && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between leading-none text-xs">
                            <span className="font-medium text-slate-500">
                                {progress.label ?? 'Capacity'}
                            </span>
                            <span className="font-bold text-slate-800">
                                {progress.current} / {progress.total}
                                {progress.formatPercent !== false && (
                                    <span className="font-normal ml-1 text-slate-400 text-xs">
                                        ({progressPercentage}%)
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="bg-slate-100 h-1.5 mt-1.5 overflow-hidden rounded-full w-full">
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

                {/* 6. Full-width detail rows — long, user-entered values each get
                    their own row, clamped, with a hover tooltip when cut off. */}
                {details.length > 0 && (
                    <div
                        className={classMerge(
                            'flex flex-col gap-2',
                            (extraContent || footerMeta || primaryAction || secondaryAction)
                                ? 'mb-3'
                                : ''
                        )}
                    >
                        {details.map(function(detail, index) {
                            const hasValue = Boolean(detail.value && detail.value.trim());

                            return (
                                <div
                                    className="bg-slate-50/90 border border-slate-100 p-2.5 rounded-xl"
                                    key={index}
                                >
                                    <span className="block font-bold leading-none text-[10px] text-slate-400 tracking-wider uppercase">
                                        {detail.label}
                                    </span>
                                    <TruncatedText
                                        className={classMerge(
                                            'text-xs leading-snug mt-1',
                                            hasValue
                                                ? 'font-medium text-slate-700'
                                                : 'font-medium text-slate-400 italic'
                                        )}
                                        lines={detail.lines ?? 2}
                                        text={hasValue
                                            ? detail.value
                                            : (detail.emptyText ?? 'Not provided')}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {extraContent}
            </div>

            {/* 6. Footer Row: Left Meta + Right Action Buttons (only when there is something to show) */}
            {(footerMeta || primaryAction || secondaryAction) && (
                <div className="border-slate-100 border-t flex gap-2 items-center justify-between mt-auto pt-3.5">
                    <div className="font-medium min-w-0 text-slate-400 text-xs truncate">
                        {footerMeta}
                    </div>

                    <div
                        className="flex gap-2 items-center shrink-0"
                        onClick={function(e) {
                            e.stopPropagation();
                        }}
                    >
                        {secondaryAction && (
                            <button
                                className="bg-white border border-slate-200 cursor-pointer disabled:opacity-50 font-semibold hover:bg-slate-50 px-3 py-1 rounded-lg shadow-2xs text-slate-700 text-xs transition-colors"
                                disabled={secondaryAction.disabled}
                                type="button"
                                onClick={secondaryAction.onClick}
                            >
                                {secondaryAction.label}
                            </button>
                        )}

                        {primaryAction && (
                            <button
                                className="bg-blue-50 border border-blue-200 cursor-pointer disabled:opacity-50 font-bold hover:bg-blue-100 px-3 py-1 rounded-lg shadow-2xs text-blue-700 text-xs transition-colors"
                                disabled={primaryAction.disabled}
                                type="button"
                                onClick={primaryAction.onClick}
                            >
                                {primaryAction.label}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}