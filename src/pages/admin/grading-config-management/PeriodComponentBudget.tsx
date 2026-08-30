import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import WeightStepper from '@pages/admin/grading-config-management/WeightStepper';
import { PlusCircleIcon, ScalesIcon, TrashIcon } from '@phosphor-icons/react';
import { GradingPeriodDraft } from '@type/grading-config.type';
import {
    componentRailColor, componentTotal, toWeight, COMPONENT_WEIGHT_TOTAL, WEIGHT_STEP
} from '@utils/period-allocation.util';

export interface PeriodComponentBudgetProps {
    period: GradingPeriodDraft;
    onAddComponent: () => void;
    onBalance: () => void;
    onComponentChange: (componentKey: string, patch: { name?: string; weight?: number }) => void;
    onRemoveComponent: (componentKey: string) => void;
}

/**
 * PeriodComponentBudget
 *
 * The period's own budget, built as the same instrument one level down: a bar
 * that owns 100% of *this period*, segmented by component, with the shortfall
 * drawn as a hatched gap rather than reported in text.
 *
 * Components are edited in place. The retired card flattened them into a
 * two-line string and printed a hardcoded "100% components" underneath; here
 * the total is computed, and a period that does not close at 100 blocks the
 * save.
 */
export default function PeriodComponentBudget({
    period,
    onAddComponent,
    onBalance,
    onComponentChange,
    onRemoveComponent
}: PeriodComponentBudgetProps) {
    const total = componentTotal(period);
    const isBalanced = total === COMPONENT_WEIGHT_TOTAL;
    const scale = Math.max(COMPONENT_WEIGHT_TOTAL, total);
    const shortfall = COMPONENT_WEIGHT_TOTAL - total;

    return (
        <div className="bg-(--mui-tokens-color-neutral-50) border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-(--mui-tokens-radius-lg)">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <span className="font-bold text-(--mui-palette-text-secondary) text-[10.5px] tracking-[0.11em] uppercase">
                    Component budget · must total 100% of {period.name.trim() || 'this period'}
                </span>
                <span
                    className={
                        isBalanced
                            ? 'bg-(--mui-tokens-color-green-100) font-bold px-3 py-1 rounded-(--mui-tokens-radius-full) text-(--mui-tokens-color-green-700) text-xs'
                            : 'bg-(--mui-tokens-color-yellow-100) font-bold px-3 py-1 rounded-(--mui-tokens-radius-full) text-(--mui-tokens-color-yellow-800) text-xs'
                    }
                >
                    {isBalanced
                        ? 'Balanced'
                        : shortfall > 0
                            ? `${shortfall}% unassigned`
                            : `${Math.abs(shortfall)}% over`}
                </span>
            </div>

            <div className="bg-(--mui-tokens-color-neutral-200) flex h-7 overflow-hidden rounded-(--mui-tokens-radius-sm)">
                {period.components.map(function(component, index) {
                    const weight = toWeight(component.weight);
                    const widthPercent = (weight / scale) * 100;

                    return (
                        <div
                            className="flex font-semibold items-center justify-center overflow-hidden text-(--mui-tokens-color-common-white) text-[11px] transition-all duration-300 whitespace-nowrap"
                            key={component.key}
                            style={{
                                background: componentRailColor(index),
                                boxShadow: index === 0
                                    ? undefined
                                    : 'inset 2px 0 0 var(--mui-tokens-color-common-white)',
                                width: `${widthPercent}%`
                            }}
                            title={`${component.name || 'Untitled component'}: ${weight}%`}
                        >
                            {widthPercent > 14
                                ? `${component.name || 'Untitled'} ${weight}%`
                                : widthPercent > 5 && weight}
                        </div>
                    );
                })}

                {shortfall > 0 && (
                    <div
                        className="flex font-bold items-center justify-center text-(--mui-tokens-color-yellow-800) text-[10.5px] transition-all duration-300 whitespace-nowrap"
                        style={{
                            background: 'repeating-linear-gradient(135deg, var(--mui-tokens-color-yellow-200) 0 6px, var(--mui-tokens-color-yellow-100) 6px 12px)',
                            width: `${(shortfall / scale) * 100}%`
                        }}
                    >
                        {shortfall}% unassigned
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {period.components.map((component, index) => (
                    <div className="flex gap-2 items-center" key={component.key}>
                        <span
                            className="rounded-(--mui-tokens-radius-sm) shrink-0 size-2.5"
                            style={{ background: componentRailColor(index) }}
                        />
                        <CommonInput
                            containerClassName="grow min-w-0"
                            fullWidth
                            placeholder="Component name"
                            size="small"
                            value={component.name}
                            onChange={function(event) {
                                onComponentChange(component.key, { name: event.target.value });
                            }}
                        />
                        <WeightStepper
                            ariaLabel={`${component.name || 'component'} weight`}
                            value={component.weight}
                            onChange={function(next) {
                                onComponentChange(component.key, { weight: next });
                            }}
                            onStep={function(direction) {
                                onComponentChange(component.key, {
                                    weight: Math.max(0, toWeight(component.weight) + (direction * WEIGHT_STEP))
                                });
                            }}
                        />
                        <CommonButton
                            aria-label={`Remove ${component.name || 'component'}`}
                            color="error"
                            disabled={period.components.length === 1}
                            size="xsmall"
                            startIcon={<TrashIcon weight="bold" />}
                            variant="text"
                            onClick={function() {
                                onRemoveComponent(component.key);
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
                <CommonButton
                    color="primary"
                    size="xsmall"
                    startIcon={<PlusCircleIcon weight="bold" />}
                    variant="text"
                    onClick={onAddComponent}
                >
                    Add component
                </CommonButton>
                <CommonButton
                    color="primary"
                    disabled={isBalanced || period.components.length === 0}
                    size="xsmall"
                    startIcon={<ScalesIcon weight="bold" />}
                    variant="text"
                    onClick={onBalance}
                >
                    Distribute evenly
                </CommonButton>
            </div>
        </div>
    );
}