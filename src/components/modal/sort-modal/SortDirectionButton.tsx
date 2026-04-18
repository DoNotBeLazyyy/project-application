import CommonButton, { CommonButtonProps } from '@components/button/CommonButton';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';

interface SortDirectionButtonProps extends Omit<CommonButtonProps, 'children'> {
    active: boolean;
    isAsc?: boolean;
}

export default function SortDirectionButton({
    active,
    isAsc = true,
    ...props
}: SortDirectionButtonProps) {
    return (
        <CommonButton
            color={active
                ? 'primary'
                : 'inherit'}
            size="small"
            variant={active
                ? 'contained'
                : 'outlined'}
            {...props}
        >
            {isAsc
                ? <ArrowUpIcon weight="bold" />
                : <ArrowDownIcon weight="bold" />
            }
        </CommonButton>
    );
}