import CheckboxButtonCheckedIcon from '@components/icons/CheckboxChecked';
import CheckboxIndeterminateIcon from '@components/icons/CheckboxIndeterminate';
import CheckboxButtonUncheckedIcon from '@components/icons/CheckboxUnchecked';
import RadioButtonCheckedIcon from '@components/icons/RadioChecked';
import RadioButtonUncheckedIcon from '@components/icons/RadioUnchecked';
import { tabOverrides } from '@constants/theme/components-theme.constant';
import { Components, Theme } from '@mui/material';

export const COMPONENTS: Components<Omit<Theme, 'components'>> = {
    ...tabOverrides,
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
    },
    MuiFormControlLabel: {
        styleOverrides: {
            root: {
                color: 'var(--mui-palette-grey-600)',
                '&.Mui-disabled': {
                    '& .MuiFormControlLabel-label': {
                        color: 'var(--mui-palette-grey-200)'
                    }
                },
                '&:has(.Mui-checked).Mui-disabled': {
                    '& .MuiFormControlLabel-label': {
                        color: 'var(--mui-palette-grey-300)'
                    }
                }
            },
            label: { marginLeft: '7px' }
        }
    }
}; // Components configuration