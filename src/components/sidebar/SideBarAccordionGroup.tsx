import type { SideBarGroup, VariantStyle } from '@components/sidebar/CommonSideBarList';
import SubItemBorderLine from '@components/sidebar/SubItemBorderLine';
import Accordion from '@mui/material/Accordion';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ButtonBase from '@mui/material/ButtonBase';
import { classMerge } from '@utils/css.util';

interface SideBarAccordionGroupProps {
    // The accordion group data to render
    group: SideBarGroup;

    // Styles based on the current variant
    styles: VariantStyle;
}

export default function SideBarAccordionGroup({
    group,
    styles
}: SideBarAccordionGroupProps) {
    const {
        defaultExpanded,
        icon,
        items,
        label
    } = group; // Destructure group properties for easier access.

    return (
        <Accordion defaultExpanded={defaultExpanded}>
            <AccordionSummary
                expandIcon={
                    <KeyboardArrowDownRoundedIcon
                        className={styles.expandIcon}
                        fontSize="small"
                    />
                }
            >
                {icon && (
                    <span
                        className={
                            classMerge(
                                'flex shrink-0 [&>svg]:h-[1.25rem] [&>svg]:w-[1.25rem]',
                                styles.groupIcon
                            )}
                    >
                        {icon}
                    </span>
                )}
                <span
                    className={
                        classMerge(
                            'text-sm',
                            styles.groupText
                        )}
                >
                    {label}
                </span>
            </AccordionSummary>
            <AccordionDetails>
                <div className="relative ml-[1.450rem] flex flex-col gap-0.5">
                    {styles.subItemBorder && (
                        <SubItemBorderLine
                            activeColor={styles.subItemBorderActive}
                            inactiveColor={styles.subItemBorderInactive}
                            items={items}
                        />
                    )}
                    {items.map((subItem, index) => (
                        <ButtonBase
                            className={
                                subItem.isActive
                                    ? styles.subItemActive
                                    : classMerge(
                                        styles.subItemText,
                                        styles.subItemHover
                                    )
                            }
                            disableRipple
                            key={index}
                            sx={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                borderRadius: '8px',
                                px: 4,
                                py: 1.5,
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
        </Accordion>
    );
}