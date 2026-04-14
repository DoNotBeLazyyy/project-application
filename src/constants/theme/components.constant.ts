import { buttonOverrides } from '@constants/theme/override/button.override';
import { cardOverrides } from '@constants/theme/override/card.override';
import { inputOverrides } from '@constants/theme/override/input.override';
import { paperOverrides } from '@constants/theme/override/paper.override';
import { ComponentTheme } from '@type/common/theme.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...cardOverrides,
    ...inputOverrides,
    ...paperOverrides
}; // Components configuration