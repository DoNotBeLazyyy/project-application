import { ComponentTheme } from '@type/common/theme.type';

export const dropdownOverrides: ComponentTheme = {
    MuiMenu: {
        styleOverrides: {
            paper: {
                width: '21.375rem',
                maxHeight: '18.75rem',
                backgroundColor: 'var(--mui-tokens-color-common-white)',
                border: 'var(--mui-tokens-stroke-1) solid var(--mui-tokens-color-neutral-300)',
                borderRadius: 'var(--mui-tokens-radius-md)',
                boxShadow: 'none'
            },
            list: {
                padding: 0
            }
        }
    },
    MuiMenuItem: {
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: 'var(--mui-tokens-color-common-white)',
                color: 'var(--mui-tokens-color-neutral-900)',
                height: '3.438rem',
                minHeight: 'unset',
                padding: 'var(--mui-tokens-spacing-5) var(--mui-tokens-spacing-6)',
                ...theme.typography.bodyNormal,
                '&:hover': {
                    backgroundColor: 'var(--mui-tokens-color-neutral-200)'
                },
                ['&.Mui-selected, &.Mui-selected:hover']: {
                    backgroundColor: 'var(--mui-tokens-color-brand-900)',
                    color: 'var(--mui-tokens-color-common-white)'
                }
            })
        }
    }
}; // Menu component overrides