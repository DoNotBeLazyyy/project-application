import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react';
import { MouseEventButtonElement } from '@type/common.type';
import { ReactNode, useState } from 'react';

export interface BentoCardAction {
    key: string;
    label: string;
    icon?: ReactNode;
    destructive?: boolean;
    onClick: () => void;
}

interface BentoCardActionMenuProps {
    actions: BentoCardAction[];
    /** Accessible label for the kebab trigger, e.g. "Role actions". */
    ariaLabel: string;
}

/**
 * The adaptive right-hand controller for a management-list grid card: one action
 * renders as a direct button, more than one collapses into a three-dots kebab
 * menu. Shared by every `*GridCard` so the affordance stays identical everywhere.
 */
export default function BentoCardActionMenu({ actions, ariaLabel }: BentoCardActionMenuProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    function handleOpenMenu(event: MouseEventButtonElement) {
        setAnchorEl(event.currentTarget);
    }

    function handleCloseMenu() {
        setAnchorEl(null);
    }

    function runAction(action: BentoCardAction) {
        setAnchorEl(null);
        action.onClick();
    }

    if (actions.length === 1) {
        return (
            <button
                className="bg-white border border-slate-200 cursor-pointer font-semibold hover:bg-slate-50 px-3 py-1 rounded-lg shadow-2xs text-slate-700 text-xs transition-colors"
                type="button"
                onClick={actions[0].onClick}
            >
                {actions[0].label}
            </button>
        );
    }

    return (
        <>
            <button
                aria-label={ariaLabel}
                className="cursor-pointer flex items-center justify-center"
                type="button"
                onClick={handleOpenMenu}
            >
                <DotsThreeVerticalIcon size={18} weight="bold" />
            </button>
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                slotProps={{
                    paper: { sx: { minWidth: 200 } }
                }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                onClose={handleCloseMenu}
            >
                {actions.map(function(action, index) {
                    return [
                        action.destructive && index > 0 && (
                            <Divider key={`${action.key}-divider`} />
                        ),
                        <MenuItem
                            key={action.key}
                            onClick={() => runAction(action)}
                        >
                            <div
                                className={action.destructive
                                    ? 'flex gap-2 items-center text-(--mui-palette-error-main)'
                                    : 'flex gap-2 items-center'}
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </div>
                        </MenuItem>
                    ];
                })}
            </Menu>
        </>
    );
}