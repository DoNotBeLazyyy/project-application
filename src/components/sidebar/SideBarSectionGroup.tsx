import SideBarAccordionGroup from '@components/sidebar/SideBarAccordionGroup';
import SideBarSimpleItem from '@components/sidebar/SideBarSimpleItem';
import { useSideBarContext } from '@contexts/SideBarContext';
import { SideBarSection, SideBarVariant, VariantStyle } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { getSectionInitials, isSideBarGroup } from '@utils/sidebar.util';

interface SideBarSectionGroupProps {
    // The section data to render.
    section: SideBarSection;

    // The section label class from the variant.
    sectionLabelStyle: string;

    // Styles based on the current variant.
    styles: VariantStyle;

    // Visual variant for accordion theme matching.
    variant: SideBarVariant;
}

/**
 * SideBarSectionGroup
 *
 * Renders a sidebar section containing a label and a list of items.
 * Items can be either simple sidebar items or accordion groups.
 * Applies styles based on the selected sidebar variant.
 *
 * @example
 * <SideBarSectionGroup
 *     section={section}
 *     styles={variantStyles}
 *     sectionLabelStyle="text-gray-400"
 *     variant="dark"
 * />
 */
export default function SideBarSectionGroup({
    section,
    sectionLabelStyle,
    styles,
    variant
}: SideBarSectionGroupProps) {
    const { isExpanded } = useSideBarContext();

    return (
        <div className="flex flex-col gap-(--mui-tokens-spacing-1)">
            {section.sectionLabel && (
                <p
                    className={
                        classMerge(
                            'overflow-hidden whitespace-nowrap px-(--mui-tokens-spacing-4) pb-(--mui-tokens-spacing-2) text-(length:--mui-tokens-fontSize-sm) font-semibold uppercase tracking-wider',
                            sectionLabelStyle
                        )
                    }
                >
                    {isExpanded
                        ? section.sectionLabel
                        : getSectionInitials(section.sectionLabel)
                    }
                </p>
            )}
            {section.items.map((item) => (
                isSideBarGroup(item)
                    ? <SideBarAccordionGroup
                        group={item}
                        key={item.label}
                        styles={styles}
                        variant={variant}
                    />
                    : <SideBarSimpleItem
                        item={item}
                        key={item.label}
                        styles={styles}
                    />
            ))}
        </div>
    );
}