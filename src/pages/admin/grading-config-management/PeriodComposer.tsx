import CommonCard from '@components/card/CommonCard';
import TableCardActionMenu from '@components/table-card/TableCardActionMenu';
import { SxProps, Theme } from '@mui/material';
import PeriodAllocationBar from '@pages/admin/grading-config-management/PeriodAllocationBar';
import PeriodAllocationRow, { PERIOD_GRID_CLASS } from '@pages/admin/grading-config-management/PeriodAllocationRow';
import { usePeriodComposer } from '@pages/admin/grading-config-management/usePeriodComposer';
import { ArrowCounterClockwiseIcon, FloppyDiskIcon, PlusIcon, ScalesIcon } from '@phosphor-icons/react';
import { AllocationTone, TERM_WEIGHT_TOTAL } from '@utils/period-allocation.util';

const TONE_CLASS: Record<AllocationTone, string> = {
    error: 'bg-(--mui-tokens-color-red-100) text-(--mui-tokens-color-red-700)',
    success: 'bg-(--mui-tokens-color-green-100) text-(--mui-tokens-color-green-700)',
    warning: 'bg-(--mui-tokens-color-yellow-100) text-(--mui-tokens-color-yellow-800)'
};

const COLUMN_HEAD_CLASS = 'font-bold text-(--mui-palette-text-secondary) text-[10.5px] tracking-[0.1em] uppercase';

const INFO_CONTENT = 'Split the term into grading periods and give each one its component breakdown. The periods must total 100% of the final grade, and each period’s components must total 100% of that period. Adding a period is offered only while the budget has room, and removing one returns its weight to the pool.';

/**
 * Combines two header rules the rest of the app already follows:
 *
 * - the elevation `CommonTableCard` gives its header, so the composer reads as
 *   the same kind of surface as every other management screen and the shadow
 *   acts as the divider above the scrolling rows;
 * - the action-slot overrides `TransmutationTab` uses, which keep the controls
 *   inline beside the title instead of dropping to their own line below `md`.
 */
const HEADER_SX: SxProps<Theme> = {
    borderBottom: '1px solid var(--mui-palette-grey-100)',
    boxShadow: '0 10px 10px -10px rgb(15 23 42 / 0.18)',
    gap: 'var(--mui-tokens-spacing-5)',
    pb: 2.5,
    position: 'relative',
    zIndex: 1,
    '&& .MuiCardHeader-action': {
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 1,
        justifyContent: 'flex-end',
        marginLeft: 'auto'
    }
};

/**
 * PeriodComposer
 *
 * Grading periods are not a list of independent records — they are one budget
 * of 100% split into ordered parts, each of which is split again. So this
 * screen is an editor, not a browsable list: the whole structure is on screen
 * at once, every weight is editable in place, and saving stays blocked until
 * the term totals 100 and every period's components do too.
 *
 * This is the deliberate exception to `docs/MANAGEMENT_LIST_CARDS.md`, which
 * governs lists of independent rows of unknown length.
 */
export default function PeriodComposer() {
    const {
        blockers,
        canSave,
        expandedKeys,
        handleAddComponent,
        handleAddPeriod,
        handleBalance,
        handleBalanceComponents,
        handleComponentChange,
        handleMovePeriod,
        handleRemoveComponent,
        handleRemovePeriod,
        handleRename,
        handleReset,
        handleSave,
        handleStep,
        handleToggleExpanded,
        handleWeightChange,
        isDirty,
        isLoading,
        isSaving,
        periods,
        status,
        total
    } = usePeriodComposer();

    /**
     * The header carries live structural status; the standing explanation of the
     * rules lives behind the info icon. The total itself is deliberately absent
     * here — it is the headline figure beside the bar, and repeating it would
     * print one number twice.
     */
    const subheader = isLoading
        ? 'Loading...'
        : `${periods.length} period${periods.length === 1
            ? ''
            : 's'} in sequence${isDirty
            ? ' · unsaved changes'
            : ''}`;

    return (
        <CommonCard
            cardHeaderProps={{
                action: (
                    <div className="flex gap-(--mui-tokens-spacing-3) items-center justify-end w-full">
                        {/* Every action lives behind the kebab, so the header carries a
                            single control regardless of how many actions exist. `0`
                            keeps it that way even as actions are added or removed. */}
                        <TableCardActionMenu
                            extraOptions={[
                                {
                                    children: 'Balance to 100%',
                                    disabled: isLoading || total === TERM_WEIGHT_TOTAL || periods.length === 0,
                                    icon: <ScalesIcon size={20} weight="bold" />,
                                    key: 'balance',
                                    onClick: handleBalance
                                },
                                {
                                    children: 'Add period',
                                    disabled: isLoading || total >= TERM_WEIGHT_TOTAL,
                                    icon: <PlusIcon size={20} weight="bold" />,
                                    key: 'add-period',
                                    onClick: handleAddPeriod
                                },
                                {
                                    children: 'Cancel',
                                    disabled: !isDirty || isSaving,
                                    icon: <ArrowCounterClockwiseIcon size={20} weight="bold" />,
                                    key: 'cancel',
                                    onClick: handleReset
                                },
                                {
                                    children: isSaving
                                        ? 'Saving...'
                                        : 'Save',
                                    disabled: !canSave,
                                    icon: <FloppyDiskIcon size={20} weight="bold" />,
                                    key: 'save',
                                    onClick: handleSave
                                }
                            ]}
                            inlineActionLimit={0}
                        />
                    </div>
                ),
                className: '@container shrink-0',
                subheader,
                sx: HEADER_SX,
                title: 'Grading Periods'
            }}
            className="flex flex-1 flex-col h-full min-h-0 w-full"
            infoContent={INFO_CONTENT}
        >
            {isLoading
                ? (
                    <div className="flex items-center justify-center py-16">
                        <span className="text-(--mui-palette-text-secondary) text-sm">Loading...</span>
                    </div>
                )
                : (
                    <div className="flex flex-1 flex-col gap-5 min-h-0 p-4">
                        {/* Fixed: the term's verdict and the bar it is read from sit
                            side by side, so the figure always labels the picture. */}
                        <div className="flex flex-wrap gap-6 items-center">
                            <div className="flex flex-col gap-1 shrink-0">
                                <span className="font-bold text-(--mui-palette-text-secondary) text-[10.5px] tracking-[0.12em] uppercase">
                                    Term allocation
                                </span>
                                <div className="flex flex-wrap gap-3 items-baseline">
                                    <b className="font-bold tabular-nums text-4xl tracking-tight">{total}%</b>
                                    <span className={`font-bold px-3 py-1 rounded-(--mui-tokens-radius-full) text-xs ${TONE_CLASS[status.tone]}`}>
                                        {status.detail}
                                    </span>
                                </div>
                            </div>

                            <PeriodAllocationBar
                                className="basis-80 grow"
                                periods={periods}
                            />
                        </div>

                        {/* What stands between the draft and a save. The allocation
                            chip above states the term's balance; this states why Save
                            is unavailable, which is a different question. */}
                        {isDirty && blockers.length > 0 && (
                            <ul className="flex flex-col gap-1 list-none text-(--mui-tokens-color-yellow-800) text-xs">
                                {blockers.map((blocker) => (
                                    <li key={blocker}>{blocker}</li>
                                ))}
                            </ul>
                        )}

                        {/* Scrollable: only the rows. The allocation summary above must
                            stay visible, since it is what the edits below are aimed at.
                            The column header sticks to the top of this same container so
                            it survives vertical scrolling while staying aligned with the
                            rows when they scroll sideways. */}
                        <div className="flex flex-col min-h-0 min-w-0 overflow-auto">
                            {periods.length > 0 && (
                                <div className={`${PERIOD_GRID_CLASS} bg-(--mui-palette-background-paper) pb-2 sticky top-0 z-10`}>
                                    <span className={COLUMN_HEAD_CLASS}>#</span>
                                    <span className={COLUMN_HEAD_CLASS}>Period</span>
                                    <span className={COLUMN_HEAD_CLASS}>Weight</span>
                                    <span className={COLUMN_HEAD_CLASS}>Components</span>
                                    <span className={`${COLUMN_HEAD_CLASS} justify-self-end`}>Actions</span>
                                </div>
                            )}

                            {periods.map((period, index) => (
                                <PeriodAllocationRow
                                    canMoveDown={index < periods.length - 1}
                                    canMoveUp={index > 0}
                                    index={index}
                                    isExpanded={expandedKeys.includes(period.key)}
                                    isOnlyPeriod={periods.length === 1}
                                    key={period.key}
                                    period={period}
                                    onAddComponent={function() {
                                        handleAddComponent(period.key);
                                    }}
                                    onBalanceComponents={function() {
                                        handleBalanceComponents(period.key);
                                    }}
                                    onComponentChange={function(componentKey, patch) {
                                        handleComponentChange(period.key, componentKey, patch);
                                    }}
                                    onMove={function(direction) {
                                        handleMovePeriod(period.key, direction);
                                    }}
                                    onRemove={function() {
                                        handleRemovePeriod(period.key);
                                    }}
                                    onRemoveComponent={function(componentKey) {
                                        handleRemoveComponent(period.key, componentKey);
                                    }}
                                    onRename={function(name) {
                                        handleRename(period.key, name);
                                    }}
                                    onStep={function(direction) {
                                        handleStep(period.key, direction);
                                    }}
                                    onToggleExpanded={function() {
                                        handleToggleExpanded(period.key);
                                    }}
                                    onWeightChange={function(next) {
                                        handleWeightChange(period.key, next);
                                    }}
                                />
                            ))}

                            {periods.length === 0 && (
                                <p className="py-8 text-(--mui-palette-text-secondary) text-center text-sm">
                                    No grading periods yet. Add the first one to start allocating the term.
                                </p>
                            )}
                        </div>
                    </div>
                )}
        </CommonCard>
    );
}