import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import Checkbox from '@mui/material/Checkbox';
import { ChangeEventInput, MouseEventButtonElement } from '@type/common.type';
import { BadgeStatusVariant } from '@type/common/badge.type';
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
    statusVariant?: BadgeStatusVariant;
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
    hasCheckbox = false,
    isSelected = false,
    metrics = [],
    primaryAction,
    progress,
    secondaryAction,
    status,
    statusVariant = 'info',
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

    return (
        <div
            className={classMerge(
                'bg-white border rounded-xl shadow-xs transition-all duration-200 flex flex-col justify-between overflow-hidden',
                isSelected
                    ? 'border-(--mui-palette-primary-main) ring-2 ring-(--mui-palette-primary-main)/20'
                    : 'border-(--mui-palette-grey-200) hover:border-(--mui-palette-grey-300)',
                onClick
                    ? 'cursor-pointer hover:shadow-md'
                    : '',
                className
            )}
            onClick={handleCardClick}
        >
            {/* Card Header */}
            <div className="border-(--mui-palette-grey-100) border-b flex gap-2.5 items-start justify-between p-4 pb-3">
                <div className="flex gap-2 items-center min-w-0">
                    {hasCheckbox && (
                        <div
                            className="shrink-0"
                            onClick={function(e) {
                                e.stopPropagation();
                            }}
                        >
                            <Checkbox
                                checked={isSelected}
                                className="h-5 p-0 w-5"
                                size="small"
                                onChange={handleCheckboxChange}
                            />
                        </div>
                    )}
                    {code && (
                        <span className="bg-(--mui-palette-brand-50) border border-(--mui-palette-brand-200)/70 font-bold font-mono px-2 py-0.5 rounded-md shrink-0 text-(--mui-palette-brand-700) text-xs">
                            {code}
                        </span>
                    )}
                    {status && (
                        <div className="shrink-0">
                            <CommonBadgeStatus
                                label={status}
                                size="small"
                                variant={statusVariant}
                            />
                        </div>
                    )}
                </div>
                {actionMenu && (
                    <div
                        className="shrink-0"
                        onClick={function(e) {
                            e.stopPropagation();
                        }}
                    >
                        {actionMenu}
                    </div>
                )}
            </div>

            {/* Title & Subtitle */}
            <div className="pt-3 px-4 space-y-0.5">
                <h3
                    className="font-bold font-heading line-clamp-1 text-(--mui-palette-text-primary) text-sm"
                    title={title}
                >
                    {title}
                </h3>
                {subtitle && (
                    <p className="line-clamp-1 text-(--mui-palette-text-secondary) text-xs">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Card Body */}
            <div className="flex-1 p-4 space-y-3">
                {/* Faculty Row */}
                {faculty && (
                    <div className="bg-(--mui-palette-grey-50) border border-(--mui-palette-grey-100) flex gap-2.5 items-center p-2 rounded-lg">
                        {faculty.avatarUrl
                            ? (
                                <img
                                    alt={faculty.name}
                                    className="h-7 object-cover ring-(--mui-palette-grey-200) ring-1 rounded-full w-7"
                                    src={faculty.avatarUrl}
                                />
                            )
                            : (
                                <div className="bg-(--mui-palette-brand-100) flex font-bold h-7 items-center justify-center rounded-full text-(--mui-palette-brand-700) text-xs w-7">
                                    {faculty.name.charAt(0)}
                                </div>
                            )
                        }
                        <div className="min-w-0">
                            <p className="font-semibold text-(--mui-palette-grey-500) text-[10px] uppercase">
                                {faculty.role ?? 'Faculty In-Charge'}
                            </p>
                            <p className="font-semibold text-(--mui-palette-text-primary) text-xs truncate">
                                {faculty.name}
                            </p>
                        </div>
                    </div>
                )}

                {/* Metrics 2x2 Matrix */}
                {metrics.length > 0 && (
                    <div className="gap-2 grid grid-cols-2 text-xs">
                        {metrics.map(function(metric, index) {
                            return (
                                <div
                                    className="bg-(--mui-palette-grey-50) border border-(--mui-palette-grey-100) p-2 rounded-lg"
                                    key={index}
                                >
                                    <span className="block font-medium text-(--mui-palette-grey-500) text-[10px]">
                                        {metric.label}
                                    </span>
                                    <div className="flex font-medium gap-1 items-center line-clamp-1 text-(--mui-palette-text-primary) text-[11px]">
                                        {metric.icon}
                                        <span>{metric.value}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Progress / Capacity Bar */}
                {progress && (
                    <div className="pt-1 space-y-1">
                        <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-(--mui-palette-text-secondary)">
                                {progress.label ?? 'Capacity'}
                            </span>
                            <span className="font-bold text-(--mui-palette-text-primary)">
                                {progress.current} / {progress.total}
                                {progress.formatPercent && (
                                    <span className="font-normal ml-1 text-(--mui-palette-text-secondary)">
                                        ({progressPercentage}%)
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="bg-(--mui-palette-grey-100) h-1.5 overflow-hidden rounded-full w-full">
                            <div
                                className={classMerge(
                                    'h-full rounded-full transition-all duration-300',
                                    progressPercentage >= 90
                                        ? 'bg-(--mui-palette-warning-main)'
                                        : 'bg-(--mui-palette-primary-main)'
                                )}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {extraContent}
            </div>

            {/* Card Footer Actions */}
            {(footerMeta || primaryAction || secondaryAction) && (
                <div className="bg-(--mui-palette-grey-50) border-(--mui-palette-grey-100) border-t flex gap-2 items-center justify-between p-3">
                    <div className="min-w-0 text-(--mui-palette-text-secondary) text-[10px] truncate">
                        {footerMeta}
                    </div>
                    <div
                        className="flex gap-1.5 items-center shrink-0"
                        onClick={function(e) {
                            e.stopPropagation();
                        }}
                    >
                        {secondaryAction && (
                            <CommonButton
                                color="lightGrey"
                                disabled={secondaryAction.disabled}
                                size="small"
                                variant="outlined"
                                onClick={secondaryAction.onClick}
                            >
                                {secondaryAction.label}
                            </CommonButton>
                        )}
                        {primaryAction && (
                            <CommonButton
                                color="primary"
                                disabled={primaryAction.disabled}
                                size="small"
                                variant="contained"
                                onClick={primaryAction.onClick}
                            >
                                {primaryAction.label}
                            </CommonButton>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}