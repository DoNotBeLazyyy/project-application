import CommonButton from '@components/button/CommonButton';
import { ArrowDownIcon, ArrowUpIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { TermTypeListRow } from '@type/term/term-type.type';
import { periodRailColor } from '@utils/period-allocation.util';

export const TERM_TYPE_GRID_CLASS = 'gap-4 grid grid-cols-[2rem_minmax(10rem,1.5fr)_minmax(6rem,1fr)_minmax(10rem,2fr)_8.5rem] items-center min-w-2xl';

export interface TermTypeRowProps {
    canMoveDown: boolean;
    canMoveUp: boolean;
    disabled?: boolean;
    index: number;
    row: TermTypeListRow;
    onDelete: (row: TermTypeListRow) => void;
    onEdit: (row: TermTypeListRow) => void;
    onMove: (direction: number) => void;
}

/**
 * TermTypeRow
 *
 * One academic term type rendered as an ordered chronological row.
 * The numbered rail badge visually encodes the sequence (e.g. 1st Sem = 1, 2nd Sem = 2, Summer = 3),
 * and the up/down action buttons allow instant, deterministic reordering.
 */
export default function TermTypeRow({
    canMoveDown,
    canMoveUp,
    disabled = false,
    index,
    row,
    onDelete,
    onEdit,
    onMove
}: TermTypeRowProps) {
    return (
        <div className="border-(--mui-palette-divider) border-t flex flex-col last:border-b">
            <div className={`${TERM_TYPE_GRID_CLASS} py-3.5`}>
                <span
                    className="flex font-bold items-center justify-center rounded-(--mui-tokens-radius-md) shrink-0 size-8 text-(--mui-tokens-color-common-white) text-xs"
                    style={{ background: periodRailColor(index) }}
                >
                    {index + 1}
                </span>

                <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm truncate">
                        {row.label}
                    </span>
                </div>

                <div className="flex items-center min-w-0">
                    <span className="bg-blue-50/90 border border-blue-200/70 font-bold font-mono px-2.5 py-0.5 rounded-full text-blue-700 text-xs tracking-tight truncate">
                        {row.code}
                    </span>
                </div>

                <div className="min-w-0">
                    <span className="block text-(--mui-palette-text-secondary) text-xs truncate">
                        {row.description || <span className="italic text-(--mui-palette-text-disabled)">No description</span>}
                    </span>
                </div>

                <div className="flex gap-1 items-center justify-self-end">
                    <CommonButton
                        aria-label={`Move ${row.label} earlier`}
                        color="inherit"
                        disabled={disabled || !canMoveUp}
                        size="xsmall"
                        startIcon={<ArrowUpIcon weight="bold" />}
                        variant="text"
                        onClick={function() {
                            onMove(-1);
                        }}
                    />
                    <CommonButton
                        aria-label={`Move ${row.label} later`}
                        color="inherit"
                        disabled={disabled || !canMoveDown}
                        size="xsmall"
                        startIcon={<ArrowDownIcon weight="bold" />}
                        variant="text"
                        onClick={function() {
                            onMove(1);
                        }}
                    />
                    <CommonButton
                        aria-label={`Edit ${row.label}`}
                        color="inherit"
                        disabled={disabled}
                        size="xsmall"
                        startIcon={<PencilSimpleIcon weight="bold" />}
                        variant="text"
                        onClick={function() {
                            onEdit(row);
                        }}
                    />
                    <CommonButton
                        aria-label={`Delete ${row.label}`}
                        color="error"
                        disabled={disabled}
                        size="xsmall"
                        startIcon={<TrashIcon weight="bold" />}
                        variant="text"
                        onClick={function() {
                            onDelete(row);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}