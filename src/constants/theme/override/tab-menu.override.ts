import { ComponentTheme } from '@type/common/theme.type';

export const tabMenuOverrides: ComponentTheme = {
    MuiTabs: {
        styleOverrides: {
            root: {
                minHeight: 'unset',
                padding: 'var(--mui-tokens-spacing-2)',
                width: 'fit-content',
                '& .MuiTabs-indicator': { display: 'none' }
            },
            flexContainer: {
                gap: 'var(--mui-tokens-spacing-3)'
            }
        },
        variants: [
            {
                props: { menuStyle: 'outline' },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-common-white)',
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--mui-tokens-color-brand-900)',
                        borderRadius: 'var(--mui-tokens-radius-full)',
                        display: 'block',
                        height: 'var(--mui-tokens-stroke-1)'
                    }
                }
            },
            {
                props: { menuStyle: 'pill' },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                    borderRadius: 'var(--mui-tokens-radius-lg)'
                }
            },
            {
                props: { menuStyle: 'vertical' },
                style: {
                    backgroundColor: 'var(--mui-tokens-color-common-white)',
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    padding: 'var(--mui-tokens-spacing-3)'
                }
            }
        ]
    },
    MuiTab: {
        styleOverrides: {
            root: {
                alignItems: 'center',
                color: 'var(--mui-tokens-color-neutral-400)',
                display: 'flex',
                flexDirection: 'row',
                flexShrink: 0,
                fontFamily: 'var(--mui-tokens-fontFamily-body)',
                fontSize: 'var(--mui-tokens-fontSize-nm)',
                fontWeight: 'var(--mui-tokens-fontWeight-bold)',
                gap: 'var(--mui-tokens-spacing-2)',
                lineHeight: 'var(--mui-tokens-lineHeight-nm)',
                minHeight: 'unset',
                minWidth: 'unset',
                opacity: 1,
                paddingBottom: 'var(--mui-tokens-spacing-3)',
                paddingLeft: 'var(--mui-tokens-spacing-4)',
                paddingRight: 'var(--mui-tokens-spacing-4)',
                paddingTop: 'var(--mui-tokens-spacing-3)',
                textTransform: 'none',
                '&:hover': {
                    color: 'var(--mui-tokens-color-neutral-700)'
                },
                '&.Mui-selected': {
                    color: 'var(--mui-tokens-color-neutral-700)'
                },
                '&.Mui-selected .tab-icon': {
                    color: 'var(--mui-tokens-color-brand-900)'
                },
                '& > .MuiTab-iconWrapper': {
                    marginRight: 0
                }
            }
        },
        variants: [
            {
                props: { menuStyle: 'pill' },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    '&:hover': {
                        backgroundColor: 'var(--mui-tokens-color-common-white)'
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'var(--mui-tokens-color-brand-900)',
                        color: 'var(--mui-tokens-color-common-white)',
                        '&:hover': {
                            backgroundColor: 'var(--mui-tokens-color-brand-900)'
                        }
                    },
                    '&.Mui-selected .tab-icon': {
                        color: 'inherit'
                    }
                }
            },
            {
                props: { menuStyle: 'vertical' },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    '&.Mui-selected': {
                        backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                        color: 'var(--mui-tokens-color-neutral-700)'
                    }
                }
            },
            {
                props: { size: 'small' },
                style: {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    fontSize: 'var(--mui-tokens-fontSize-sm)',
                    gap: 'var(--mui-tokens-spacing-3)',
                    lineHeight: 'var(--mui-tokens-lineHeight-sm)',
                    paddingBottom: 'var(--mui-tokens-spacing-2)',
                    paddingLeft: 'var(--mui-tokens-spacing-3)',
                    paddingRight: 'var(--mui-tokens-spacing-3)',
                    paddingTop: 'var(--mui-tokens-spacing-2)'
                }
            }
        ]
    }
};