import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { listRubrics } from '@services/rubric.service';
import { InputChangeEvent } from '@type/common.type';
import { useEffect, useState } from 'react';

export interface RubricSelection {
    rubricId: string;
    useScoring: boolean;
}

interface RubricAttachPanelProps {
    sectionId: string;
    value: RubricSelection;
    onChange: (value: RubricSelection) => void;
}

/**
 * Picks the rubric for an assessment. The choice is saved with the rest of the
 * assessment when the wizard's "Save" button is pressed.
 */
export default function RubricAttachPanel({ sectionId, value, onChange }: RubricAttachPanelProps) {
    const [options, setOptions] = useState<CommonSelectOption[]>([]);
    const { rubricId, useScoring } = value;

    useEffect(function() {
        async function load() {
            const rubricsResult = await listRubrics(sectionId);

            if (rubricsResult.data) {
                setOptions([
                    { label: 'No rubric', value: '' },
                    ...rubricsResult.data.map((r) => ({
                        label: `${r.title} (${r.total_points} pts)`,
                        value: r.id
                    }))
                ]);
            }
        }

        load();
    }, [sectionId]);

    function handleRubricChange(event: InputChangeEvent) {
        const nextRubricId = event.target.value;
        onChange({
            rubricId: nextRubricId,
            useScoring: nextRubricId
                ? useScoring
                : false
        });
    }

    function handleToggleScoring() {
        onChange({ rubricId, useScoring: !useScoring });
    }

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex flex-col gap-0.5">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Rubric
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Attach a section rubric to guide grading, or use it to score submissions directly. It is saved when you save the assessment.
                </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1">
                    <CommonSelect
                        fullWidth
                        label="Attached Rubric"
                        options={options}
                        value={rubricId}
                        onChange={handleRubricChange}
                    />
                </div>
                <div className="flex flex-col">
                    <button
                        className="flex gap-2 items-center py-2 text-left"
                        disabled={!rubricId}
                        type="button"
                        onClick={handleToggleScoring}
                    >
                        {useScoring
                            ? (
                                <CheckCircleIcon
                                    className="text-(--mui-palette-primary-main) shrink-0"
                                    size={20}
                                    weight="fill"
                                />
                            )
                            : (
                                <CircleIcon
                                    className="text-(--mui-palette-text-disabled) shrink-0"
                                    size={20}
                                />
                            )}
                        <span className="text-(--mui-palette-text-primary) text-sm">
                            Use rubric to score submissions
                        </span>
                    </button>
                    {!rubricId
                        ? (
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Attach a rubric above to score submissions with it.
                            </span>
                        )
                        : null}
                </div>
            </div>
        </div>
    );
}