import CommonButton from '@components/button/CommonButton';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
    ArrowLineUpIcon, DotsThreeVerticalIcon, FunnelIcon,
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
    extraOptions?: TableCardExtraOption[];
    filterSortButtonProps?: TableCardActionOption;
    /**
     * How many actions may render as direct buttons before the set collapses
     * into the kebab menu. Set by the toolbar from how much room it has.
     */
    inlineActionLimit?: number;
    showViewToggle?: boolean;
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
 * Rules driving what it renders:
 * - Filter and Sort are exposed as a single "Filter & Sort" action rather than
 *   two separate entries, since the underlying modal combines both concerns.
 * - The grid/list view toggle lives inside this menu rather than on the toolbar,
 *   so the header keeps a single control instead of two.
 * - Actions render as direct labelled buttons while they fit within
 *   `inlineActionLimit`; past that they collapse into the three-dots kebab menu.
 *   The view toggle claims its own menu section, so its presence always forces
 *   the menu.
 */
export default function TableCardActionMenu({
    createButtonProps,
    deleteButtonProps,
    extraButtons,
    extraOptions,
    filterSortButtonProps,
    inlineActionLimit = 1,
    showViewToggle = false,
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
        ...buildAction('filterSort', 'Filter & Sort', <FunnelIcon {...iconProps} />, filterSortButtonProps),
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

    // A small enough set with no view toggle renders directly instead of behind a kebab
    if (actions.length <= inlineActionLimit && !hasViewToggle) {
        return (
            <>
                {extraButtons}
                {actions.map(function(action) {
                    return (
                        <CommonButton
                            color={action.isDestructive
                                ? 'error'
                                : 'primary'}
                            disabled={action.disabled}
                            key={action.key}
                            size="small"
                            startIcon={action.icon}
                            variant={action.isDestructive
                                ? 'outlined'
                                : 'contained'}
                            onClick={createHandleActionClick(action.onClick)}
                        >
                            {action.children ?? action.label}
                        </CommonButton>
                    );
                })}
            </>
        );
    }

    return (
        <>
            {extraButtons}
            <CommonButton
                aria-label="Table actions"
                className="flex-shrink-0 min-w-9 p-0 w-9"
                color="primary"
                size="small"
                sx={{
                    backgroundColor: isMenuOpen
                        ? 'var(--mui-tokens-color-brand-100)'
                        : '#ffffff',
                    borderColor: 'var(--mui-palette-primary-main)',
                    borderWidth: '1px',
                    boxShadow: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--mui-palette-primary-main)',
                    flexShrink: 0,
                    height: '2.25rem',
                    maxHeight: '2.25rem',
                    minWidth: '2.25rem',
                    width: '2.25rem',
                    '&:hover': {
                        backgroundColor: isMenuOpen
                            ? 'var(--mui-tokens-color-brand-100)'
                            : 'var(--mui-palette-grey-100)',
                        borderColor: 'var(--mui-palette-primary-dark)',
                        color: 'var(--mui-palette-primary-dark)'
                    },
                    '&:active': {
                        backgroundColor: 'var(--mui-palette-grey-200)'
                    }
                }}
                variant="outlined"
                onClick={handleOpenMenu}
            >
                <DotsThreeVerticalIcon
                    size={20}
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