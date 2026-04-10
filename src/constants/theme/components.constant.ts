import { inputOverrides } from '@constants/theme/component-override/input.override';
import { Components, Theme } from '@mui/material'; // Mui dependency

export const COMPONENTS: Components<Omit<Theme, 'components'>> = {
    ...inputOverrides
}; // Components configuration