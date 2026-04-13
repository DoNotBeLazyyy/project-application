import { ReactNode } from 'react';

// Visual variant for the sidebar
export type SideBarVariant = 'dark' | 'light';

// Utility type for string or number values
export interface SideBarItem {
    // Whether this item is currently active/selected
    isActive?: boolean;

    // Icon element for the item
    icon?: ReactNode;

    // Display label
    label: string;

    // Click handler
    onClick?: () => void;
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