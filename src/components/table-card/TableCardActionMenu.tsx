import CommonButton from '@components/button/CommonButton';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, DotsThreeVerticalIcon, FunnelIcon, FunnelSimpleIcon,
    IconProps, ListIcon, PlusIcon, SquaresFourIcon, TrashIcon
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
    showViewToggle?: boolean;
    sortButtonProps?: TableCardActionOption;
    uploadCsvButtonProps?: TableCardActionOption;
    viewMode?: 'table' | 'grid';
    extraButtons?: ReactNode;
    onToggleViewMode?: (mode: 'table' | 'grid') => void;
}

interface ResolvedAction extends TableCardActionOption {
    icon: ReactNode;
    isDestructive: boolean;
    key: string;
    label: string;
}

/**
 * TableCardActionMenu
 *
 * The right-aligned action affordance for every table card header.
 *
 * Two rules drive what it renders:
 * - The grid/list view toggle lives inside this menu rather than on the toolbar,
 *   so the header keeps a single control instead of two.
 * - When exactly one action is available and the view toggle is hidden, that
 *   action renders as a direct labelled button; anything more collapses into
 *   the three-dots kebab menu.
 */
export default function TableCardActionMenu({
    createButtonProps,
    deleteButtonProps,
    downloadCsvButtonProps,
    extraButtons,
    extraOptions,
    filterButtonProps,
    showViewToggle = false,
    sortButtonProps,
    uploadCsvButtonProps,
    viewMode = 'grid',
    onToggleViewMode
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

    // The toggle occupies its own menu section, so it counts toward the kebab rule
    const hasViewToggle = showViewToggle && Boolean(onToggleViewMode);

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

    function createHandleViewModeClick(mode: 'table' | 'grid') {
        return function() {
            setAnchorEl(null);
            onToggleViewMode?.(mode);
        };
    }

    if (!actions.length && !hasViewToggle) {
        return <>{extraButtons}</>;
    }

    // Single action with no view toggle renders directly instead of behind a kebab
    if (actions.length === 1 && !hasViewToggle) {
        const [action] = actions;

        return (
            <>
                {extraButtons}
                <CommonButton
                    color={action.isDestructive
                        ? 'error'
                        : 'primary'}
                    disabled={action.disabled}
                    size="small"
                    startIcon={action.icon}
                    variant={action.isDestructive
                        ? 'outlined'
                        : 'contained'}
                    onClick={createHandleActionClick(action.onClick)}
                >
                    {action.children ?? action.label}
                </CommonButton>
            </>
        );
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
                {hasViewToggle && (
                    <div className="px-2 py-1.5">
                        <span className="block font-bold px-1.5 text-(--mui-palette-grey-500) text-[10px] tracking-wider uppercase">
                            Layout View
                        </span>
                        <div className="bg-(--mui-palette-grey-100) gap-1 grid grid-cols-2 mt-1.5 p-1 rounded-xl">
                            <CommonButton
                                aria-label="Grid View"
                                className="min-w-0 px-2 py-1"
                                color={viewMode === 'grid'
                                    ? 'primary'
                                    : 'inherit'}
                                size="small"
                                startIcon={
                                    <SquaresFourIcon
                                        size={16}
                                        weight={viewMode === 'grid'
                                            ? 'bold'
                                            : 'regular'}
                                    />
                                }
                                variant={viewMode === 'grid'
                                    ? 'contained'
                                    : 'text'}
                                onClick={createHandleViewModeClick('grid')}
                            >
                                Grid
                            </CommonButton>
                            <CommonButton
                                aria-label="Table View"
                                className="min-w-0 px-2 py-1"
                                color={viewMode === 'table'
                                    ? 'primary'
                                    : 'inherit'}
                                size="small"
                                startIcon={
                                    <ListIcon
                                        size={16}
                                        weight={viewMode === 'table'
                                            ? 'bold'
                                            : 'regular'}
                                    />
                                }
                                variant={viewMode === 'table'
                                    ? 'contained'
                                    : 'text'}
                                onClick={createHandleViewModeClick('table')}
                            >
                                List
                            </CommonButton>
                        </div>
                    </div>
                )}
                {hasViewToggle && actions.length > 0 && <Divider key="view-toggle-divider" />}
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