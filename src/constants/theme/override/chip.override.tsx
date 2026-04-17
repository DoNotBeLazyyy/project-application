import { ComponentTheme } from '@type/common/theme.type';

export const ChipOverrides: ComponentTheme = {
    MuiChip: {
        styleOverrides: {
            root: {
                '&.MuiChip-colorInfo': {
                    backgroundColor: 'var(--mui-tokens-color-secondary-light)',
                    borderColor: 'var(--mui-tokens-color-secondary-main)',
                    borderStyle: 'solid',
                    borderWidth: 'var(--mui-tokens-stroke-0)',
                    color: 'var(--mui-tokens-color-secondary-main)'
                },
                '&.MuiChip-colorSuccess': {
                    backgroundColor: 'var(--mui-tokens-color-state-successLight)',
                    borderColor: 'var(--mui-tokens-color-state-success)',
                    borderStyle: 'solid',
                    borderWidth: 'var(--mui-tokens-stroke-0)',
                    color: 'var(--mui-tokens-color-state-success)'
                },
                '&.MuiChip-colorWarning': {
                    backgroundColor: 'var(--mui-tokens-color-state-warningLight)',
                    borderColor: 'var(--mui-tokens-color-state-warning)',
                    borderStyle: 'solid',
                    borderWidth: 'var(--mui-tokens-stroke-0)',
                    color: 'var(--mui-tokens-color-state-warning)'
                },
                '&.MuiChip-colorError': {
                    backgroundColor: 'var(--mui-tokens-color-state-errorLight)',
                    borderColor: 'var(--mui-tokens-color-state-error)',
                    borderStyle: 'solid',
                    borderWidth: 'var(--mui-tokens-stroke-0)',
                    color: 'var(--mui-tokens-color-state-error)'
                },
                '&.MuiChip-colorActive': {
                    backgroundColor: 'var(--mui-tokens-color-state-successLight)',
                    color: 'var(--mui-tokens-color-state-success)'
                },
                '&.MuiChip-colorInactive': {
                    backgroundColor: 'var(--mui-tokens-color-neutral-200)',
                    color: 'var(--mui-tokens-color-neutral-500)'
                },
                '&.MuiChip-colorLight': {
                    backgroundColor: 'var(--mui-tokens-color-brand-100)',
                    color: 'var(--mui-tokens-color-brand-800)'
                },
                '&.MuiChip-colorDark': {
                    backgroundColor: 'var(--mui-tokens-color-brand-900)',
                    color: 'var(--mui-tokens-color-common-white)'
                },
                '&.MuiChip-colorGhost': {
                    backgroundColor: 'var(--mui-tokens-color-common-white)',
                    color: 'var(--mui-tokens-color-brand-800)'
                },
                '&.MuiChip-colorOutline': {
                    backgroundColor: 'var(--mui-tokens-color-common-white)',
                    borderColor: 'var(--mui-tokens-color-brand-900)',
                    borderStyle: 'solid',
                    borderWidth: 'var(--mui-tokens-stroke-0)',
                    color: 'var(--mui-tokens-color-brand-900)'
                },
                '&.MuiChip-sizeSmall': {
                    borderRadius: 'var(--mui-tokens-radius-sm)',
                    fontSize: 'var(--mui-tokens-fontSize-xs)',
                    gap: 0,
                    height: '1.125rem',
                    margin: 0,
                    padding: '0 var(--mui-tokens-spacing-2)',
                    '& .MuiChip-icon': {
                        fontSize: 'var(--mui-tokens-fontSize-xs)',
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: '0 var(--mui-tokens-spacing-2)'
                    }
                },
                '&.MuiChip-sizeMedium': {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    fontSize: 'var(--mui-tokens-fontSize-sm)',
                    height: '1.375rem',
                    gap: 0,
                    margin: 0,
                    padding: '0 8px',
                    '& .MuiChip-icon': {
                        fontSize: 'var(--mui-tokens-fontSize-sm)',
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: '0 var(--mui-tokens-spacing-2)'
                    }
                },
                '&.MuiChip-sizeLarge': {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    fontSize: 'var(--mui-tokens-fontSize-md)',
                    height: '1.75rem',
                    gap: 0,
                    margin: 0,
                    padding: '0 var(--mui-tokens-spacing-3)',
                    '& .MuiChip-icon': {
                        fontSize: 'var(--mui-tokens-fontSize-md)',
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: '0 var(--mui-tokens-spacing-2)'
                    }
                }
            }
        }
    }
};