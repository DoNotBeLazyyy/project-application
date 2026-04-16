import ArrowIconRight from '@components/icons/ArrowIconRight';
import { IconButton, IconButtonProps } from '@mui/material';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';

interface HeaderArrowButtonProps {
    // Props passed to the IconButton component.
    buttonProps?: IconButtonProps;

    // Controls whether the accordion/group is expanded.
    isExpanded: boolean;
}

/**
 * ArrowIconDown
 * Renders an arrow button that rotates when expanded.
 *
 * Props:
 * - buttonProps: props for the MUI IconButton.
 * - isExpanded: controls the arrow rotation state.
 *
 * @example
 * <ArrowIconDown
 *  buttonProps={buttonProps}
    isExpanded={isExpanded}
 * />
 */
export default function ArrowIconDown({
    buttonProps,
    isExpanded
}: HeaderArrowButtonProps) {
    return (
        <IconButton
            disableRipple
            {...buttonProps}
            sx={[
                {
                    flexShrink: 0,
                    p: 0
                },
                ...normalizeSx(buttonProps?.sx)
            ]}
        >
            <ArrowIconRight
                className={
                    classMerge(
                        'transition-transform duration-200',
                        isExpanded && 'rotate-90'
                    )
                }
            />
        </IconButton>
    );
}