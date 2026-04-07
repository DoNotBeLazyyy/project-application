
import SideBarSectionGroup from '@components/sidebar/SideBarSectionGroup';
import { ThemeProvider } from '@mui/material/styles';
import { DivProps } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { createSideBarListTheme, VARIANT_STYLES } from '@utils/theme-util';
import { ReactNode, useMemo } from 'react';

// Variant type for the sidebar list
type SideBarListVariant = 'dark' | 'light';

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

    // Sub-item hover class
    subItemHover: string;

    // Sub-item text class
    subItemText: string;
}

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

// Type for items in a sidebar section.
export type SideBarSectionItems = (SideBarItem | SideBarGroup)[];

export interface SideBarSection {
    // Items in this section (can be simple items or accordion groups)
    items: SideBarSectionItems;

    // Optional section category label
    sectionLabel?: string;
}

interface CommonSideBarListProps extends DivProps {
    // Array of sections to render
    sections: SideBarSection[];

    // Visual variant
    variant?: SideBarListVariant;
}

/**
 * CommonSideBarList
 *
 * A reusable sidebar navigation list with accordion groups, section labels,
 * and simple menu items. Uses MUI Accordion with a custom theme reset.
 * Supports dark and light variants.
 *
 * @example
 * <CommonSideBarList
 *   variant="dark"
 *   sections={[
 *     {
 *       sectionLabel: "QUICK ACCESS",
 *       items: [
 *         { icon: <DashboardIcon />, label: "Dashboard", onClick: () => {} },
 *         { icon: <CalendarIcon />, label: "Calendar" }
 *       ]
 *     },
 *     {
 *       sectionLabel: "MANAGEMENT",
 *       items: [
 *         {
 *           icon: <OrgIcon />, label: "Organization", defaultExpanded: true,
 *           items: [
 *             { label: "Countries", isActive: true },
 *             { label: "Companies" },
 *             { label: "Departments" }
 *           ]
 *         }
 *       ]
 *     }
 *   ]}
 * />
 */
export default function CommonSideBarList({
    className,
    sections,
    variant = 'dark',
    ...props
}: CommonSideBarListProps) {
    const {
        sectionLabel: sectionLabelStyle,
        ...styles
    } = VARIANT_STYLES[variant]; // Destructure variant styles.
    const theme = useMemo(() =>
        createSideBarListTheme(variant),
    [variant]); // Create MUI theme based on variant.

    return (
        <ThemeProvider theme={theme}>
            <div
                className={
                    classMerge(
                        'flex flex-col gap-[var(--mui-tokens-spacing-5)]',
                        className
                    )
                }
                {...props}
            >
                {sections.map((section, index) => (
                    <SideBarSectionGroup
                        key={index}
                        section={section}
                        sectionLabelStyle={sectionLabelStyle}
                        styles={styles}
                    />
                ))}
            </div>
        </ThemeProvider>
    );
}