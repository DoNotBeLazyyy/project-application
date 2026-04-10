import CheckboxButtonCheckedIcon from '@components/icons/CheckboxChecked';
import CheckboxIndeterminateIcon from '@components/icons/CheckboxIndeterminate';
import CheckboxButtonUncheckedIcon from '@components/icons/CheckboxUnchecked';
import RadioButtonCheckedIcon from '@components/icons/RadioChecked';
import RadioButtonUncheckedIcon from '@components/icons/RadioUnchecked';
import { Components, Theme } from '@mui/material';

export const COMPONENTS: Components<Omit<Theme, 'components'>> = {
    MuiCheckbox: {
        defaultProps: {
            // Replaces default Material icons with custom project-specific icons
            icon: <CheckboxButtonUncheckedIcon />,
            checkedIcon: <CheckboxButtonCheckedIcon />,
            indeterminateIcon: <CheckboxIndeterminateIcon />
        },
        styleOverrides: {
            root: {
                // Default state
                color: 'var(--mui-palette-grey-400)',

                // State: Disabled
                '&.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-200)'
                },

                // State: Checked
                '&.Mui-checked': {
                    color: 'var(--mui-palette-primary-main)'
                },

                // State: Checked AND Disabled
                '&.Mui-checked.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-300)'
                },

                // State: Indeterminate (Partially checked) AND Disabled
                '&.MuiCheckbox-indeterminate.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-300)'
                }
            }
        }
    },
    MuiRadio: {
        defaultProps: {
            // Replaces default Material radio circles with custom icons
            icon: <RadioButtonUncheckedIcon />,
            checkedIcon: <RadioButtonCheckedIcon />
        },
        styleOverrides: {
            root: {
                // Default state
                color: 'var(--mui-palette-grey-400)',

                // State: Disabled
                '&.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-200)'
                },

                // State: Checked
                '&.Mui-checked svg': {
                    color: 'var(--mui-palette-primary-main)'
                },

                // State: Checked AND Disabled
                '&.Mui-checked.Mui-disabled svg': {
                    color: 'var(--mui-palette-grey-300)'
                }
            }
        }
    },
    MuiFormControlLabel: {
        styleOverrides: {
            root: {
                // Base text color for labels
                color: 'var(--mui-palette-grey-600)',
                // State: Disabled label styling
                '&.Mui-disabled': {
                    '& .MuiFormControlLabel-label': {
                        color: 'var(--mui-palette-grey-200)'
                    }
                },
                // State: Checked AND disabled label styling
                '&:has(.Mui-checked).Mui-disabled': {
                    '& .MuiFormControlLabel-label': {
                        color: 'var(--mui-palette-grey-300)'
                    }
                }
            },
            label: {
                // Design-specific spacing between the icon and the text
                marginLeft: '7px'
            }
        }
    }
}; // Components configuration