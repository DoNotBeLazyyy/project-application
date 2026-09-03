import CommonButton from '@components/button/CommonButton';
import CommonNumberInput from '@components/input/CommonNumberInput';
import CommonActionModal from '@components/modal/CommonActionModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    SPECIAL_GRADE_OPERATOR_LABELS,
    getSignalDescriptor,
    getSignalLabel
} from '@constants/special-grade-signals.constant';
import { ArrowCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import {
    clearSectionSpecialGradeOverride,
    saveSectionSpecialGradeOverride
} from '@services/faculty.service';
import { useToastStore } from '@stores/toast.store';
import {
    SectionOverridableRule,
    SpecialGradeCondition
} from '@type/grading-config.type';
import { readConditionLeaves } from '@utils/special-grade.util';
import { useEffect, useState } from 'react';

export interface SectionThresholdModalProps {
    open: boolean;
    sectionId: string;
    rules: SectionOverridableRule[];
    onClose: () => void;
    onSaved: () => void;
}

/** Keys one editable number by the rule and signal it belongs to. */
function draftKey(configId: string, signal: string): string {
    return `${configId}::${signal}`;
}

/**
 * SectionThresholdModal
 *
 * Lets section staff move the *number* on a special grade rule for their own
 * section, and nothing else.
 *
 * The signal and the operator are rendered as plain text, not as controls: what
 * gets measured is institution policy and stays the admin's to write. A section
 * may say "one missing Activity is enough here", never "measure something
 * different here". The database re-reads the signal and operator from the
 * institution rule when saving, so this restriction is enforced server-side and
 * not merely by what the screen renders.
 *
 * Only rules the admin explicitly opened for override ever reach this list, so
 * an empty list is the normal, correct state for most sections.
 */
export default function SectionThresholdModal({
    open,
    sectionId,
    rules,
    onClose,
    onSaved
}: SectionThresholdModalProps) {
    const [drafts, setDrafts] = useState<Record<string, number | undefined>>({});
    const [busyKey, setBusyKey] = useState<string | null>(null);

    useEffect(function() {
        if (!open) {
            return;
        }

        const next: Record<string, number | undefined> = {};
        rules.forEach(function(rule) {
            const leaves = readConditionLeaves(rule.conditions);

            leaves.forEach(function(leaf) {
                const override = rule.overrides.find((item) => item.signal === leaf.signal);
                next[draftKey(rule.special_grade_config_id, leaf.signal)] = override
                    ? Number(override.value)
                    : (typeof leaf.value === 'number'
                        ? leaf.value
                        : 0);
            });
        });
        setDrafts(next);
    }, [open, rules]);

    async function handleSave(rule: SectionOverridableRule, leaf: SpecialGradeCondition) {
        const key = draftKey(rule.special_grade_config_id, leaf.signal);
        const next = drafts[key];

        if (next === undefined) {
            return;
        }

        setBusyKey(key);
        const result = await saveSectionSpecialGradeOverride(
            sectionId,
            rule.special_grade_config_id,
            leaf.signal,
            next
        );
        setBusyKey(null);

        if (!result.error) {
            useToastStore.getState()
                .showToast(
                    'Saved for this section. Recalculate grades to re-check your students.',
                    'success'
                );
            onSaved();
        }
    }

    async function handleReset(rule: SectionOverridableRule, leaf: SpecialGradeCondition) {
        const key = draftKey(rule.special_grade_config_id, leaf.signal);

        setBusyKey(key);
        const result = await clearSectionSpecialGradeOverride(
            sectionId,
            rule.special_grade_config_id,
            leaf.signal
        );
        setBusyKey(null);

        if (!result.error) {
            setDrafts(function(previous) {
                return {
                    ...previous,
                    [key]: typeof leaf.value === 'number'
                        ? leaf.value
                        : 0
                };
            });
            useToastStore.getState()
                .showToast('Back to the institution default for this section.', 'success');
            onSaved();
        }
    }

    return (
        <CommonActionModal
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Change the numbers for this section only. Every other section keeps the institution default.',
                    title: 'Section thresholds'
                }
            }}
            containerClassName="max-w-full w-[44rem]"
            formButtonsProps={{
                cancelProps: {
                    children: 'Close',
                    onClick: onClose
                },
                confirmProps: {
                    sx: { display: 'none' }
                }
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                {rules.length === 0
                    ? (
                        <div className="border border-(--mui-palette-divider) border-dashed flex flex-col gap-1 items-center p-6 rounded-lg text-center">
                            <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                                Nothing to adjust
                            </p>
                            <p className="text-(--mui-palette-text-secondary) text-xs">
                                No special grade rule has been opened up for section-level
                                thresholds. Ask an administrator if a rule should be adjustable.
                            </p>
                        </div>
                    )
                    : null}

                {rules.map(function(rule) {
                    const leaves = readConditionLeaves(rule.conditions);

                    return (
                        <div
                            className="border border-(--mui-palette-divider) flex flex-col rounded-lg"
                            key={rule.special_grade_config_id}
                        >
                            <div className="border-b border-(--mui-palette-divider) flex flex-wrap gap-2 items-center px-3 py-2">
                                <span className="bg-(--mui-tokens-color-neutral-100) border border-(--mui-tokens-color-neutral-300) font-bold font-mono px-2 py-0.5 rounded text-(--mui-palette-primary-main) text-xs">
                                    {rule.code}
                                </span>
                                <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                    {rule.label}
                                </span>
                                {rule.description
                                    ? (
                                        <CommonInfoTooltip
                                            content={rule.description}
                                            label={`About ${rule.code}`}
                                            size={16}
                                        />
                                    )
                                    : null}
                            </div>

                            <div className="flex flex-col gap-2 p-3">
                                {leaves.map(function(leaf) {
                                    const key = draftKey(rule.special_grade_config_id, leaf.signal);
                                    const descriptor = getSignalDescriptor(leaf.signal);
                                    const override = rule.overrides.find(
                                        (item) => item.signal === leaf.signal
                                    );
                                    const institutionValue = typeof leaf.value === 'number'
                                        ? leaf.value
                                        : 0;
                                    const isBusy = busyKey === key;
                                    const isRange = leaf.op === 'between';
                                    const isValueless = leaf.op === 'is_null'
                                        || leaf.op === 'not_null';

                                    if (isRange || isValueless) {
                                        return (
                                            <div
                                                className="bg-(--mui-palette-background-default) flex gap-2 items-center p-2 rounded-lg"
                                                key={key}
                                            >
                                                <CommonInfoTooltip
                                                    content={descriptor?.description ?? 'Unknown signal.'}
                                                    label={`What ${getSignalLabel(leaf.signal)} measures`}
                                                    placement="right"
                                                    size={16}
                                                />
                                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                                    {getSignalLabel(leaf.signal)}
                                                    {' — this condition has no single number to adjust.'}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            className="bg-(--mui-palette-background-default) flex flex-wrap gap-2 items-center p-2 rounded-lg"
                                            key={key}
                                        >
                                            <CommonInfoTooltip
                                                content={descriptor?.description ?? 'Unknown signal.'}
                                                label={`What ${getSignalLabel(leaf.signal)} measures`}
                                                placement="right"
                                                size={16}
                                            />

                                            <span className="flex-1 min-w-40 text-(--mui-palette-text-primary) text-sm">
                                                {getSignalLabel(leaf.signal)}
                                                {' '}
                                                <span className="text-(--mui-palette-text-secondary)">
                                                    {SPECIAL_GRADE_OPERATOR_LABELS[leaf.op]}
                                                </span>
                                            </span>

                                            <CommonNumberInput
                                                className="w-20"
                                                hasClearButton={false}
                                                maxDecimals={0}
                                                size="small"
                                                value={drafts[key] ?? 0}
                                                variant="outlined"
                                                onChange={(next) => setDrafts(function(previous) {
                                                    return { ...previous, [key]: next ?? 0 };
                                                })}
                                            />
                                            <span className="text-(--mui-palette-text-secondary) text-sm whitespace-nowrap">
                                                {descriptor?.unit}
                                            </span>

                                            <span className="text-(--mui-palette-text-secondary) text-xs whitespace-nowrap">
                                                {override
                                                    ? `Institution default: ${institutionValue}`
                                                    : 'Using institution default'}
                                            </span>

                                            <div className="flex gap-1 ml-auto">
                                                <CommonButton
                                                    disabled={isBusy || drafts[key] === undefined}
                                                    size="small"
                                                    startIcon={<CheckIcon size={14} weight="bold" />}
                                                    variant="outlined"
                                                    onClick={() => void handleSave(rule, leaf)}
                                                >
                                                    Save
                                                </CommonButton>
                                                <CommonButton
                                                    disabled={isBusy || !override}
                                                    size="small"
                                                    startIcon={<ArrowCounterClockwiseIcon size={14} weight="bold" />}
                                                    variant="text"
                                                    onClick={() => void handleReset(rule, leaf)}
                                                >
                                                    Reset
                                                </CommonButton>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </CommonActionModal>
    );
}