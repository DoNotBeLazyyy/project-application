import { ComponentTheme } from '@type/common/theme.type';

export const statusBadgeOverrides: ComponentTheme = {
    MuiChip: {
        variants: [
            {
                props: {
                    variant: 'status'
                },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-sm)',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    fontFamily: 'var(--mui-tokens-fontFamily-body)',
                    fontSize: 'var(--mui-tokens-fontSize-xs)',
                    fontWeight: 'var(--mui-tokens-fontWeight-bold)',
                    gap: 'var(--mui-tokens-spacing-2)',
                    height: 'auto',
                    lineHeight: 'var(--mui-tokens-lineHeight-xs)',
                    padding: 'var(--mui-tokens-spacing-1) var(--mui-tokens-spacing-2)',
                    '& .MuiChip-icon': {
                        fontSize: '12px',
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: 0
                    }
                }
            },
            {
                props: {
                    color: 'info',
                    variant: 'status'
                },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-secondary-light)',
                    borderColor: 'var(--mui-tokens-color-secondary-main)',
                    color: 'var(--mui-tokens-color-secondary-main)'
                }
            },
            {
                props: {
                    color: 'success',
                    variant: 'status'
                },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-state-successLight)',
                    borderColor: 'var(--mui-tokens-color-state-success)',
                    color: 'var(--mui-tokens-color-state-success)'
                }
            },
            {
                props: {
                    color: 'warning',
                    variant: 'status'
                },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-state-warningLight)',
                    borderColor: 'var(--mui-tokens-color-state-warning)',
                    color: 'var(--mui-tokens-color-state-warning)'
                }
            },
            {
                props: {
                    color: 'error',
                    variant: 'status'
                },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-state-errorLight)',
                    borderColor: 'var(--mui-tokens-color-state-error)',
                    color: 'var(--mui-tokens-color-state-error)'
                }
            }
        ]
    }
}; // Status badge (Chip variant="status") theme overrides