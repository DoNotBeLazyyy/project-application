import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { getAcademicThresholds, updateAcademicThresholds } from '@services/academic-threshold.service';
import { AcademicThreshold, AcademicThresholdCategory, AcademicThresholdsFormValues } from '@type/academic-threshold.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useMemo, useState } from 'react';
import { Controller, FieldErrors, useForm } from 'react-hook-form';

const THRESHOLDS_FORM_ID = 'academic-thresholds-form';

const CATEGORY_ORDER: AcademicThresholdCategory[] = ['Honor', 'Scholarship', 'Standing'];

const CATEGORY_DESCRIPTION: Record<AcademicThresholdCategory, string> = {
    Honor: 'Latin honor cutoffs. A student qualifies for the highest honor whose GWA ceiling they meet.',
    Scholarship: 'Academic scholarship cutoffs and the tuition discount awarded at each tier.',
    Standing: 'The passing GWA ceiling used to derive Good Standing versus Probation.'
};

interface ThresholdMeta {
    label: string;
    category: AcademicThresholdCategory;
    isScholarship: boolean;
}

export default function AcademicThresholdManagement() {
    const [isLoading, setIsLoading] = useState(true);
    const [metaById, setMetaById] = useState<Record<string, ThresholdMeta>>({});
    const methods = useForm<AcademicThresholdsFormValues>({
        defaultValues: { thresholds: [] }
    });
    const { control, handleSubmit, reset, getValues } = methods;

    useEffect(function() {
        async function loadThresholds() {
            const result = await getAcademicThresholds();

            if (result.data) {
                const meta: Record<string, ThresholdMeta> = {};

                result.data.forEach(function(t: AcademicThreshold) {
                    meta[t.id] = {
                        label: t.label,
                        category: t.category,
                        isScholarship: t.category === 'Scholarship'
                    };
                });

                setMetaById(meta);
                reset({
                    thresholds: result.data.map((t: AcademicThreshold) => ({
                        id: t.id,
                        min_gwa: t.min_gwa === null
                            ? ''
                            : String(t.min_gwa),
                        max_gwa: String(t.max_gwa),
                        requires_no_failing: t.requires_no_failing,
                        scholarship_discount_pct: t.scholarship_discount_pct === null
                            ? ''
                            : String(t.scholarship_discount_pct),
                        is_active: t.is_active
                    }))
                });
            }

            setIsLoading(false);
        }

        loadThresholds();
    }, []);

    const groupedIndexes = useMemo(function() {
        const groups: Record<AcademicThresholdCategory, number[]> = {
            Honor: [],
            Scholarship: [],
            Standing: []
        };

        getValues('thresholds')
            .forEach(function(t, index) {
                const category = metaById[t.id]?.category;

                if (category) {
                    groups[category].push(index);
                }
            });

        return groups;
    }, [metaById, isLoading]);

    async function onSubmit(values: AcademicThresholdsFormValues) {
        const result = await updateAcademicThresholds(values.thresholds);

        if (!result.error) {
            reset(values);
        }
    }

    function onError(errors: FieldErrors<AcademicThresholdsFormValues>) {
        formErrors(errors, methods);
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    Loading academic thresholds...
                </span>
            </div>
        );
    }

    return (
        <CommonCard className="h-full">
            <div className="flex flex-col gap-6 h-full max-w-4xl overflow-y-auto">
                <div className="flex flex-col gap-1">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Academic Thresholds
                    </h1>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Configure the honor, scholarship, and standing cutoffs used across grade
                        computation and learning analytics.
                    </p>
                </div>

                <form
                    className="flex flex-col gap-8"
                    id={THRESHOLDS_FORM_ID}
                    onSubmit={handleSubmit(onSubmit, onError)}
                >
                    {CATEGORY_ORDER.map(function(category) {
                        const indexes = groupedIndexes[category];

                        if (indexes.length === 0) {
                            return null;
                        }

                        return (
                            <div className="flex flex-col gap-3" key={category}>
                                <div className="flex flex-col gap-0.5">
                                    <h2 className="font-medium text-(--mui-palette-text-primary) text-base">
                                        {category}
                                    </h2>
                                    <p className="text-(--mui-palette-text-secondary) text-xs">
                                        {CATEGORY_DESCRIPTION[category]}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {indexes.map(function(index) {
                                        const id = getValues(`thresholds.${index}.id`);
                                        const meta = metaById[id];

                                        return (
                                            <div
                                                className="border border-(--mui-palette-divider) flex flex-col gap-3 rounded-lg p-4"
                                                key={id}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                                        {meta?.label}
                                                    </span>
                                                    <Controller
                                                        control={control}
                                                        name={`thresholds.${index}.is_active`}
                                                        render={({ field }) => (
                                                            <label className="flex gap-2 items-center text-(--mui-palette-text-secondary) text-xs">
                                                                <input
                                                                    checked={field.value}
                                                                    type="checkbox"
                                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                                />
                                                                Active
                                                            </label>
                                                        )}
                                                    />
                                                </div>

                                                <div className="gap-4 grid grid-cols-2">
                                                    <ValidCommonInput
                                                        control={control}
                                                        hasHelper
                                                        helperText="Lowest GWA in this band (display only)."
                                                        inputProps={{ step: '0.01' }}
                                                        label="Minimum GWA"
                                                        name={`thresholds.${index}.min_gwa`}
                                                        type="number"
                                                    />
                                                    <ValidCommonInput
                                                        control={control}
                                                        hasHelper
                                                        helperText="Highest GWA that still qualifies."
                                                        inputProps={{ step: '0.01' }}
                                                        label="Maximum GWA"
                                                        name={`thresholds.${index}.max_gwa`}
                                                        rules={{
                                                            required: 'Maximum GWA is required',
                                                            min: { value: 1, message: 'Must be at least 1.00' },
                                                            max: { value: 5, message: 'Cannot exceed 5.00' }
                                                        }}
                                                        type="number"
                                                    />
                                                    {meta?.isScholarship && (
                                                        <ValidCommonInput
                                                            control={control}
                                                            hasHelper
                                                            helperText="Tuition discount percent for this tier."
                                                            inputProps={{ step: '0.01' }}
                                                            label="Discount %"
                                                            name={`thresholds.${index}.scholarship_discount_pct`}
                                                            rules={{
                                                                min: { value: 0, message: 'Cannot be negative' },
                                                                max: { value: 100, message: 'Cannot exceed 100' }
                                                            }}
                                                            type="number"
                                                        />
                                                    )}
                                                    {category !== 'Standing' && (
                                                        <Controller
                                                            control={control}
                                                            name={`thresholds.${index}.requires_no_failing`}
                                                            render={({ field }) => (
                                                                <label className="flex gap-2 items-center self-end pb-2 text-(--mui-palette-text-secondary) text-sm">
                                                                    <input
                                                                        checked={field.value}
                                                                        type="checkbox"
                                                                        onChange={(e) => field.onChange(e.target.checked)}
                                                                    />
                                                                    Requires no failing grade
                                                                </label>
                                                            )}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </form>

                <div className="flex gap-2 justify-start">
                    <CommonButton
                        size="small"
                        variant="outlined"
                        onClick={() => reset()}
                    >
                        Reset
                    </CommonButton>
                    <CommonButton
                        form={THRESHOLDS_FORM_ID}
                        size="small"
                        type="submit"
                        variant="contained"
                    >
                        Save Thresholds
                    </CommonButton>
                </div>
            </div>
        </CommonCard>
    );
}