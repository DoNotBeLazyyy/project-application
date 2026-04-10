import { buttonOverrides } from '@constants/theme/component-override/button.override';
import { inputOverrides } from '@constants/theme/component-override/input.override';
import { ComponentTheme } from '@type/common.type';

export const COMPONENTS: ComponentTheme = {
    ...buttonOverrides,
    ...inputOverrides
}; // Components configuration