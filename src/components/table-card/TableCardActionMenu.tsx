import CommonButton from '@components/button/CommonButton';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, DotsThreeVerticalIcon, FunnelIcon, FunnelSimpleIcon,
    IconProps, PlusIcon, TrashIcon
} from '@phosphor-icons/react';
import { MouseEventButtonElement } from '@type/common.type';
import { ReactNode, useState } from 'react';

export interface TableCardActionOption {
    children?: ReactNode;
    disabled?: boolean;
    onClick?: VoidFunction;
}

export interface TableCardExtraOption extends TableCardActionOption {
    icon?: ReactNode;
    key: string;
}

export interface TableCardActionMenuProps {
    createButtonProps?: TableCardActionOption;
    deleteButtonProps?: TableCardActionOption;
    downloadCsvButtonProps?: TableCardActionOption;
    extraOptions?: TableCardExtraOption[];
    filterButtonProps?: TableCardActionOption;
    sortButtonProps?: TableCardActionOption;
    uploadCsvButtonProps?: TableCardActionOption;
    extraButtons?: ReactNode;
}

interface ResolvedAction extends TableCardActionOption {
    icon: ReactNode;
    isDestructive: boolean;
    key: string;
    label: string;
}

export default function TableCardActionMenu({
    createButtonProps,
    deleteButtonProps,
    downloadCsvButtonProps,
    extraButtons,
    extraOptions,
    filterButtonProps,
    sortButtonProps,
    uploadCsvButtonProps
}: TableCardActionMenuProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorEl);
    const iconProps: IconProps = {
        size: 20,
        weight: 'bold'
    };

    function buildAction(
        key: string,
        label: string,
        icon: ReactNode,
        option?: TableCardActionOption,
        isDestructive = false
    ): ResolvedAction[] {
        if (!option) {
            return [];
        }

        return [{
            ...option,
            icon,
            isDestructive,
            key,
            label
        }];
    }

    const actions: ResolvedAction[] = [
        ...buildAction('create', 'Create', <PlusIcon {...iconProps} />, createButtonProps),
        ...buildAction('filter', 'Filters', <FunnelIcon {...iconProps} />, filterButtonProps),
        ...buildAction('sort', 'Sort By', <FunnelSimpleIcon {...iconProps} />, sortButtonProps),
        ...buildAction('downloadCsv', 'CSV Template', <ArrowLineDownIcon {...iconProps} />, downloadCsvButtonProps),
        ...buildAction('uploadCsv', 'Upload CSV', <ArrowLineUpIcon {...iconProps} />, uploadCsvButtonProps),
        ...(extraOptions ?? []).map(function(option) {
            return {
                ...option,
                icon: option.icon ?? null,
                isDestructive: false,
                label: ''
            };
        }),
        ...buildAction('delete', 'Delete Selected', <TrashIcon {...iconProps} />, deleteButtonProps, true)
    ];

    function handleOpenMenu(event: MouseEventButtonElement) {
        setAnchorEl(event.currentTarget);
    }

    function handleCloseMenu() {
        setAnchorEl(null);
    }

    function createHandleActionClick(onClick?: VoidFunction) {
        return function() {
            setAnchorEl(null);
            onClick?.();
        };
    }

    if (!actions.length) {
        return <>{extraButtons}</>;
    }

    return (
        <>
            {extraButtons}
            <CommonButton
                aria-label="Table actions"
                className="min-w-0 px-2"
                color="lightGrey"
                size="small"
                variant="outlined"
                onClick={handleOpenMenu}
            >
                <DotsThreeVerticalIcon
                    size={20}
                    style={{ color: 'var(--mui-palette-grey-400)' }}
                    weight="bold"
                />
            </CommonButton>
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                open={isMenuOpen}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 'max-content',
                            width: 'max-content'
                        }
                    }
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                onClose={handleCloseMenu}
            >
                {actions.map(function(action, index) {
                    const isDividerNeeded = action.isDestructive && index > 0;

                    return [
                        isDividerNeeded && <Divider key={`${action.key}-divider`} />,
                        <MenuItem
                            disabled={action.disabled}
                            key={action.key}
                            onClick={createHandleActionClick(action.onClick)}
                        >
                            <div
                                className={action.isDestructive
                                    ? 'flex gap-2 items-center text-[var(--mui-palette-error-main)]'
                                    : 'flex gap-2 items-center'}
                            >
                                {action.icon}
                                <span>{action.children ?? action.label}</span>
                            </div>
                        </MenuItem>
                    ];
                })}
            </Menu>
        </>
    );
}