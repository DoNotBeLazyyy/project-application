import { ChipOverrides } from '@constants/theme//override/chip.override';
import { toggleOverrides } from '@constants/theme//override/toggle.override';
import { buttonOverrides } from '@constants/theme/override/button.override';
import { cardOverrides } from '@constants/theme/override/card.override';
import { checkboxOverrides } from '@constants/theme/override/checkbox.override';
import { dialogOverrides } from '@constants/theme/override/dialog.override';
import { formControlOverrides } from '@constants/theme/override/form-control.override';
import { inputOverrides } from '@constants/theme/override/input.override';
import { paperOverrides } from '@constants/theme/override/paper.override';
import { radioOverrides } from '@constants/theme/override/radio.override';
import { sidebarOverrides } from '@constants/theme/override/sidebar.override';
import { tabMenuOverrides } from '@constants/theme/override/tab-menu.override';
import { ComponentTheme } from '@type/common/theme.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...cardOverrides,
    ...checkboxOverrides,
    ...dialogOverrides,
    ...formControlOverrides,
    ...inputOverrides,
    ...radioOverrides,
    ...toggleOverrides,
    ...tabMenuOverrides,
    ...paperOverrides,
    ...ChipOverrides,
    ...sidebarOverrides
}; // Components configuration