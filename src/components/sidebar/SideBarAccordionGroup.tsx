import SubItemBorderLine from '@components/sidebar/SubItemBorderLine';
import { StyledAccordion, StyledAccordionSummary } from '@constants/sidebar.constant';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AccordionDetails from '@mui/material/AccordionDetails';
import ButtonBase from '@mui/material/ButtonBase';
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

export default function SideBarAccordionGroup({
    group,
    styles,
    variant
}: SideBarAccordionGroupProps) {
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

    return (
        <StyledAccordion
            defaultExpanded={defaultExpanded}
            sidebarVariant={variant}
        >
            <StyledAccordionSummary
                expandIcon={
                    <KeyboardArrowDownRoundedIcon
                        className={expandIcon}
                        fontSize="small"
                    />
                }
                sidebarVariant={variant}
            >
                {icon && (
                    <span
                        className={
                            classMerge(
                                'flex shrink-0 [&>svg]:h-[1.25rem] [&>svg]:w-[1.25rem]',
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
            </StyledAccordionSummary>
            <AccordionDetails>
                <div className="relative ml-[1.450rem] flex flex-col gap-0.5">
                    {subItemBorder && <SubItemBorderLine
                        activeColor={subItemBorderActive}
                        inactiveColor={subItemBorderInactive}
                        items={items}
                    />}
                    {items.map((subItem) => (
                        <ButtonBase
                            className={
                                subItem.isActive
                                    ? subItemActive
                                    : classMerge(
                                        subItemText,
                                        subItemHover
                                    )
                            }
                            disableRipple
                            key={subItem.label}
                            sx={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                borderRadius: 'var(--mui-shape-corner-radius-lg)',
                                paddingLeft: 'var(--mui-tokens-spacing-4)',
                                paddingRight: 'var(--mui-tokens-spacing-4)',
                                paddingTop: '0.375rem',
                                paddingBottom: '0.375rem',
                                fontSize: 'var(--mui-tokens-fontSize-sm)',
                                transition: 'color 150ms, background-color 150ms'
                            }}
                            onClick={subItem.onClick}
                        >
                            {subItem.label}
                        </ButtonBase>
                    ))}
                </div>
            </AccordionDetails>
        </StyledAccordion>
    );
}