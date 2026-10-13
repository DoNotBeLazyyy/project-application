import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { EVALUATION_SCOPE_HELPER, TERM_EVALUATION_SCOPE_OPTIONS } from '@constants/evaluation.constant';
import { ExistingTermRecord, getExistingTerms } from '@services/term/term.service';
import { ComponentPropsForm } from '@type/common.type';
import { TermFormValues } from '@type/term/term.type';
import { useEffect, useMemo, useState } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface TermFormProps extends ComponentPropsForm {
    control: Control<TermFormValues>;
    disabled?: boolean;
    schoolYearOptions: CommonSelectOption[];
    termTypeOptions: CommonSelectOption[];
    currentTermId?: string | null;
    setValue?: UseFormSetValue<TermFormValues>;
    existingTerms?: ExistingTermRecord[];
}

export default function TermForm({
    control,
    disabled,
    schoolYearOptions,
    termTypeOptions,
    currentTermId,
    setValue,
    existingTerms,
    ...formProps
}: TermFormProps) {
    const startDate = useWatch({ control, name: 'start_date' });
    const watchedSchoolYearId = useWatch({ control, name: 'school_year_id' });
    const watchedTermTypeId = useWatch({ control, name: 'term_type_id' });

    const [internalExistingTerms, setInternalExistingTerms] = useState<ExistingTermRecord[]>([]);

    useEffect(() => {
        if (existingTerms) return;
        async function fetchExistingTerms() {
            const res = await getExistingTerms();
            if (res.data) {
                setInternalExistingTerms(res.data);
            }
        }
        fetchExistingTerms();
    }, [existingTerms]);

    const activeTerms = useMemo(() => {
        const termsToUse = existingTerms ?? internalExistingTerms;
        return termsToUse.filter((term) => !currentTermId || term.id !== currentTermId);
    }, [existingTerms, internalExistingTerms, currentTermId]);

    // 1. Dynamic Term Type Filtering:
    // When a School Year is selected, filter out Term Types already registered in that school year.
    const forbiddenTermTypeIds = useMemo(() => {
        if (!watchedSchoolYearId) return new Set<string>();
        const forbidden = new Set<string>();
        for (const term of activeTerms) {
            if (term.school_year_id === watchedSchoolYearId && term.term_type_id) {
                forbidden.add(term.term_type_id);
            }
        }
        return forbidden;
    }, [activeTerms, watchedSchoolYearId]);

    const filteredTermTypeOptions = useMemo(() => {
        if (forbiddenTermTypeIds.size === 0) return termTypeOptions;
        return termTypeOptions.filter((opt) => !forbiddenTermTypeIds.has(String(opt.value)));
    }, [termTypeOptions, forbiddenTermTypeIds]);

    // 2. Dynamic School Year Filtering:
    // When a Term Type is selected, filter out School Years that already have this term type.
    const forbiddenSchoolYearIds = useMemo(() => {
        if (!watchedTermTypeId) return new Set<string>();
        const forbidden = new Set<string>();
        for (const term of activeTerms) {
            if (term.term_type_id === watchedTermTypeId && term.school_year_id) {
                forbidden.add(term.school_year_id);
            }
        }
        return forbidden;
    }, [activeTerms, watchedTermTypeId]);

    const filteredSchoolYearOptions = useMemo(() => {
        if (forbiddenSchoolYearIds.size === 0) return schoolYearOptions;
        return schoolYearOptions.filter((opt) => !forbiddenSchoolYearIds.has(String(opt.value)));
    }, [schoolYearOptions, forbiddenSchoolYearIds]);

    // Auto-clear dependent values if they become forbidden due to user selection changes
    useEffect(() => {
        if (watchedTermTypeId && forbiddenTermTypeIds.has(watchedTermTypeId)) {
            setValue?.('term_type_id', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedTermTypeId, forbiddenTermTypeIds, setValue]);

    useEffect(() => {
        if (watchedSchoolYearId && forbiddenSchoolYearIds.has(watchedSchoolYearId)) {
            setValue?.('school_year_id', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedSchoolYearId, forbiddenSchoolYearIds, setValue]);

    const schoolYearHelperText = forbiddenSchoolYearIds.size > 0
        ? `Academic school year (${forbiddenSchoolYearIds.size} school year${forbiddenSchoolYearIds.size > 1
            ? 's'
            : ''} filtered: term type already registered)`
        : 'Academic school year';

    const termTypeHelperText = forbiddenTermTypeIds.size > 0
        ? `Term type (${forbiddenTermTypeIds.size} term type${forbiddenTermTypeIds.size > 1
            ? 's'
            : ''} filtered: already registered for this school year)`
        : 'Type or sequence of this term';

    const fields: FormFieldConfig<TermFormValues>[] = [
        {
            disabled,
            fieldProps: { helperText: schoolYearHelperText },
            label: 'School Year',
            name: 'school_year_id',
            options: filteredSchoolYearOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: termTypeHelperText },
            label: 'Term Type',
            name: 'term_type_id',
            options: filteredTermTypeOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            label: 'Start Date',
            name: 'start_date',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'date',
            fieldProps: {
                disablePast: !Boolean(currentTermId)
            }
        },
        {
            disabled,
            label: 'End Date',
            name: 'end_date',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    validate: (value) => {
                        if (!startDate) return true;
                        return new Date(value as string) > new Date(startDate)
                            || 'End date must be after start date';
                    }
                },
            type: 'date',
            fieldProps: {
                disablePast: !Boolean(currentTermId)
            }
        },
        {
            disabled,
            label: 'Enrollment Start Date',
            name: 'enrollment_start_date',
            type: 'date',
            fieldProps: {
                disablePast: !Boolean(currentTermId)
            }
        },
        {
            disabled,
            label: 'Enrollment End Date',
            name: 'enrollment_end_date',
            rules: disabled
                ? undefined
                : {
                    validate: (value) => {
                        if (!value) return true;
                        const enrollStart = control._getWatch('enrollment_start_date') as string;
                        if (!enrollStart) return true;
                        return new Date(value as string) > new Date(enrollStart)
                            || 'Enrollment end date must be after enrollment start date';
                    }
                },
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        },
        {
            disabled,
            label: 'Grading Deadline',
            name: 'grading_deadline',
            rules: disabled
                ? undefined
                : {
                    validate: (value) => {
                        if (!value) return true;
                        const endDate = control._getWatch('end_date') as string;
                        if (!endDate) return true;
                        return new Date(value as string) > new Date(endDate)
                            || 'Grading deadline must be after end date';
                    }
                },
            type: 'date',
            fieldProps: {
                disablePast: true
            }
        },
        {
            disabled,
            label: 'Faculty Evaluation Scope',
            name: 'evaluation_scope',
            options: TERM_EVALUATION_SCOPE_OPTIONS,
            type: 'select',
            fieldProps: {
                helperText: EVALUATION_SCOPE_HELPER
            }
        }
    ];

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}