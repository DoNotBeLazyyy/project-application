import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { createRubric, getRubric, updateRubric } from '@services/rubric.service';
import { RubricCriterionInput, RubricFormValues } from '@type/rubric.type';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

const EMPTY_CRITERION = { id: null, title: '', description: '', max_points: '' };

const DEFAULT_VALUES: RubricFormValues = {
    title: '',
    description: '',
    criteria: [{ ...EMPTY_CRITERION }]
};

export default function RubricBuilderPage() {
    const { sectionId = '', rubricId = '' } = useParams<{ sectionId: string; rubricId: string }>();
    const navigate = useNavigate();
    const isNew = rubricId === 'new';

    const [isSaving, setIsSaving] = useState(false);

    const {
        control, formState, handleSubmit, reset, watch
    } = useForm<RubricFormValues>({
        defaultValues: DEFAULT_VALUES
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'criteria' });

    const watchedCriteria = watch('criteria');

    const totalPoints = useMemo(function() {
        return watchedCriteria.reduce(function(sum, criterion) {
            const value = Number(criterion.max_points);
            return sum + (Number.isFinite(value)
                ? value
                : 0);
        }, 0);
    }, [watchedCriteria]);

    useEffect(function() {
        if (isNew || !rubricId) return;

        async function fetchRubric() {
            const result = await getRubric(rubricId);

            if (result.data) {
                reset({
                    title:       result.data.title,
                    description: result.data.description ?? '',
                    criteria:    result.data.criteria.length > 0
                        ? result.data.criteria.map((c) => ({
                            id:          c.id,
                            title:       c.title,
                            description: c.description ?? '',
                            max_points:  String(c.max_points)
                        }))
                        : [{ ...EMPTY_CRITERION }]
                });
            }
        }

        fetchRubric();
    }, [rubricId, isNew]);

    async function onSubmit(values: RubricFormValues) {
        setIsSaving(true);

        const criteria: RubricCriterionInput[] = values.criteria.map((c) => ({
            id:          c.id,
            title:       c.title.trim(),
            description: c.description.trim(),
            max_points:  Number(c.max_points)
        }));

        try {
            if (isNew) {
                const result = await createRubric(sectionId, values.title, values.description, criteria);

                if (!result.error) {
                    navigate(`/faculty/sections/${sectionId}?tab=rubrics`);
                }
            }
            else {
                const result = await updateRubric(rubricId, values.title, values.description, criteria);

                if (!result.error) {
                    navigate(`/faculty/sections/${sectionId}?tab=rubrics`);
                }
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    return (
        <CommonCard className="h-full w-full">
            <form className="flex flex-col gap-4 h-full" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex gap-3 items-center justify-between">
                    <div className="flex gap-3 items-center">
                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                            type="button"
                            variant="outlined"
                            onClick={function() {
                                navigate(`/faculty/sections/${sectionId}?tab=rubrics`);
                            }}
                        >
                            Back
                        </CommonButton>
                        <div className="flex flex-col">
                            <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                                {isNew
                                    ? 'New Rubric'
                                    : 'Edit Rubric'}
                            </h1>
                            <p className="text-(--mui-palette-text-secondary) text-sm">
                                Total: {totalPoints} pts
                            </p>
                        </div>
                    </div>
                    <CommonButton
                        disabled={isSaving || (!isNew && !formState.isDirty)}
                        size="small"
                        type="submit"
                        variant="contained"
                    >
                        {isSaving
                            ? 'Saving...'
                            : 'Save Rubric'}
                    </CommonButton>
                </div>

                <div className="flex flex-1 flex-col gap-4 min-h-0 overflow-y-auto">
                    <div className="flex flex-col gap-4 sm:max-w-2xl">
                        <ValidCommonInput
                            control={control}
                            hasHelper
                            helperText="A short name for this rubric."
                            label="Title"
                            name="title"
                            rules={{ required: 'Title is required.' }}
                        />
                        <ValidCommonInput
                            control={control}
                            hasHelper
                            helperText="Optional context for graders."
                            label="Description"
                            name="description"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                Criteria
                            </span>
                            <CommonButton
                                color="inherit"
                                size="small"
                                startIcon={<PlusIcon size={14} weight="bold" />}
                                type="button"
                                variant="outlined"
                                onClick={function() {
                                    append({ ...EMPTY_CRITERION });
                                }}
                            >
                                Add Criterion
                            </CommonButton>
                        </div>

                        {fields.map(function(fieldItem, index) {
                            return (
                                <div
                                    className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg"
                                    key={fieldItem.id}
                                >
                                    <div className="flex gap-3 items-start">
                                        <div className="flex flex-1 flex-col gap-3">
                                            <ValidCommonInput
                                                control={control}
                                                hasHelper
                                                label="Criterion"
                                                name={`criteria.${index}.title`}
                                                rules={{ required: 'Required.' }}
                                            />
                                            <ValidCommonInput
                                                control={control}
                                                label="Guidance"
                                                name={`criteria.${index}.description`}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 w-28">
                                            <ValidCommonInput
                                                control={control}
                                                hasHelper
                                                label="Max Points"
                                                name={`criteria.${index}.max_points`}
                                                rules={{ required: 'Required.' }}
                                                type="number"
                                            />
                                            <CommonButton
                                                color="error"
                                                disabled={fields.length === 1}
                                                size="small"
                                                startIcon={<TrashIcon size={14} weight="bold" />}
                                                type="button"
                                                variant="outlined"
                                                onClick={function() {
                                                    remove(index);
                                                }}
                                            >
                                                Remove
                                            </CommonButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </form>
        </CommonCard>
    );
}