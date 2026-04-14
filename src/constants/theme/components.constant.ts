import { toggleOverrides } from '@constants/theme//override/toggle.override';
import { checkboxOverrides } from '@constants/theme/override/checkbox.override';
import { formControlOverrides } from '@constants/theme/override/form-control.override';
import { inputOverrides } from '@constants/theme/override/input.override';
import { radioOverrides } from '@constants/theme/override/radio.override';
import { tabMenuOverrides } from '@constants/theme/override/tab-menu.override';
import { ComponentTheme } from '@type/common/theme.type';

export const COMPONENTS: ComponentTheme = {
    ...checkboxOverrides,
    ...formControlOverrides,
    ...inputOverrides,
    ...radioOverrides,
    ...tabMenuOverrides,
    ...toggleOverrides
};