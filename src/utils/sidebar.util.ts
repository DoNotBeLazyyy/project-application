import { SideBarItem, SideBarGroup } from '@type/sidebar.types';

/**
 * Custom prop forwarding function to prevent 'sidebarVariant' from being passed to DOM elements in styled components.
 *
 * @param prop - The prop name to check for forwarding in styled components.
 * @returns
 */
export function shouldForwardSidebarVariant(prop: PropertyKey) {
    return prop !== 'sidebarVariant';
}

/**
 * Type guard to determine if an item is a SideBarGroup (has sub-items) or a simple SideBarItem.
 *
 * @param item - The item to check.
 * @returns
 */
export function isSideBarGroup(item: SideBarItem | SideBarGroup): item is SideBarGroup {
    return 'items' in item;
}