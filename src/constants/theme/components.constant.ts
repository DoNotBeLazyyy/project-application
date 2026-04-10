import { buttonOverrides } from '@constants/theme/component-override/button-override';
import { cardOverrides } from '@constants/theme/component-override/card-override';
import { dialogOverrides } from '@constants/theme/component-override/dialog-override';
import { inputOverrides } from '@constants/theme/component-override/input-override';
import { paperOverrides } from '@constants/theme/component-override/paper-override';
import { ComponentTheme } from '@type/common.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...cardOverrides,
    ...dialogOverrides,
    ...inputOverrides,
    ...paperOverrides
}; // Components configuration