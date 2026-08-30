import useBreadcrumbs, { BreadcrumbItem } from '@hooks/useBreadcrumbs';
import useBreakpoint from '@hooks/useBreakpoint';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { CaretRightIcon, DotsThreeIcon } from '@phosphor-icons/react';
import { MouseEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * CommonBreadcrumbs
 *
 * Sticky sub-navbar breadcrumb trail component matching the AU-JAS LMS design system.
 * Supports deep hierarchy navigation (up to 5 levels) and automatically collapses
 * intermediate parent steps into an interactive `... (count)` pill on mobile viewports.
 */
export default function CommonBreadcrumbs() {
    const items = useBreadcrumbs();
    const { isMobile } = useBreakpoint();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    if (items.length === 0) {
        return null;
    }

    function handleOpenMenu(event: MouseEvent<HTMLElement>) {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    }

    function handleCloseMenu() {
        setAnchorEl(null);
    }

    function handleSelectParent(href: string) {
        handleCloseMenu();
        navigate(href);
    }

    function renderItemLink(item: BreadcrumbItem) {
        return (
            <Link
                className="font-semibold hover:text-(--mui-palette-primary-dark) hover:underline text-(--mui-palette-primary-main) text-xs transition-colors"
                to={item.href}
            >
                {item.label}
            </Link>
        );
    }

    const separator = (
        <CaretRightIcon
            aria-hidden="true"
            className="flex-shrink-0 text-(--mui-tokens-color-neutral-400)"
            size={12}
            weight="bold"
        />
    );

    const isCollapsedMobile = isMobile && items.length > 2;
    const rootItem = items[0];
    const currentItem = items[items.length - 1];
    const intermediateItems = isCollapsedMobile
        ? items.slice(1, -1)
        : [];

    return (
        <nav
            aria-label="Breadcrumb"
            className="bg-(--mui-tokens-color-common-white) border-(--mui-tokens-color-neutral-200) border-b flex flex-shrink-0 items-center justify-between md:px-6 min-h-[38px] px-4 py-2 relative shadow-2xs z-20"
        >
            <ol className="flex flex-wrap gap-1.5 items-center min-w-0 text-xs">
                {isCollapsedMobile
                    ? (
                        <>
                            <li className="flex gap-1.5 items-center shrink-0">
                                {renderItemLink(rootItem)}
                                {separator}
                            </li>

                            <li className="flex gap-1.5 items-center shrink-0">
                                <button
                                    aria-label={`Show ${intermediateItems.length} parent levels`}
                                    className="active:scale-95 bg-(--mui-tokens-color-brand-50) border border-(--mui-tokens-color-brand-200) cursor-pointer flex font-bold gap-1 hover:bg-(--mui-tokens-color-brand-100) items-center px-2 py-0.5 rounded-full text-(--mui-palette-primary-main) text-[11px] transition-all"
                                    type="button"
                                    onClick={handleOpenMenu}
                                >
                                    <DotsThreeIcon size={16} weight="bold" />
                                    <span className="font-semibold text-(--mui-tokens-color-brand-700) text-[10px]">
                                    ({intermediateItems.length})
                                    </span>
                                </button>
                                {separator}
                            </li>

                            <li aria-current="page" className="min-w-0 truncate">
                                <span className="block font-bold max-w-[130px] sm:max-w-[200px] text-(--mui-tokens-color-neutral-900) truncate">
                                    {currentItem.label}
                                </span>
                            </li>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                slotProps={{
                                    paper: {
                                        sx: {
                                            borderRadius: 'var(--mui-tokens-radius-md)',
                                            border: '1px solid var(--mui-tokens-color-neutral-200)',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            maxWidth: 300,
                                            minWidth: 220
                                        }
                                    }
                                }}
                                onClose={handleCloseMenu}
                            >
                                <div className="border-(--mui-tokens-color-neutral-200) border-b font-bold font-heading px-3 py-1.5 text-(--mui-tokens-color-neutral-400) text-[10px] tracking-wider uppercase">
                                Parent Levels
                                </div>
                                {intermediateItems.map((item, index) => (
                                    <MenuItem
                                        key={item.href}
                                        sx={{
                                            color: 'var(--mui-palette-primary-main)',
                                            fontSize: 'var(--mui-tokens-fontSize-xs)',
                                            fontWeight: 600,
                                            gap: 'var(--mui-tokens-spacing-2)',
                                            padding: 'var(--mui-tokens-spacing-2) var(--mui-tokens-spacing-3)',
                                            '&:hover': {
                                                backgroundColor: 'var(--mui-tokens-color-brand-100)'
                                            }
                                        }}
                                        onClick={() => handleSelectParent(item.href)}
                                    >
                                        <span className="font-mono text-(--mui-tokens-color-neutral-400) text-[10px]">
                                            {index + 2}.
                                        </span>
                                        <span className="truncate">{item.label}</span>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </>
                    )
                    : (
                        items.map((item) => (
                            <li
                                aria-current={item.isCurrent
                                    ? 'page'
                                    : undefined}
                                className="flex gap-1.5 items-center shrink-0"
                                key={item.href}
                            >
                                {item.isCurrent
                                    ? (
                                        <span className="font-bold text-(--mui-tokens-color-neutral-900)">
                                            {item.label}
                                        </span>
                                    )
                                    : (
                                        <>
                                            {renderItemLink(item)}
                                            {separator}
                                        </>
                                    )}
                            </li>
                        ))
                    )}
            </ol>
        </nav>
    );
}