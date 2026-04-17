import { Chip } from '@mui/material';
import { CheckFatIcon, CircleIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react';
import { BadgeStatusVariantElementMap, CommonBadgeStatusProps } from '@type/common/badge.type';

export function CommonBadgeStatus({
    label = 'info',
    size = 'small',
    variant = 'info'
}: CommonBadgeStatusProps) {
    const iconMap: BadgeStatusVariantElementMap = {
        error: <XCircleIcon weight="fill" />,
        info: <CircleIcon weight="fill" />,
        success: <CheckFatIcon weight="fill" />,
        warning: <WarningIcon weight="fill" />
    }; // Maps badge status variants to their corresponding icon components

    return <Chip
        color={variant}
        icon={iconMap[variant]}
        label={label}
        size={size}
    />;
}