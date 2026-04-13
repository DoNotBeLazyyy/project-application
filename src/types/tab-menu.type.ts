import { ReactNode } from 'react';

// Shared tab menu props for MUI module augmentation
export interface SharedTabMenuProps {
    // Tab menu style variant
    menuStyle?: 'outline' | 'pill' | 'vertical';

    // Tab menu size
    size?: 'default' | 'small';
}

// Single tab item configuration
export interface TabItemData {
    // Optional badge counter number
    badge?: number;

    // Whether to show trailing arrow/caret icon
    hasArrow?: boolean;

    // Optional leading icon element
    icon?: ReactNode;

    // Tab display label
    label: string;

    // Unique tab identifier used for selection tracking
    value: string;
}