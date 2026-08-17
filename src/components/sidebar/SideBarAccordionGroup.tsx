import CommonButton from '@components/button/CommonButton';
import SubItemBorderLine from '@components/sidebar/SubItemBorderLine';
import { useSideBarContext } from '@contexts/SideBarContext';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { Accordion, AccordionSummary } from '@mui/material';
import AccordionDetails from '@mui/material/AccordionDetails';
import Tooltip from '@mui/material/Tooltip';
import { SideBarGroup, SideBarVariant, VariantStyle } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';

interface SideBarAccordionGroupProps {
    // The accordion group data to render
    group: SideBarGroup;

    // Styles based on the current variant
    styles: VariantStyle;

    // Visual variant for accordion theme matching.
    variant: SideBarVariant;
}

/**
 * SideBarAccordionGroup
 *
 * Renders a sidebar accordion group with a header and nested sub-items.
 * Uses MUI Accordion to allow expanding and collapsing sections.
 * Sub-items are displayed with optional active highlighting and a border indicator.
 *
 * @example
 * <SideBarAccordionGroup
 *     group={group}
 *     styles={variantStyles}
 *     variant="dark"
 * />
 */
export default function SideBarAccordionGroup({
    group,
    styles,
    variant
}: SideBarAccordionGroupProps) {
    const { isExpanded } = useSideBarContext();
    const {
        defaultExpanded,
        icon,
        items,
        label
    } = group; // Destructure group properties for easier access.
    const {
        expandIcon,
        groupIcon,
        groupText,
        subItemActive,
        subItemBorder,
        subItemBorderActive,
        subItemBorderInactive,
        subItemHover,
        subItemText
    } = styles; // Destructure styles for easier access.
    const activeSubItem = items.find((subItem) => subItem.isActive); // The highlighted sub-item, used as the rail click target.

    if (!isExpanded) {
        return (
            <Tooltip
                placement="right"
                title={label}
            >
                <CommonButton
                    className={
                        classMerge(
                            'flex w-full items-center justify-center rounded-(--mui-tokens-radius-md) transition-colors',
                            activeSubItem
                                ? subItemActive
                                : classMerge(
                                    subItemText,
                                    subItemHover
                                )
                        )
                    }
                    sx={{
                        minWidth: 0,
                        backgroundColor: 'transparent',
                        px: 'var(--mui-tokens-spacing-2)',
                        py: 'var(--mui-tokens-spacing-3)',
                        color: 'inherit',
                        '&:hover': {
                            backgroundColor: 'transparent'
                        }
                    }}
                    onClick={
                        activeSubItem?.onClick ?? items[0]?.onClick
                    }
                >
                    <span
                        className={
                            classMerge(
                                'flex shrink-0 [&>svg]:h-6 [&>svg]:w-6',
                                groupIcon
                            )
                        }
                    >
                        {icon}
                    </span>
                </CommonButton>
            </Tooltip>
        );
    }

    return (
        <Accordion
            className={
                variant === 'dark'
                    ? 'sidebar_dark'
                    : 'sidebar_light'
            }
            defaultExpanded={defaultExpanded}
        >
            <AccordionSummary
                className={
                    variant === 'dark'
                        ? 'sidebar_dark'
                        : 'sidebar_light'
                }
                expandIcon={
                    <KeyboardArrowDownRoundedIcon
                        className={expandIcon}
                        fontSize="small"
                    />
                }
            >
                {icon && (
                    <span
                        className={
                            classMerge(
                                'flex shrink-0 [&>svg]:h-5 [&>svg]:w-5',
                                groupIcon
                            )
                        }
                    >
                        {icon}
                    </span>
                )}
                <span
                    className={
                        classMerge(
                            'text-sm',
                            groupText
                        )
                    }
                >
                    {label}
                </span>
            </AccordionSummary>
            <AccordionDetails>
                <div className="relative ml-[1.450rem] flex flex-col gap-0.5">
                    {subItemBorder && <SubItemBorderLine
                        activeColor={subItemBorderActive}
                        inactiveColor={subItemBorderInactive}
                        items={items}
                    />}
                    {items.map((subItem) => (
                        <CommonButton
                            className={
                                subItem.isActive
                                    ? subItemActive
                                    : classMerge(
                                        subItemText,
                                        subItemHover
                                    )
                            }
                            key={subItem.label}
                            sx={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                borderRadius: 'var(--mui-tokens-radius-md)',
                                backgroundColor: 'transparent',
                                paddingLeft: 'var(--mui-tokens-spacing-4)',
                                paddingRight: 'var(--mui-tokens-spacing-4)',
                                paddingTop: '0.375rem',
                                paddingBottom: '0.375rem',
                                fontSize: 'var(--mui-tokens-fontSize-sm)',
                                fontWeight: 'var(--mui-tokens-fontWeight-normal)',
                                color: 'inherit',
                                transition: 'color 150ms, background-color 150ms',
                                '&:hover': {
                                    backgroundColor: 'transparent'
                                }
                            }}
                            onClick={subItem.onClick}
                        >
                            {subItem.label}
                        </CommonButton>
                    ))}
                </div>
            </AccordionDetails>
        </Accordion>
    );
}