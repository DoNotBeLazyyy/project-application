import { ReactNode } from 'react';

// Tab menu style variants
export type TabMenuStyle = 'outline' | 'pill' | 'vertical';

// Tab menu size variants
export type TabMenuSize = 'default' | 'small';

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