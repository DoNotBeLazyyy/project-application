import { Chip } from '@mui/material';
import { ChipVariantColorMap, CommonChipProps } from '@type/common/badge.type';

export function CommonChip({
    icon,
    label,
    size = 'small',
    variant
}: CommonChipProps) {
    const variantColorMap: ChipVariantColorMap = {
        dark: 'dark',
        ghost: 'ghost',
        light: 'light',
        outline: 'outline'
    }; // Maps chip UI variants to MUI chip color values

    return <Chip
        color={variantColorMap[variant]}
        icon={icon}
        label={label}
        size={size}
    />;
}