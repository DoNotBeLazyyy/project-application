import ArrowIconRight from '@components/icons/ArrowIconRight';
import { IconButtonProps, IconButton } from '@mui/material';
import { ThemeSx } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme-util';

interface HeaderArrowButtonProps {
    buttonProps?: IconButtonProps;
    isExpanded: boolean;
}

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
                ...normalizeSx(buttonProps?.sx as ThemeSx)
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