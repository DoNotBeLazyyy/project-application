import { toggleOverrides } from '@constants/theme//override/toggle.override';
import { buttonOverrides } from '@constants/theme/override/button.override';
import { cardOverrides } from '@constants/theme/override/card.override';
import { inputOverrides } from '@constants/theme/override/input.override';
import { paperOverrides } from '@constants/theme/override/paper.override';
import { radioOverrides } from '@constants/theme/override/radio.override';
import { tabMenuOverrides } from '@constants/theme/override/tab-menu.override';
import { ComponentTheme } from '@type/common/theme.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...cardOverrides,
    ...inputOverrides,
    ...radioOverrides,
    ...toggleOverrides,
    ...tabMenuOverrides,
    ...paperOverrides
}; // Components configuration