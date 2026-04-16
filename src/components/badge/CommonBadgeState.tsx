import { Chip } from '@mui/material';
import { CircleIcon } from '@phosphor-icons/react';
import { ChipSizeToIconSizeMap, CommonBadgeStateProps, StateVariantColorMap } from '@type/common/badge.type';

export function CommonBadgeState({
    label,
    size = 'small',
    variant
}: CommonBadgeStateProps) {
    const variantColorMap: StateVariantColorMap = {
        active: 'active',
        inactive: 'inactive'
    }; // Maps badge state variants to MUI chip color values
    const iconSizeMap: ChipSizeToIconSizeMap = {
        small: 5,
        medium: 7,
        large: 9
    }; // Maps chip sizes to icon size values

    return <Chip
        color={variantColorMap[variant]}
        icon={
            <CircleIcon
                size={iconSizeMap[size]}
                weight="fill"
            />
        }
        label={label}
        size={size}
    />;
}