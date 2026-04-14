import { CommonButtonProps } from '@components/button/CommonButton';
import { ReactNode } from 'react';

// Visual variant for the sidebar
export type SideBarVariant = 'dark' | 'light';

// Props for the sidebar footer
export type SideBarFooterProps = CommonButtonProps;

// Type for items in a sidebar section.
export type SideBarSectionItems = (SideBarItem | SideBarGroup)[];

// Utility type for string or number values
export interface SideBarItem {
    // Whether this item is currently active/selecteds
    isActive?: boolean;

    // Icon element for the item
    icon?: ReactNode;

    // Display label
    label: string;

    // Click handler
    onClick?: VoidFunction;
}

// Type for accordion groups in the sidebar, which can contain sub-items.
export interface SideBarGroup {
    // Whether the accordion is expanded by default
    defaultExpanded?: boolean;

    // Icon element for the group header
    icon?: ReactNode;

    // Sub-items within the accordion
    items: SideBarItem[];

    // Group header label
    label: string;
}

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


// Represents a section in the sidebar containing items and an optional label
export interface SideBarSection {
    // Items in this section.
    items: SideBarSectionItems;

    // Optional section category label.
    sectionLabel?: string;
}