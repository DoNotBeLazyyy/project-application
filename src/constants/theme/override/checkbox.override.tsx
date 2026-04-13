import CheckboxButtonCheckedIcon from '@components/icons/CheckboxChecked';
import CheckboxIndeterminateIcon from '@components/icons/CheckboxIndeterminate';
import CheckboxButtonUncheckedIcon from '@components/icons/CheckboxUnchecked';
import { Components, Theme } from '@mui/material';

export const checkboxOverrides: Components<Omit<Theme, 'components'>> = {
    MuiCheckbox: {
        defaultProps: {
            icon: <CheckboxButtonUncheckedIcon />,
            checkedIcon: <CheckboxButtonCheckedIcon />,
            indeterminateIcon: <CheckboxIndeterminateIcon />
        },
        styleOverrides: {
            root: {
                color: 'var(--mui-palette-grey-400)',
                '&.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-200)'
                },
                '&.Mui-checked': {
                    color: 'var(--mui-palette-primary-main)'
                },
                '&.Mui-checked.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-300)'
                },
                '&.MuiCheckbox-indeterminate.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-300)'
                }
            }
        }
    },
};