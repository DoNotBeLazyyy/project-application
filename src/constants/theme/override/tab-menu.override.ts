import { ComponentTheme } from '@type/common/theme.type';

export const tabMenuOverrides: ComponentTheme = {
    MuiTabs: {
        styleOverrides: {
            root: {
                maxWidth: '100%',
                minHeight: 'unset',
                padding: 'var(--mui-tokens-spacing-2)',
                width: 'fit-content',
                '& .MuiTabs-indicator': {
                    display: 'none'
                },
                '& .MuiTabs-scrollButtons.Mui-disabled': {
                    opacity: 0.3
                },
                flexShrink: 0,
                '&[data-menu-style="outline"]': {
                    backgroundColor: 'var(--mui-palette-background-paper)',
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--mui-palette-primary-main)',
                        borderRadius: 'var(--mui-tokens-radius-full)',
                        display: 'block',
                        height: 'var(--mui-tokens-stroke-1)'
                    }
                },
                '&[data-menu-style="pill"]': {
                    backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                    borderRadius: 'var(--mui-tokens-radius-lg)'
                },
                '&[data-menu-style="vertical"]': {
                    backgroundColor: 'var(--mui-palette-background-paper)',
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    padding: 'var(--mui-tokens-spacing-3)'
                }
            },
            flexContainer: {
                gap: 'var(--mui-tokens-spacing-3)'
            }
        }
    },
    MuiTab: {
        styleOverrides: {
            root: {
                alignItems: 'center',
                color: 'var(--mui-palette-text-secondary)',
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
                    color: 'var(--mui-palette-primary-main)'
                },
                '&.Mui-selected': {
                    color: 'var(--mui-palette-primary-main)'
                },
                '&.Mui-selected .tab-icon': {
                    color: 'var(--mui-palette-primary-main)'
                },
                '& > .MuiTab-iconWrapper': {
                    marginRight: 0
                },
                '&[data-menu-style="pill"]': {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    '&:hover': {
                        backgroundColor: 'var(--mui-palette-action-hover, rgba(0, 0, 0, 0.04))'
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'var(--mui-palette-primary-main)',
                        color: 'var(--mui-palette-primary-contrastText)',
                        '&:hover': {
                            backgroundColor: 'var(--mui-palette-primary-dark)'
                        }
                    },
                    '&.Mui-selected .tab-icon': {
                        color: 'inherit'
                    }
                },
                '&[data-menu-style="vertical"]': {
                    borderRadius: 'var(--mui-tokens-radius-md)',
                    '&.Mui-selected': {
                        backgroundColor: 'var(--mui-tokens-color-neutral-100)',
                        color: 'var(--mui-palette-primary-main)'
                    }
                },
                '&[data-size="small"]': {
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
        }
    }
};