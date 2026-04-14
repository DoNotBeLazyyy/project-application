import { Accordion, AccordionSummary, styled } from '@mui/material';
import { shouldForwardSidebarVariant } from '@utils/sidebar.util';

// Sidebar variant style configuration (dark and light)
export const VARIANT_STYLES = {
    dark: {
        sectionLabel: 'text-[var(--mui-tokens-color-common-white)]',
        itemText: '!text-[var(--mui-tokens-color-common-white)]',
        itemHover: 'hover:bg-[var(--mui-tokens-color-brand-900)]',
        itemIcon: 'text-[var(--mui-tokens-color-common-white)]',
        itemActive: 'bg-[var(--mui-tokens-color-brand-900)] !text-[var(--mui-tokens-color-common-white)]',
        groupText: 'text-[var(--mui-tokens-color-common-white)]',
        groupIcon: 'text-[var(--mui-tokens-color-common-white)]',
        expandIcon: 'text-[var(--mui-tokens-color-brand-600)]',
        subItemText: '!text-[var(--mui-tokens-color-common-white)]',
        subItemHover: 'hover:bg-[var(--mui-tokens-color-brand-900)]',
        subItemActive: 'bg-[var(--mui-tokens-color-brand-900)] !text-[var(--mui-tokens-color-common-white)]',
        subItemBorder: '',
        subItemBorderActive: '',
        subItemBorderInactive: ''
    },
    light: {
        sectionLabel: 'text-[var(--mui-tokens-color-neutral-600)]',
        itemText: '!text-[var(--mui-tokens-color-neutral-600)]',
        itemHover: 'hover:bg-[var(--mui-tokens-color-neutral-100)]',
        itemIcon: 'text-[var(--mui-tokens-color-neutral-500)]',
        itemActive: 'bg-[var(--mui-tokens-color-sidebar-activeLight)] !text-[var(--mui-tokens-color-sidebar-active)]',
        groupText: 'text-[var(--mui-tokens-color-neutral-900)]',
        groupIcon: 'text-[var(--mui-tokens-color-neutral-700)]',
        expandIcon: 'text-[var(--mui-tokens-color-brand-950)]',
        subItemText: '!text-[var(--mui-tokens-color-neutral-600)]',
        subItemHover: 'hover:bg-[var(--mui-tokens-color-neutral-50)]',
        subItemActive: '!text-[var(--mui-tokens-color-neutral-600)]',
        subItemBorder: 'show',
        subItemBorderActive: 'var(--mui-tokens-color-brand-900)',
        subItemBorderInactive: '#D1D5DB'
    }
};

// Shared styled configuration to filter sidebar variant props
export const STYLED_OPTIONS = { shouldForwardProp: shouldForwardSidebarVariant };

// Styled Accordion using shared styled options
export const StyledAccordion = styled(Accordion, STYLED_OPTIONS)({});

// Styled AccordionSummary using shared styled options
export const StyledAccordionSummary = styled(AccordionSummary, STYLED_OPTIONS)({});