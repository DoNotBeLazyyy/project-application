import Menu from '@mui/material/Menu';
import MenuItem, { MenuItemProps } from '@mui/material/MenuItem';
import { DotsThreeVerticalIcon, EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useLoadingStore } from '@stores/loading.store';
import { MouseEventSvgElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { ICellRendererParams } from 'ag-grid-community';
import { MouseEvent, ReactNode, useState } from 'react';

type MenuOptionPreset = 'view' | 'edit' | 'delete';

const PRESET_DEFAULTS: Record<MenuOptionPreset, { icon: ReactNode; label: string }> = {
    delete: {
        icon: <TrashIcon size={24} weight="bold" />,
        label: 'Delete'
    },
    edit: {
        icon: <PencilSimpleIcon size={24} weight="bold" />,
        label: 'Edit'
    },
    view: {
        icon: <EyeIcon size={24} weight="bold" />,
        label: 'View'
    }
};

export interface MenuOption extends Omit<MenuItemProps, 'children'> {
    preset?: MenuOptionPreset;
    children?: ReactNode;
}

export interface TableActionCellBaseProps<TData> {
    actionContainerClassName?: string;
    actionIconClassName?: string;
    menuOptions?: (data: TData) => MenuOption[];
    onEditClick?: (data: TData) => VoidFunction;
}

export type TableActionCellRendererParams<TData> = ICellRendererParams<TData> & TableActionCellBaseProps<TData>;

export default function TableActionCell<TData>({
    actionContainerClassName,
    actionIconClassName,
    data,
    menuOptions,
    onEditClick
}: TableActionCellRendererParams<TData>) {
    const isLoading = useLoadingStore((state) => state.isLoading);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorEl);
    const baseIconClassName = 'cursor-pointer h-[2.25rem] w-[2.25rem] p-(--mui-tokens-spacing-3) text-(--mui-palette-grey-500)';
    const resolvedIconClassName = classMerge(baseIconClassName, actionIconClassName);
    const resolvedMenuOptions = data && menuOptions
        ? menuOptions(data)
        : undefined;
    const resolvedEditClick = data && onEditClick
        ? onEditClick(data)
        : undefined;

    function handleEdit(e: MouseEvent) {
        if (isLoading) {
            return;
        }

        e.stopPropagation();
        resolvedEditClick?.();
    }

    function handleOpenMenu(e: MouseEventSvgElement) {
        e.stopPropagation();
        setAnchorEl(e.currentTarget as unknown as HTMLElement);
    }

    function handleCloseMenu(e: MouseEvent) {
        e.stopPropagation();
        setAnchorEl(null);
    }

    function createHandleActionClick(callback: MenuItemProps['onClick']) {
        return function(e: MouseEvent<HTMLLIElement>) {
            e.stopPropagation();
            setAnchorEl(null);
            callback?.(e);
        };
    }

    function resolveOptionContent(option: MenuOption): ReactNode {
        if (option.children) {
            return option.children;
        }

        if (option.preset) {
            const defaults = PRESET_DEFAULTS[option.preset];
            return (
                <div className="flex gap-2 items-center">
                    {defaults.icon}
                    <span>{defaults.label}</span>
                </div>
            );
        }

        return null;
    }

    return (
        <div
            className={classMerge(
                'flex justify-center w-full items-center gap-1 ignore_row_click',
                actionContainerClassName
            )}
        >
            {resolvedEditClick && (
                <PencilSimpleIcon
                    className={resolvedIconClassName}
                    onClick={handleEdit}
                />
            )}
            {resolvedMenuOptions && (
                <div className="flex items-center">
                    <DotsThreeVerticalIcon
                        className={resolvedIconClassName}
                        onClick={handleOpenMenu}
                    />
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
                        {resolvedMenuOptions.map(function(option, index) {
                            const { preset, onClick, ...menuItemProps } = option;
                            return (
                                <MenuItem
                                    key={preset ?? index}
                                    {...menuItemProps}
                                    onClick={onClick
                                        ? createHandleActionClick(onClick)
                                        : undefined}
                                >
                                    {resolveOptionContent(option)}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </div>
            )}
        </div>
    );
}