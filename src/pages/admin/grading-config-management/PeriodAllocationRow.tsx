import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import PeriodComponentBudget from '@pages/admin/grading-config-management/PeriodComponentBudget';
import WeightStepper from '@pages/admin/grading-config-management/WeightStepper';
import {
    ArrowDownIcon, ArrowUpIcon, CaretRightIcon, CheckCircleIcon, TrashIcon, WarningCircleIcon
} from '@phosphor-icons/react';
import { GradingPeriodDraft } from '@type/grading-config.type';
import { componentTotal, periodRailColor, COMPONENT_WEIGHT_TOTAL } from '@utils/period-allocation.util';

/**
 * One grid template drives both the column header and every row.
 *
 * The three control columns carry explicit widths rather than `auto`. The
 * header and the rows are separate grid containers, so an `auto` track sizes
 * itself to whatever *that* container holds — to the word "Weight" in the
 * header, to the stepper in a row — and the two silently stop lining up.
 * Fixed tracks resolve identically in both, which is what keeps them aligned.
 *
 * The min-width keeps those columns honest on a narrow viewport: the list
 * scrolls sideways rather than crushing the stepper.
 */
export const PERIOD_GRID_CLASS = 'gap-3 grid grid-cols-[2rem_minmax(10rem,1fr)_8rem_14rem_8rem] items-center min-w-3xl';

export interface PeriodAllocationRowProps {
    canMoveDown: boolean;
    canMoveUp: boolean;
    index: number;
    isExpanded: boolean;
    isOnlyPeriod: boolean;
    period: GradingPeriodDraft;
    onAddComponent: () => void;
    onBalanceComponents: () => void;
    onComponentChange: (componentKey: string, patch: { name?: string; weight?: number }) => void;
    onMove: (direction: number) => void;
    onRemove: () => void;
    onRemoveComponent: (componentKey: string) => void;
    onRename: (name: string) => void;
    onStep: (direction: number) => void;
    onToggleExpanded: () => void;
    onWeightChange: (next: number) => void;
}

/**
 * PeriodAllocationRow
 *
 * One period as an ordered band rather than a card in a reflowing grid. The
 * numbered rail carries the sequence the old grid could only put in a `SEQ-02`
 * pill, and the row expands in place into its component budget so the nested
 * structure never has to become a clamped line of prose.
 */
export default function PeriodAllocationRow({
    canMoveDown,
    canMoveUp,
    index,
    isExpanded,
    isOnlyPeriod,
    period,
    onAddComponent,
    onBalanceComponents,
    onComponentChange,
    onMove,
    onRemove,
    onRemoveComponent,
    onRename,
    onStep,
    onToggleExpanded,
    onWeightChange
}: PeriodAllocationRowProps) {
    const total = componentTotal(period);
    const isBalanced = total === COMPONENT_WEIGHT_TOTAL;
    const count = period.components.length;

    return (
        <div className="border-(--mui-palette-divider) border-t flex flex-col last:border-b">
            <div className={`${PERIOD_GRID_CLASS} py-3`}>
                <span
                    className="flex font-bold items-center justify-center rounded-(--mui-tokens-radius-md) shrink-0 size-8 text-(--mui-tokens-color-common-white) text-xs"
                    style={{ background: periodRailColor(index) }}
                >
                    {index + 1}
                </span>

                <CommonInput
                    containerClassName="min-w-0 w-full"
                    fullWidth
                    placeholder="Period name"
                    size="small"
                    value={period.name}
                    onChange={function(event) {
                        onRename(event.target.value);
                    }}
                />

                <WeightStepper
                    ariaLabel={`${period.name || 'period'} weight`}
                    className="justify-self-start"
                    value={period.weight}
                    onChange={onWeightChange}
                    onStep={onStep}
                />

                <button
                    aria-expanded={isExpanded}
                    className="border border-(--mui-palette-divider) cursor-pointer flex font-semibold gap-2 hover:bg-(--mui-tokens-color-brand-50) hover:border-(--mui-tokens-color-brand-500) items-center justify-self-start px-3 py-1.5 rounded-(--mui-tokens-radius-full) text-xs transition-colors whitespace-nowrap"
                    type="button"
                    onClick={onToggleExpanded}
                >
                    <CaretRightIcon
                        className={
                            isExpanded
                                ? 'rotate-90 transition-transform'
                                : 'transition-transform'
                        }
                        size={12}
                        weight="bold"
                    />
                    {isBalanced
                        ? (
                            <span className="flex gap-1 items-center text-(--mui-tokens-color-green-700)">
                                <CheckCircleIcon size={14} weight="fill" />
                                {count} component{count === 1
                                    ? ''
                                    : 's'} · {total}%
                            </span>
                        )
                        : (
                            <span className="flex gap-1 items-center text-(--mui-tokens-color-yellow-800)">
                                <WarningCircleIcon size={14} weight="fill" />
                                {count} component{count === 1
                                    ? ''
                                    : 's'} · {total}%
                            </span>
                        )}
                </button>

                <div className="flex gap-1 items-center justify-self-end">
                    <CommonButton
                        aria-label={`Move ${period.name || 'period'} earlier`}
                        color="inherit"
                        disabled={!canMoveUp}
                        size="xsmall"
                        startIcon={<ArrowUpIcon weight="bold" />}
                        variant="text"
                        onClick={function() {
                            onMove(-1);
                        }}
                    />
                    <CommonButton
                        aria-label={`Move ${period.name || 'period'} later`}
                        color="inherit"
                        disabled={!canMoveDown}
                        size="xsmall"
                        startIcon={<ArrowDownIcon weight="bold" />}
                        variant="text"
                        onClick={function() {
                            onMove(1);
                        }}
                    />
                    <CommonButton
                        aria-label={`Remove ${period.name || 'period'}`}
                        color="error"
                        disabled={isOnlyPeriod}
                        size="xsmall"
                        startIcon={<TrashIcon weight="bold" />}
                        variant="text"
                        onClick={onRemove}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="min-w-3xl pb-4 pl-11">
                    <PeriodComponentBudget
                        period={period}
                        onAddComponent={onAddComponent}
                        onBalance={onBalanceComponents}
                        onComponentChange={onComponentChange}
                        onRemoveComponent={onRemoveComponent}
                    />
                </div>
            )}
        </div>
    );
}