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