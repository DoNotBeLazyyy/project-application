import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useCourseOptions } from '@pages/dean/course-management/useCourseOptions';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import SectionScheduleConfig from '@pages/dean/section-management/SectionScheduleConfig';
import { BroomIcon, ChalkboardIcon } from '@phosphor-icons/react';
import { getFacultyOptions, getTerms } from '@services/section.service';
import { SectionFormValues, SectionStatus } from '@type/section.type';
import { useEffect, useState } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';

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
    setValue?: UseFormSetValue<SectionFormValues>;
}

export default function Step1SectionOverview({
    control,
    disabled,
    isCreate,
    setValue
}: Step1SectionOverviewProps) {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [facultyOptions, setFacultyOptions] = useState<CommonSelectOption[]>([]);
    const { courseOptions } = useCourseOptions({});
    const { programOptions } = useProgramOptions();

    useEffect(function() {
        async function fetchOptions() {
            const [termsResult, facultyResult] = await Promise.all([
                getTerms(),
                getFacultyOptions()
            ]);

            if (termsResult.data) {
                const availableTerms = isCreate
                    ? termsResult.data.filter((term) => term.is_active_academic_year !== false)
                    : termsResult.data;

                setTermOptions(
                    availableTerms.map((term) => ({
                        label: term.label,
                        value: term.id
                    }))
                );
            }

            if (facultyResult.data) {
                setFacultyOptions(
                    facultyResult.data.map((faculty) => ({
                        label: faculty.full_name,
                        value: faculty.id
                    }))
                );
            }
        }

        fetchOptions();
    }, [isCreate]);

    function handleClearOverview() {
        if (!setValue) return;
        setValue('term_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('program_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('course_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('faculty_id', '', { shouldValidate: false, shouldDirty: true });
        setValue('room', '', { shouldValidate: false, shouldDirty: true });
        setValue('max_slots', '40', { shouldValidate: false, shouldDirty: true });
        if (!isCreate) {
            setValue('status', 'Open', { shouldValidate: false, shouldDirty: true });
        }
    }

    const fields: FormFieldConfig<SectionFormValues>[] = [
        ...(disabled
            ? [{
                disabled: true,
                fieldProps: { helperText: 'Auto-generated section identifier' },
                name: 'section_code' as const,
                type: 'text' as const,
                gridCols: 2
            }]
            : []),
        {
            disabled,
            fieldProps: { helperText: 'Term this section runs in' },
            name: 'term_id',
            options: termOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a term' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Academic program this section belongs to (optional)' },
            name: 'program_id',
            options: programOptions,
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Course being offered in this section' },
            name: 'course_id',
            options: courseOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a course' },
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Assigned instructor (optional)' },
            name: 'faculty_id',
            options: facultyOptions,
            type: 'select',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Room or venue (optional)' },
            name: 'room',
            type: 'text',
            gridCols: 2
        },
        {
            disabled,
            fieldProps: { helperText: 'Maximum number of enrollees (1-999)' },
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
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Basic section identity, term, course, instructor, room, and capacity.
                            </p>
                        </div>
                    </div>
                    {!disabled && setValue && (
                        <button
                            type="button"
                            onClick={handleClearOverview}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                            title="Clear section overview fields"
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

            <SectionScheduleConfig control={control} disabled={disabled} />
        </div>
    );
}

