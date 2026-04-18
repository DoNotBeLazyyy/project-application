import CommonButton, { CommonButtonProps } from '@components/button/CommonButton';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, FunnelIcon, FunnelSimpleIcon, IconProps, PlusIcon, TrashIcon
} from '@phosphor-icons/react';
import { ReactNode } from 'react';

export interface TableCardButtonsProps {
    createButtonProps?: CommonButtonProps;
    deleteButtonProps?: CommonButtonProps;
    downloadCsvButtonProps?: CommonButtonProps;
    filterButtonProps?: CommonButtonProps;
    sortButtonProps?: CommonButtonProps;
    uploadCsvButtonProps?: CommonButtonProps;
    extraButtons?: ReactNode;
}

export default function TableCardButtons({
    createButtonProps,
    deleteButtonProps,
    downloadCsvButtonProps,
    extraButtons,
    filterButtonProps,
    sortButtonProps,
    uploadCsvButtonProps
}: TableCardButtonsProps) {
    const commonIconProps: IconProps = {
        size: 20,
        style: { color: 'var(--mui-palette-grey-400)' },
        weight: 'bold'
    };
    const baseProps: Partial<CommonButtonProps> = {
        size: 'small',
        variant: 'outlined'
    };
    const secondaryProps: Partial<CommonButtonProps> = { ...baseProps, color: 'lightGrey' };
    const csvProps: Partial<CommonButtonProps> = { ...baseProps, color: 'inherit' };

    return (
        <>
            {filterButtonProps && (
                <CommonButton
                    startIcon={<FunnelIcon {...commonIconProps} />}
                    {...secondaryProps}
                    {...filterButtonProps}
                >
                    {filterButtonProps.children ?? 'Filters'}
                </CommonButton>
            )}
            {sortButtonProps && (
                <CommonButton
                    startIcon={<FunnelSimpleIcon {...commonIconProps} />}
                    {...secondaryProps}
                    {...sortButtonProps}
                >
                    {sortButtonProps.children ?? 'Sort By'}
                </CommonButton>
            )}
            {downloadCsvButtonProps && (
                <CommonButton
                    startIcon={<ArrowLineDownIcon {...commonIconProps} />}
                    {...csvProps}
                    {...downloadCsvButtonProps}
                >
                    {downloadCsvButtonProps.children ?? 'CSV Template'}
                </CommonButton>
            )}
            {uploadCsvButtonProps && (
                <CommonButton
                    startIcon={<ArrowLineUpIcon {...commonIconProps} />}
                    {...csvProps}
                    {...uploadCsvButtonProps}
                >
                    {uploadCsvButtonProps.children ?? 'Upload CSV'}
                </CommonButton>
            )}
            {deleteButtonProps && (
                <CommonButton
                    color="error"
                    startIcon={<TrashIcon {...commonIconProps} />}
                    {...baseProps}
                    {...deleteButtonProps}
                >
                    {deleteButtonProps.children ?? 'Delete Selected'}
                </CommonButton>
            )}
            {createButtonProps && (
                <CommonButton
                    size="small"
                    startIcon={
                        <PlusIcon
                            size={20}
                            style={{ color: 'var(--mui-palette-common-white)' }}
                            weight="bold"
                        />
                    }
                    variant="contained"
                    {...createButtonProps}
                >
                    {createButtonProps.children ?? 'Create'}
                </CommonButton>
            )}
            {extraButtons}
        </>
    );
}