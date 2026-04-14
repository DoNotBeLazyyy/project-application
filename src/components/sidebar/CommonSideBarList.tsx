import SideBarSectionGroup from '@components/sidebar/SideBarSectionGroup';
import { DivProps } from '@type/common.type';
import { SideBarGroup, SideBarItem, SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { VARIANT_STYLES } from '@constants/sidebar.constant';

// Type for items in a sidebar section.
type SideBarSectionItems = (SideBarItem | SideBarGroup)[];

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
    variant?: SideBarVariant;
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

    return (
        <div
            className={
                classMerge(
                    'flex flex-col gap-(--mui-tokens-spacing-5)',
                    className
                )
            }
            {...props}
        >
            {sections.map((section) => (
                <SideBarSectionGroup
                    key={section.sectionLabel}
                    section={section}
                    sectionLabelStyle={sectionLabelStyle}
                    styles={styles}
                    variant={variant}
                />
            ))}
        </div>
    );
}