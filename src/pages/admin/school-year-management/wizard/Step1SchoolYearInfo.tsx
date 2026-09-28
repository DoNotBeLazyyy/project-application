import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import { CalendarDotsIcon, InfoIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { AcademicYearWizardFormValues } from '@type/school-year.type';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useFormState, useWatch } from 'react-hook-form';

interface Step1SchoolYearInfoProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    isNew?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
}

export default function Step1SchoolYearInfo({
    control,
    disabled = false,
    isNew = true,
    setValue
}: Step1SchoolYearInfoProps) {
    const startDate = useWatch({ control, name: 'start_date' });
    const endDate = useWatch({ control, name: 'end_date' });
    const isActive = useWatch({ control, name: 'is_active' });
    const { dirtyFields } = useFormState({ control, name: ['code', 'label'] });

    useEffect(() => {
        if (!isNew || !startDate || !endDate) {
            return;
        }

        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();

        if (isNaN(startYear) || isNaN(endYear)) {
            return;
        }

        if (!dirtyFields.code) {
            setValue('code', `AY-${startYear}-${endYear}`, { shouldValidate: true });
        }

        if (!dirtyFields.label) {
            setValue('label', `Academic Year ${startYear}-${endYear}`, { shouldValidate: true });
        }
    }, [startDate, endDate, isNew, setValue, dirtyFields.code, dirtyFields.label]);

    return (
        <div className="flex flex-col gap-6">
            {/* Banner info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 text-sm">
                <InfoIcon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Academic Year Identity & Operational Span
                    </p>
                    <p className="text-xs sm:text-sm">
                        Define the overarching school year. Terms, enrollment windows, grading periods, and grade transmutation rules declared in the subsequent steps will be irrevocably anchored to this academic year for historical audit integrity.
                    </p>
                </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        Start Date <span className="text-red-500">*</span>
                    </label>
                    <ValidCommonDatePicker
                        control={control}
                        disabled={disabled}
                        name="start_date"
                        rules={{ required: 'Start date is required' }}
                    />
                    <p className="text-xs text-slate-500 mt-1">Official start date of the academic calendar.</p>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        End Date <span className="text-red-500">*</span>
                    </label>
                    <ValidCommonDatePicker
                        control={control}
                        disabled={disabled}
                        name="end_date"
                        rules={{
                            required: 'End date is required',
                            validate: (val) => {
                                if (!startDate || !val) return true;
                                return new Date(val as string) > new Date(startDate)
                                    || 'End date must be strictly after start date';
                            }
                        }}
                    />
                    <p className="text-xs text-slate-500 mt-1">Official concluding date of this academic year.</p>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        Academic Year Code <span className="text-red-500">*</span>
                    </label>
                    <ValidCommonInput
                        control={control}
                        disabled={disabled}
                        name="code"
                        placeholder="e.g. AY-2026-2027"
                        rules={{ required: 'Academic year code is required' }}
                    />
                    <p className="text-xs text-slate-500 mt-1">Unique machine-readable identifier (e.g. AY-2026-2027).</p>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        Academic Year Label <span className="text-red-500">*</span>
                    </label>
                    <ValidCommonInput
                        control={control}
                        disabled={disabled}
                        name="label"
                        placeholder="e.g. Academic Year 2026-2027"
                        rules={{ required: 'Academic year label is required' }}
                    />
                    <p className="text-xs text-slate-500 mt-1">Human-friendly title displayed on transcripts and portals.</p>
                </div>
            </div>

            {/* Active Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Set as Active Academic Year
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        When active, new student enrollments, curriculum schedules, and faculty grade submissions default to this academic year. Setting this active will deactivate any previous active year.
                    </p>
                </div>
                <ValidCommonCheckbox
                    control={control}
                    disabled={disabled}
                    name="is_active"
                />
            </div>
        </div>
    );
}
