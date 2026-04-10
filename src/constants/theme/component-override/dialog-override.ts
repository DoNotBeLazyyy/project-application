import { Components, Theme } from '@mui/material';

export const dialogOverrides: Components<Omit<Theme, 'components'>> = {
    MuiDialog: {
        styleOverrides: {
            root: { zIndex: 9999 },
            paper: {
                maxHeight: 'calc(100% - 4rem)',
                overflowY: 'auto',
                width: '100%'
            }
        },
        variants: [
            {
                props: { size: 'xsmall' },
                style: { '& .MuiDialog-paper': { maxWidth: '25rem' } }
            },
            {
                props: { size: 'small' },
                style: { '& .MuiDialog-paper': { maxWidth: '37.5rem' } }
            },
            {
                props: { size: 'medium' },
                style: { '& .MuiDialog-paper': { maxWidth: '50rem' } }
            },
            {
                props: { size: 'large' },
                style: { '& .MuiDialog-paper': { maxWidth: '62.5rem' } }
            },
            {
                props: { size: 'xlarge' },
                style: { '& .MuiDialog-paper': { maxWidth: '75rem' } }
            }
        ]
    }
}; // Dialog component overrides