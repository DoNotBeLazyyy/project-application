import {
    MOBILE_CARD_HEADER_HEIGHT, MOBILE_CARD_META_ROW_HEIGHT, MOBILE_CARD_ROW_GAP, MOBILE_CARD_ROW_SPACING,
    MOBILE_CARD_VERTICAL_PADDING, TABLE_ACTION_COL_ID
} from '@constants/table.constant';
import { MouseEventDivElement } from '@type/common.type';
import { MobileCardColDef, MobileCardPlan } from '@type/table.type';
import { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Converts a React component into a static HTML string.
 * This is highly reusable for third-party vanilla JS libraries that require string-based HTML.
 *
 * @param icon - The React element to be rendered into an HTML string.
 * @returns
 */
export function createIconString(icon: ReactElement) {
    return renderToStaticMarkup(icon);
}

/**
 * Prevents the default browser context menu from appearing if the click target is within a grid row.
 *
 * @param event The mouse event triggered by a right-click interaction.
 */
export function preventDefaultContextMenu(event: MouseEventDivElement) {
    if ((event.target as HTMLElement).closest('.ag-row')) {
        event.preventDefault();
    }
}

function hasHeaderName(columnDef: MobileCardColDef): boolean {
    return typeof columnDef.headerName === 'string' && columnDef.headerName.trim().length > 0;
}

export function resolveMobileCardPlan(columnDefs: MobileCardColDef[]): MobileCardPlan {
    const visibleColumnDefs = columnDefs.filter(function(columnDef) {
        return columnDef.mobileCard !== 'hidden'
            && !columnDef.hide
            && columnDef.colId !== TABLE_ACTION_COL_ID;
    });
    const explicitTitle = visibleColumnDefs.find(function(columnDef) {
        return columnDef.mobileCard === 'title';
    });
    const explicitSubtitle = visibleColumnDefs.find(function(columnDef) {
        return columnDef.mobileCard === 'subtitle';
    });
    const candidates = visibleColumnDefs.filter(function(columnDef) {
        return columnDef.mobileCard === undefined && hasHeaderName(columnDef);
    });
    const title = explicitTitle ?? candidates[0];
    const subtitle = explicitSubtitle ?? candidates[explicitTitle
        ? 0
        : 1];
    const meta = visibleColumnDefs.filter(function(columnDef) {
        return columnDef !== title && columnDef !== subtitle;
    });

    return { meta, subtitle, title };
}

export function calculateMobileCardHeight(metaCount: number): number {
    return MOBILE_CARD_VERTICAL_PADDING
        + MOBILE_CARD_HEADER_HEIGHT
        + metaCount * (MOBILE_CARD_META_ROW_HEIGHT + MOBILE_CARD_ROW_GAP)
        + MOBILE_CARD_ROW_SPACING;
}

export function formatMobileCardValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value instanceof Date) {
        return value.toLocaleDateString();
    }

    return '—';
}