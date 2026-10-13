import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { BroomIcon, ChalkboardIcon } from '@phosphor-icons/react';
import {
    FacultyOption, getExistingSectionOfferings, getFacultyOptions, getTerms, SectionOfferingRecord, TermOption
} from '@services/section.service';
import { SectionFormValues, SectionStatus } from '@type/section.type';
import { useEffect, useMemo, useState } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: SectionStatus }[] = [
    { label: 'Open', value: 'Open' },
    { label: 'Full', value: 'Full' },
    { label: 'Ongoing', value: 'Ongoing' },
    { label: 'Closed', value: 'Closed' },
    { label: 'Cancelled', value: 'Cancelled' }
];

interface Step1SectionOverviewProps {
    control: Control<SectionFormValues>;
    disabled?: boolean;
    isCreate?: boolean;
    sectionId?: string | null;
    setValue?: UseFormSetValue<SectionFormValues>;
}

export default function Step1SectionOverview({
    control,
    disabled,
    isCreate,
    sectionId,
    setValue
}: Step1SectionOverviewProps) {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [facultyOptions, setFacultyOptions] = useState<CommonSelectOption[]>([]);
    const [existingOfferings, setExistingOfferings] = useState<SectionOfferingRecord[]>([]);
    const { courseOptions } = useCourseOptions({});

    const watchedTermId = useWatch({ control, name: 'term_id' });
    const watchedCourseId = useWatch({ control, name: 'course_id' });
    const watchedFacultyId = useWatch({ control, name: 'faculty_id' });

    useEffect(function() {
        async function fetchOptions() {
            const [termsResult, facultyResult, offeringsResult] = await Promise.all([
                getTerms(),
                getFacultyOptions(),
                getExistingSectionOfferings()
            ]);

            if (termsResult.data) {
                const availableTerms = isCreate
                    ? termsResult.data.filter((term: TermOption) => term.is_active_academic_year !== false)
                    : termsResult.data;

                setTermOptions(
                    availableTerms.map((term: TermOption) => ({
                        label: term.label,
                        value: term.id
                    }))
                );
            }

            if (facultyResult.data) {
                setFacultyOptions(
                    facultyResult.data.map((faculty: FacultyOption) => ({
                        label: faculty.full_name,
                        value: faculty.id
                    }))
                );
            }

            if (offeringsResult.data) {
                setExistingOfferings(offeringsResult.data);
            }
        }

        fetchOptions();
    }, [isCreate]);

    // Exclude the current section being edited from collision checks
    const activeOfferings = useMemo(() => {
        return existingOfferings.filter((offering) => !sectionId || offering.id !== sectionId);
    }, [existingOfferings, sectionId]);

    // 1. Dynamic Course Filtering:
    // When Term & Faculty are selected, filter out courses already taught by this faculty in this term.
    const forbiddenCourseIds = useMemo(() => {
        if (!watchedTermId || !watchedFacultyId) return new Set<string>();
        const forbidden = new Set<string>();
        for (const offering of activeOfferings) {
            if (
                offering.term_id === watchedTermId
                && offering.faculty_id === watchedFacultyId
                && offering.course_id
            ) {
                forbidden.add(offering.course_id);
            }
        }
        return forbidden;
    }, [activeOfferings, watchedTermId, watchedFacultyId]);

    const filteredCourseOptions = useMemo(() => {
        if (forbiddenCourseIds.size === 0) return courseOptions;
        return courseOptions.filter((opt) => !forbiddenCourseIds.has(String(opt.value)));
    }, [courseOptions, forbiddenCourseIds]);

    // 2. Dynamic Term Filtering:
    // When Course & Faculty are selected, filter out terms where this faculty already teaches this course.
    const forbiddenTermIds = useMemo(() => {
        if (!watchedCourseId || !watchedFacultyId) return new Set<string>();
        const forbidden = new Set<string>();
        for (const offering of activeOfferings) {
            if (
                offering.course_id === watchedCourseId
                && offering.faculty_id === watchedFacultyId
                && offering.term_id
            ) {
                forbidden.add(offering.term_id);
            }
        }
        return forbidden;
    }, [activeOfferings, watchedCourseId, watchedFacultyId]);

    const filteredTermOptions = useMemo(() => {
        if (forbiddenTermIds.size === 0) return termOptions;
        return termOptions.filter((opt) => !forbiddenTermIds.has(String(opt.value)));
    }, [termOptions, forbiddenTermIds]);

    // 3. Dynamic Faculty Filtering:
    // When Term & Course are selected, filter out faculty who already teach this course in this term.
    const forbiddenFacultyIds = useMemo(() => {
        if (!watchedTermId || !watchedCourseId) return new Set<string>();
        const forbidden = new Set<string>();
        for (const offering of activeOfferings) {
            if (
                offering.term_id === watchedTermId
                && offering.course_id === watchedCourseId
                && offering.faculty_id
            ) {
                forbidden.add(offering.faculty_id);
            }
        }
        return forbidden;
    }, [activeOfferings, watchedTermId, watchedCourseId]);

    const filteredFacultyOptions = useMemo(() => {
        if (forbiddenFacultyIds.size === 0) return facultyOptions;
        return facultyOptions.filter((opt) => !forbiddenFacultyIds.has(String(opt.value)));
    }, [facultyOptions, forbiddenFacultyIds]);

    // Auto-clear dependent values if they become forbidden due to user selection changes
    useEffect(() => {
        if (watchedCourseId && forbiddenCourseIds.has(watchedCourseId)) {
            setValue?.('course_id', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedCourseId, forbiddenCourseIds, setValue]);

    useEffect(() => {
        if (watchedTermId && forbiddenTermIds.has(watchedTermId)) {
            setValue?.('term_id', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedTermId, forbiddenTermIds, setValue]);

    useEffect(() => {
        if (watchedFacultyId && forbiddenFacultyIds.has(watchedFacultyId)) {
            setValue?.('faculty_id', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedFacultyId, forbiddenFacultyIds, setValue]);

    function handleClearOverview() {
        if (!setValue) return;
        setValue('term_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('course_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('faculty_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('room', '', { shouldValidate: false, shouldDirty: true });
        setValue('max_slots', '40', { shouldValidate: false, shouldDirty: true });
        if (!isCreate) {
            setValue('status', 'Open', { shouldValidate: false, shouldDirty: true });
        }
    }

    const termHelperText = forbiddenTermIds.size > 0
        ? `Term this section runs in (${forbiddenTermIds.size} term${forbiddenTermIds.size > 1
            ? 's'
            : ''} filtered: instructor already assigned to course)`
        : 'Term this section runs in';

    const courseHelperText = forbiddenCourseIds.size > 0
        ? `Course being offered (${forbiddenCourseIds.size} course${forbiddenCourseIds.size > 1
            ? 's'
            : ''} filtered: instructor already assigned in this term)`
        : 'Course being offered in this section';

    const facultyHelperText = forbiddenFacultyIds.size > 0
        ? `Assigned instructor (${forbiddenFacultyIds.size} instructor${forbiddenFacultyIds.size > 1
            ? 's'
            : ''} filtered: already assigned to course in this term)`
        : 'Assigned instructor (optional)';

    const fields: FormFieldConfig<SectionFormValues>[] = [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique section code' },
            label: 'Section Code',
            name: 'section_code',
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: termHelperText },
            label: 'Term',
            name: 'term_id',
            options: filteredTermOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a term' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: courseHelperText },
            label: 'Course',
            name: 'course_id',
            options: filteredCourseOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a course' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: facultyHelperText },
            label: 'Faculty',
            name: 'faculty_id',
            options: filteredFacultyOptions,
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Room or venue (optional)' },
            label: 'Room',
            name: 'room',
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Maximum number of enrollees (1-999)' },
            label: 'Max Slots',
            name: 'max_slots',
            rules: disabled
                ? undefined
                : {
                    required: 'Maximum slots is required',
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 999, message: 'Cannot exceed 999' }
                },
            type: 'number',
            gridCols: 2
        },
        ...(!isCreate
            ? [{
                disabled,
                fieldProps: { helperText: 'Current status of this section' },
                label: 'Status',
                name: 'status' as const,
                options: STATUS_OPTIONS,
                rules: disabled
                    ? undefined
                    : { required: 'Please select a status' },
                type: 'select' as const,
                gridCols: 2
            }]
            : [])
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col gap-4">
                {/* Section Overview Header with Title & Description on Left, Clear Button on Right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <ChalkboardIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                        <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Section Overview
                            </h4>
                        </div>
                    </div>
                    {!disabled && setValue && (
                        <button
                            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                            title="Clear section overview fields"
                            type="button"
                            onClick={handleClearOverview}
                        >
                            <BroomIcon className="w-4 h-4" />
                            <span>Clear</span>
                        </button>
                    )}
                </div>

                <CommonForm
                    containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                    control={control}
                    fields={fields}
                    hasHelper
                />
            </div>
        </div>
    );
}