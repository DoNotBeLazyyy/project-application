import { SideBarItem, SideBarGroup } from '@type/sidebar.types';

/**
 * Type guard to determine if an item is a SideBarGroup (has sub-items) or a simple SideBarItem.
 *
 * @param item - The item to check.
 * @returns
 */
export function isSideBarGroup(item: SideBarItem | SideBarGroup): item is SideBarGroup {
    return 'items' in item;
}

/**
 * Builds the collapsed-rail abbreviation for a sidebar section label by taking
 * the first character of each word.
 *
 * @param label - The section label.
 * @returns
 */
export function getSectionInitials(label: string): string {
    return label
        .split(/[\s-_]+/)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase();
}