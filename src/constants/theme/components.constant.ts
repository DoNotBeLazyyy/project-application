import { buttonOverrides } from '@constants/theme/override/button.override';
import { cardOverrides } from '@constants/theme/override/card.override';
import { checkboxOverrides } from '@constants/theme/override/checkbox.override';
import { dialogOverrides } from '@constants/theme/override/dialog.override';
import { formControlOverrides } from '@constants/theme/override/form-control.override';
import { inputOverrides } from '@constants/theme/override/input.override';
import { paperOverrides } from '@constants/theme/override/paper.override';
import { ComponentTheme } from '@type/common/theme.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...checkboxOverrides,
    ...dialogOverrides,
    ...formControlOverrides,
    ...cardOverrides,
    ...inputOverrides,
    ...paperOverrides
}; // Components configuration