import { cardOverrides } from '@constants/theme/component-override/card-override';
import { dialogOverrides } from '@constants/theme/component-override/dialog-override';
import { paperOverrides } from '@constants/theme/component-override/paper-override';
import { Components, Theme } from '@mui/material'; // Mui dependency

export const COMPONENTS: Components<Omit<Theme, 'components'>> = {
    ...cardOverrides,
    ...dialogOverrides,
    ...paperOverrides
}; // Components configuration