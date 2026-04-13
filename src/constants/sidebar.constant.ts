import { Accordion, AccordionSummary, styled } from '@mui/material';
import { SideBarItem, SideBarGroup } from '@type/sidebar.types';

// Sidebar variant style configuration (dark and light)
export const VARIANT_STYLES = {
    dark: {
        sectionLabel: 'text-white',
        itemText: '!text-white',
        itemHover: 'hover:bg-[#022179]',
        itemIcon: 'text-white',
        itemActive: 'bg-[#022179] !text-white',
        groupText: 'text-white',
        groupIcon: 'text-white',
        expandIcon: 'text-[#387BE0]',
        subItemText: '!text-white',
        subItemHover: 'hover:bg-[#022179]',
        subItemActive: 'bg-[#022179] !text-white',
        subItemBorder: '',
        subItemBorderActive: '',
        subItemBorderInactive: ''
    },
    light: {
        sectionLabel: 'text-[#52525B]',
        itemText: '!text-[#52525B]',
        itemHover: 'hover:bg-gray-100',
        itemIcon: 'text-gray-500',
        itemActive: 'bg-[#EEF2FF] !text-[#3B5BDB]',
        groupText: 'text-gray-900',
        groupIcon: 'text-gray-700',
        expandIcon: 'text-[#011554]',
        subItemText: '!text-gray-600',
        subItemHover: 'hover:bg-gray-50',
        subItemActive: '!text-gray-600',
        subItemBorder: 'show',
        subItemBorderActive: '#022179',
        subItemBorderInactive: '#D1D5DB'
    }
};

/**
 * Custom prop forwarding function to prevent 'sidebarVariant' from being passed to DOM elements in styled components.
 *
 * @param prop - The prop name to check for forwarding in styled components.
 * @returns
 */
export function shouldForwardSidebarVariant(prop: PropertyKey) {
    return prop !== 'sidebarVariant';
}

// Shared styled configuration to filter sidebar variant props
export const STYLED_OPTIONS = { shouldForwardProp: shouldForwardSidebarVariant };

// Styled Accordion using shared styled options
export const StyledAccordion = styled(Accordion, STYLED_OPTIONS)({});

// Styled AccordionSummary using shared styled options
export const StyledAccordionSummary = styled(AccordionSummary, STYLED_OPTIONS)({});

/**
 * Type guard to determine if an item is a SideBarGroup (has sub-items) or a simple SideBarItem.
 *
 * @param item - The item to check.
 * @returns
 */
export function isSideBarGroup(item: SideBarItem | SideBarGroup): item is SideBarGroup {
    return 'items' in item;
}