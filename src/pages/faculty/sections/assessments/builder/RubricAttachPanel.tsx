import CommonButton from '@components/button/CommonButton';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { getAssessmentRubric, listRubrics, setAssessmentRubric } from '@services/rubric.service';
import { InputChangeEvent } from '@type/common.type';
import { useEffect, useState } from 'react';

interface RubricAttachPanelProps {
    assessmentId: string;
    sectionId: string;
}

export default function RubricAttachPanel({ assessmentId, sectionId }: RubricAttachPanelProps) {
    const [options, setOptions] = useState<CommonSelectOption[]>([]);
    const [rubricId, setRubricId] = useState('');
    const [useScoring, setUseScoring] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(function() {
        if (!assessmentId) return;

        async function load() {
            const [rubricsResult, attachedResult] = await Promise.all([
                listRubrics(sectionId),
                getAssessmentRubric(assessmentId)
            ]);

            if (rubricsResult.data) {
                setOptions([
                    { label: 'No rubric', value: '' },
                    ...rubricsResult.data.map((r) => ({
                        label: `${r.title} (${r.total_points} pts)`,
                        value: r.id
                    }))
                ]);
            }

            if (attachedResult.data) {
                setRubricId(attachedResult.data.rubric_id ?? '');
                setUseScoring(attachedResult.data.use_rubric_scoring);
            }
        }

        load();
    }, [assessmentId, sectionId]);

    function handleRubricChange(event: InputChangeEvent) {
        const value = event.target.value;
        setRubricId(value);

        if (!value) {
            setUseScoring(false);
        }
    }

    async function handleSave() {
        setIsSaving(true);

        try {
            await setAssessmentRubric(assessmentId, rubricId || null, useScoring);
        }
        finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex flex-col gap-0.5">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Rubric
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Attach a section rubric to guide grading, or use it to score submissions directly.
                </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1">
                    <label className="text-(--mui-palette-text-secondary) text-xs uppercase">
                        Attached Rubric
                    </label>
                    <CommonSelect
                        fullWidth
                        options={options}
                        size="small"
                        value={rubricId}
                        onChange={handleRubricChange}
                    />
                </div>
                <button
                    className="flex gap-2 items-center py-2 text-left"
                    disabled={!rubricId}
                    type="button"
                    onClick={function() {
                        setUseScoring((prev) => !prev);
                    }}
                >
                    {useScoring
                        ? <CheckCircleIcon className="text-(--mui-palette-primary-main) shrink-0" size={20} weight="fill" />
                        : <CircleIcon className="text-(--mui-palette-text-disabled) shrink-0" size={20} />}
                    <span className="text-(--mui-palette-text-primary) text-sm">
                        Use rubric to score submissions
                    </span>
                </button>
                <CommonButton
                    disabled={isSaving}
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                >
                    {isSaving
                        ? 'Saving...'
                        : 'Save Rubric'}
                </CommonButton>
            </div>
        </div>
    );
}