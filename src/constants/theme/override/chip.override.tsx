import { Components, Theme } from '@mui/material';

export const ChipOverrides: Components<Omit<Theme, 'components'>> = {
    MuiChip: {
        styleOverrides: {
            root: {
                '&.MuiChip-colorInfo': {
                    backgroundColor: 'var(--mui-tokens-color-secondary-light)',
                    borderColor: 'var(--mui-tokens-color-secondary-main)',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    color: 'var(--mui-tokens-color-secondary-main)'
                },
                '&.MuiChip-colorSuccess': {
                    backgroundColor: '#DCFCE7',
                    borderColor: '#22C55E',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    color: '#22C55E'
                },
                '&.MuiChip-colorWarning': {
                    backgroundColor: '#FEF3C7',
                    borderColor: '#F59E0B',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    color: '#F59E0B'
                },
                '&.MuiChip-colorError': {
                    backgroundColor: '#FEE2E2',
                    borderColor: '#EF4444',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    color: '#EF4444'
                },
                '&.MuiChip-colorActive': {
                    backgroundColor: '#CEF6DF',
                    color: '#2DCC70'
                },
                '&.MuiChip-colorInactive': {
                    backgroundColor: '#E4E4E7',
                    color: '#71717A'
                },
                '&.MuiChip-colorLight': {
                    backgroundColor: '#E0EDFD',
                    color: '#123F8A'
                },
                '&.MuiChip-colorDark': {
                    backgroundColor: '#022179',
                    color: '#FFFFFF'
                },
                '&.MuiChip-colorGhost': {
                    backgroundColor: '#FFFFFF',
                    color: '#123F8A'
                },
                '&.MuiChip-colorOutline': {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#022179',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    color: '#022179'
                },
                '&.MuiChip-sizeSmall': {
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    gap: 0,
                    height: 18,
                    margin: 0,
                    padding: '0 4px',
                    '& .MuiChip-icon': {
                        fontSize: 12,
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: '0 4px'
                    }
                },
                '&.MuiChip-sizeMedium': {
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    height: 22,
                    gap: 0,
                    margin: 0,
                    padding: '0 8px',
                    '& .MuiChip-icon': {
                        fontSize: 14,
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: '0 4px'
                    }
                },
                '&.MuiChip-sizeLarge': {
                    borderRadius: 8,
                    fontSize: '1.125rem',
                    height: 28,
                    gap: 0,
                    margin: 0,
                    padding: '0 8px',
                    '& .MuiChip-icon': {
                        fontSize: 20,
                        margin: 0
                    },
                    '& .MuiChip-label': {
                        padding: '0 4px'
                    }
                }
            }
        }
    }
};