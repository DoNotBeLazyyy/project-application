import RadioButtonCheckedIcon from '@components/icons/RadioChecked';
import RadioButtonUncheckedIcon from '@components/icons/RadioUnchecked';
import { Components, Theme } from '@mui/material';

export const radioOverrides: Components<Omit<Theme, 'components'>> = {
    MuiRadio: {
        defaultProps: {
            icon: <RadioButtonUncheckedIcon />,
            checkedIcon: <RadioButtonCheckedIcon />
        },
        styleOverrides: {
            root: {
                color: 'var(--mui-palette-grey-400)',
                '&.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-200)'
                },
                '&.Mui-checked svg': {
                    color: 'var(--mui-palette-primary-main)'
                },
                '&.Mui-checked.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-300)'
                }
            }
        }
    }
};