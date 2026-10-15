import CommonButton from '@components/button/CommonButton';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
    ArrowsClockwiseIcon,
    CalendarDotsIcon,
    CheckIcon,
    ClockIcon,
    DotsThreeVerticalIcon,
    GridFourIcon,
    ListBulletsIcon,
    PlusIcon
} from '@phosphor-icons/react';
import { MouseEventButtonElement } from '@type/common.type';
import { useState } from 'react';
import {
    CALENDAR_CATEGORIES,
    CalendarEventCategory,
    CalendarViewMode
} from './calendar.types';

export interface CalendarActionMenuProps {
    activeCategories: Set<CalendarEventCategory>;
    canCreateEvents?: boolean;
    isLoading?: boolean;
    viewMode: CalendarViewMode;
    onCreateEvent?: () => void;
    onReload: () => void;
    onSelectAllCategories: () => void;
    onSelectViewMode: (mode: CalendarViewMode) => void;
    onToggleCategory: (category: CalendarEventCategory) => void;
}

/**
 * CalendarActionMenu
 *
 * Adaptive three-dots action menu for the Academic & Campus Calendar.
 * Houses view mode switches, category filter toggles, and contextual actions,
 * matching the TableCardActionMenu pattern used across the application.
 */
export default function CalendarActionMenu({
    activeCategories,
    canCreateEvents = false,
    isLoading = false,
    viewMode,
    onCreateEvent,
    onReload,
    onSelectAllCategories,
    onSelectViewMode,
    onToggleCategory
}: CalendarActionMenuProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorEl);

    const isFilterActive = activeCategories.size < CALENDAR_CATEGORIES.length;

    const handleOpenMenu = (event: MouseEventButtonElement) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleViewSelect = (mode: CalendarViewMode) => {
        onSelectViewMode(mode);
        handleCloseMenu();
    };

    return (
        <>
            <CommonButton
                aria-label="Calendar options and filters"
                className="flex-shrink-0 min-w-9 p-0 w-9 relative"
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
                <DotsThreeVerticalIcon size={20} weight="bold" />
                {isFilterActive && (
                    <span
                        className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-neutral-900"
                        title="Filters currently active"
                    />
                )}
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
                            minWidth: 230,
                            maxWidth: 290,
                            borderRadius: '12px'
                        }
                    }
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                onClose={handleCloseMenu}
            >
                {/* 1. View Mode Section */}
                <div className="px-3 py-1.5">
                    <span className="block font-bold px-1 text-(--mui-palette-grey-500) text-[10px] tracking-wider uppercase">
                        View Mode
                    </span>
                    <div className="bg-(--mui-palette-grey-100) dark:bg-neutral-800 gap-1 grid grid-cols-2 mt-1.5 p-1 rounded-xl">
                        <CommonButton
                            aria-label="Month View"
                            className="min-w-0 px-2 py-1 text-xs"
                            color={viewMode === 'month' ? 'primary' : 'inherit'}
                            size="small"
                            startIcon={
                                <GridFourIcon
                                    size={14}
                                    weight={viewMode === 'month' ? 'bold' : 'regular'}
                                />
                            }
                            variant={viewMode === 'month' ? 'contained' : 'text'}
                            onClick={() => handleViewSelect('month')}
                        >
                            Month
                        </CommonButton>

                        <CommonButton
                            aria-label="Week View"
                            className="min-w-0 px-2 py-1 text-xs"
                            color={viewMode === 'week' ? 'primary' : 'inherit'}
                            size="small"
                            startIcon={
                                <CalendarDotsIcon
                                    size={14}
                                    weight={viewMode === 'week' ? 'bold' : 'regular'}
                                />
                            }
                            variant={viewMode === 'week' ? 'contained' : 'text'}
                            onClick={() => handleViewSelect('week')}
                        >
                            Week
                        </CommonButton>

                        <CommonButton
                            aria-label="Day View"
                            className="min-w-0 px-2 py-1 text-xs"
                            color={viewMode === 'day' ? 'primary' : 'inherit'}
                            size="small"
                            startIcon={
                                <ClockIcon
                                    size={14}
                                    weight={viewMode === 'day' ? 'bold' : 'regular'}
                                />
                            }
                            variant={viewMode === 'day' ? 'contained' : 'text'}
                            onClick={() => handleViewSelect('day')}
                        >
                            Day
                        </CommonButton>

                        <CommonButton
                            aria-label="Agenda View"
                            className="min-w-0 px-2 py-1 text-xs"
                            color={viewMode === 'agenda' ? 'primary' : 'inherit'}
                            size="small"
                            startIcon={
                                <ListBulletsIcon
                                    size={14}
                                    weight={viewMode === 'agenda' ? 'bold' : 'regular'}
                                />
                            }
                            variant={viewMode === 'agenda' ? 'contained' : 'text'}
                            onClick={() => handleViewSelect('agenda')}
                        >
                            Agenda
                        </CommonButton>
                    </div>
                </div>

                {/* 2. Filter Categories Section */}
                <Divider />
                <div className="px-3 pt-2 pb-1">
                    <div className="flex items-center justify-between px-1">
                        <span className="font-bold text-(--mui-palette-grey-500) text-[10px] tracking-wider uppercase">
                            Filter Categories
                        </span>
                        <button
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            type="button"
                            onClick={onSelectAllCategories}
                        >
                            {activeCategories.size === CALENDAR_CATEGORIES.length ? 'Reset' : 'Select All'}
                        </button>
                    </div>
                </div>

                {CALENDAR_CATEGORIES.map((cat) => {
                    const isChecked = activeCategories.has(cat.id);
                    return (
                        <MenuItem
                            className="py-1 px-3 text-xs flex items-center justify-between"
                            dense
                            key={cat.id}
                            onClick={() => onToggleCategory(cat.id)}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dotClass}`} />
                                <span
                                    className={`text-xs ${
                                        isChecked
                                            ? 'font-medium text-(--mui-palette-text-primary)'
                                            : 'text-(--mui-palette-text-secondary)'
                                    }`}
                                >
                                    {cat.label}
                                </span>
                            </div>
                            {isChecked && (
                                <CheckIcon
                                    className="text-blue-600 shrink-0 ml-2"
                                    size={14}
                                    weight="bold"
                                />
                            )}
                        </MenuItem>
                    );
                })}

                {/* 3. Actions Section */}
                <Divider />
                <div className="px-3 pt-2 pb-1">
                    <span className="block font-bold px-1 text-(--mui-palette-grey-500) text-[10px] tracking-wider uppercase">
                        Actions
                    </span>
                </div>

                {canCreateEvents && onCreateEvent && (
                    <MenuItem
                        className="py-1.5 px-3 text-xs"
                        dense
                        onClick={() => {
                            handleCloseMenu();
                            onCreateEvent();
                        }}
                    >
                        <div className="flex gap-2 items-center text-blue-600 font-medium">
                            <PlusIcon size={16} weight="bold" />
                            <span>Create Event</span>
                        </div>
                    </MenuItem>
                )}

                <MenuItem
                    className="py-1.5 px-3 text-xs"
                    dense
                    onClick={() => {
                        handleCloseMenu();
                        onReload();
                    }}
                >
                    <div className="flex gap-2 items-center">
                        <ArrowsClockwiseIcon
                            className={isLoading ? 'animate-spin' : ''}
                            size={16}
                        />
                        <span>Reload Calendar</span>
                    </div>
                </MenuItem>
            </Menu>
        </>
    );
}
