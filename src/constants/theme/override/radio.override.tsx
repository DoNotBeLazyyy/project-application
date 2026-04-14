import RadioButtonCheckedIcon from '@components/icons/RadioChecked';
import RadioButtonUncheckedIcon from '@components/icons/RadioUnchecked';
import { ComponentTheme } from '@type/common/theme.type';

export const radioOverrides: ComponentTheme = {
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