import { Components, Theme } from '@mui/material';

export const dialogOverrides: Components<Omit<Theme, 'components'>> = {
    MuiDialog: {
        styleOverrides: {
            root: { zIndex: 9999 }
        }
    }
};