import { TabItem } from '@components/tab/CommonTabMenu';

// Tab menu variant type
export type TabMenuVariant = 'filled' | 'outlined' | 'pill' | 'soft';

// Tab item type definition
export type TabItemOrString = TabItem[] | string[];

// Variant style interface for sidebar items and groups.
export interface VariantStyle {
    // Expand icon class for accordion groups
    expandIcon: string;

    // Group header icon class
    groupIcon: string;

    // Group header text class
    groupText: string;

    // Active item class
    itemActive: string;

    // Item hover class
    itemHover: string;

    // Item icon class
    itemIcon: string;

    // Item text class
    itemText: string;

    // Sub-item active class
    subItemActive: string;

    // Sub-item border visibility
    subItemBorder: string;

    // Sub-item border color for active segment
    subItemBorderActive: string;

    // Sub-item border color for inactive segments
    subItemBorderInactive: string;

    // Sub-item hover class
    subItemHover: string;

    // Sub-item text class
    subItemText: string;
}