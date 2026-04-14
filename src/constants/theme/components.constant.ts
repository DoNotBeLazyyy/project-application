import { buttonOverrides } from '@constants/theme/override/button.override';
import { checkboxOverrides } from '@constants/theme/override/checkbox.override';
import { dialogOverrides } from '@constants/theme/override/dialog.override';
import { formControlOverrides } from '@constants/theme/override/form-control.override';
import { inputOverrides } from '@constants/theme/override/input.override';
import { radioOverrides } from '@constants/theme/override/radio.override';
import { tabMenuOverrides } from '@constants/theme/override/tab-menu.override';
import { ComponentTheme } from '@type/common/theme.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...checkboxOverrides,
    ...dialogOverrides,
    ...formControlOverrides,
    ...inputOverrides,
    ...radioOverrides,
    ...tabMenuOverrides
}; // Components configuration