import type { SideBarSection } from '@components/sidebar/CommonSideBarList';
import SideBarAccordionGroup from '@components/sidebar/SideBarAccordionGroup';
import SideBarSimpleItem from '@components/sidebar/SideBarSimpleItem';
import { isSideBarGroup } from '@constants/sidebar.constant';
import { SideBarVariant, VariantStyle } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';

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
 * Renders a single sidebar section with an optional label and a list of items or accordion groups.
 */
export default function SideBarSectionGroup({
    section,
    sectionLabelStyle,
    styles,
    variant
}: SideBarSectionGroupProps) {
    return (
        <div className="flex flex-col gap-[var(--mui-tokens-spacing-1)]">
            {section.sectionLabel && (
                <p
                    className={
                        classMerge(
                            'px-[var(--mui-tokens-spacing-4)] pb-[var(--mui-tokens-spacing-2)] text-[length:var(--mui-tokens-fontSize-sm)] font-semibold uppercase tracking-wider',
                            sectionLabelStyle
                        )
                    }
                >
                    {section.sectionLabel}
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