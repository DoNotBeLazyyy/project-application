import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import {
    BuildingsIcon,
    ChalkboardTeacherIcon,
    CheckCircleIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    TrashIcon,
    UserCheckIcon,
    UserCircleIcon,
    UsersIcon,
    XIcon
} from '@phosphor-icons/react';
import { getUsersByRoles } from '@services/user.service';
import { ComponentPropsForm } from '@type/common.type';
import { DepartmentAssignedUser, DepartmentFormValues } from '@type/department.type';
import { UserOption } from '@type/user.type';
import { generateDepartmentCode } from '@utils/entity-code.util';
import { useEffect, useMemo, useState } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

export const DEPARTMENT_FORM_STEPS = [
    {
        step: 1,
        title: 'Department Details',
        subtitle: 'Department code, name, and academic description'
    },
    {
        step: 2,
        title: 'Dean Assignment',
        subtitle: 'Assign or look up the department Dean'
    },
    {
        step: 3,
        title: 'Faculty Roster',
        subtitle: 'Assign or look up faculty in this department'
    }
];

interface DepartmentFormProps extends ComponentPropsForm {
    activeStep?: number;
    control: Control<DepartmentFormValues>;
    departmentId?: string | null;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<DepartmentFormValues>;
    onStepChange?: (step: number) => void;
}

export function getDepartmentFormFields(
    disabled?: boolean,
    _isCodeDisabled?: boolean
): FormFieldConfig<DepartmentFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique department code' },
            label: 'Department Code',
            name: 'code',
            rules: undefined,
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full department or college name' },
            label: 'Department Name',
            name: 'name',
            rules: disabled
                ? undefined
                : {
                    required: 'Department name is required',
                    validate: (val: unknown) =>
                        Boolean(val && String(val).trim()) || 'Department name cannot be empty or whitespace only'
                },
            type: 'text'
        },
        {
            disabled,
            label: 'Description',
            name: 'description',
            type: 'text-area'
        }
    ];
}

function getInitials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function DepartmentForm({
    activeStep = 1,
    control,
    departmentId,
    disabled = false,
    isCodeDisabled,
    isCreate = false,
    setValue,
    onStepChange,
    ...formProps
}: DepartmentFormProps) {
    const fields = getDepartmentFormFields(disabled, isCodeDisabled);
    const watchedName = useWatch({ control, name: 'name' });
    const watchedCode = useWatch({ control, name: 'code' });
    const watchedDeanId = useWatch({ control, name: 'dean_id' }) || '';
    const watchedFacultyIds = useWatch({ control, name: 'faculty_ids' }) || [];
    const watchedDeans = useWatch({ control, name: 'deans' }) || [];
    const watchedFaculties = useWatch({ control, name: 'faculties' }) || [];

    const [deanOptions, setDeanOptions] = useState<UserOption[]>([]);
    const [facultyOptions, setFacultyOptions] = useState<UserOption[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    const [deanSearch, setDeanSearch] = useState('');
    const [assignedFacultySearch, setAssignedFacultySearch] = useState('');
    const [availableFacultySearch, setAvailableFacultySearch] = useState('');
    const [onlyUnassignedFaculty, setOnlyUnassignedFaculty] = useState(false);

    useEffect(() => {
        if (!setValue || disabled || !isCreate) return;
        const generated = generateDepartmentCode(watchedName || '');
        if (generated) {
            setValue('code', generated, { shouldValidate: true, shouldDirty: true });
        } else if (!watchedName?.trim()) {
            setValue('code', '', { shouldValidate: false, shouldDirty: false });
        }
    }, [watchedName, disabled, isCreate, setValue]);

    useEffect(() => {
        let isMounted = true;
        async function fetchRoleUsers() {
            setIsLoadingUsers(true);
            try {
                const [deansRes, facultiesRes] = await Promise.all([
                    getUsersByRoles(['Dean']),
                    getUsersByRoles(['Faculty'])
                ]);
                if (!isMounted) return;
                if (deansRes.data) {
                    setDeanOptions(deansRes.data);
                }
                if (facultiesRes.data) {
                    setFacultyOptions(facultiesRes.data);
                }
            }
            finally {
                if (isMounted) {
                    setIsLoadingUsers(false);
                }
            }
        }
        fetchRoleUsers();
        return () => {
            isMounted = false;
        };
    }, []);

    // Resolve the currently selected Dean object
    const selectedDean = useMemo<UserOption | DepartmentAssignedUser | null>(() => {
        if (!watchedDeanId) return null;
        const fromOptions = deanOptions.find((d) => d.id === watchedDeanId);
        if (fromOptions) return fromOptions;
        const fromInitial = watchedDeans.find((d) => d.id === watchedDeanId);
        return fromInitial || null;
    }, [watchedDeanId, deanOptions, watchedDeans]);

    // Resolve the currently assigned Faculty objects
    const assignedFacultyList = useMemo<(UserOption | DepartmentAssignedUser)[]>(() => {
        const idSet = new Set(watchedFacultyIds);
        const result: (UserOption | DepartmentAssignedUser)[] = [];
        for (const facId of watchedFacultyIds) {
            const fromOptions = facultyOptions.find((f) => f.id === facId);
            if (fromOptions) {
                result.push(fromOptions);
                continue;
            }
            const fromInitial = watchedFaculties.find((f) => f.id === facId);
            if (fromInitial) {
                result.push(fromInitial);
            }
        }
        // Fallback if watchedFacultyIds was empty on initial load before reset
        if (result.length === 0 && idSet.size === 0 && watchedFaculties.length > 0 && disabled) {
            return watchedFaculties;
        }
        return result;
    }, [watchedFacultyIds, facultyOptions, watchedFaculties, disabled]);

    // Filter assigned faculty for lookup search
    const filteredAssignedFaculty = useMemo(() => {
        const q = assignedFacultySearch.trim().toLowerCase();
        if (!q) return assignedFacultyList;
        return assignedFacultyList.filter(
            (f) =>
                f.full_name.toLowerCase().includes(q)
                || (f.email && f.email.toLowerCase().includes(q))
        );
    }, [assignedFacultyList, assignedFacultySearch]);

    // Filter available Deans in Step 2
    const filteredDeanCandidates = useMemo(() => {
        const q = deanSearch.trim().toLowerCase();
        return deanOptions.filter((d) => {
            if (!q) return true;
            return (
                d.full_name.toLowerCase().includes(q)
                || (d.email && d.email.toLowerCase().includes(q))
                || (d.department_code && d.department_code.toLowerCase().includes(q))
            );
        });
    }, [deanOptions, deanSearch]);

    // Filter available Faculty candidates (not yet in watchedFacultyIds) in Step 3
    const availableFacultyCandidates = useMemo(() => {
        const assignedSet = new Set(watchedFacultyIds);
        const q = availableFacultySearch.trim().toLowerCase();
        return facultyOptions.filter((f) => {
            if (assignedSet.has(f.id)) return false;
            if (onlyUnassignedFaculty && f.department_id && f.department_id !== departmentId) {
                return false;
            }
            if (!q) return true;
            return (
                f.full_name.toLowerCase().includes(q)
                || (f.email && f.email.toLowerCase().includes(q))
                || (f.department_code && f.department_code.toLowerCase().includes(q))
            );
        });
    }, [facultyOptions, watchedFacultyIds, availableFacultySearch, onlyUnassignedFaculty, departmentId]);

    function handleSelectDean(deanId: string) {
        if (disabled || !setValue) return;
        setValue('dean_id', deanId, { shouldDirty: true, shouldValidate: true });
    }

    function handleAddFaculty(facultyId: string) {
        if (disabled || !setValue) return;
        if (watchedFacultyIds.includes(facultyId)) return;
        setValue('faculty_ids', [...watchedFacultyIds, facultyId], { shouldDirty: true, shouldValidate: true });
    }

    function handleRemoveFaculty(facultyId: string) {
        if (disabled || !setValue) return;
        setValue(
            'faculty_ids',
            watchedFacultyIds.filter((id) => id !== facultyId),
            { shouldDirty: true, shouldValidate: true }
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* STEP 1: DEPARTMENT DETAILS & QUICK ROSTER SUMMARY */}
            {activeStep === 1 && (
                <div className="flex flex-col gap-4">
                    <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col gap-4">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <BuildingsIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    Department Identity & Details
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Configure the academic department name and description.
                                </p>
                            </div>
                        </div>

                        <CommonForm
                            control={control}
                            fields={fields}
                            formProps={formProps}
                            hasHelper
                        />
                    </div>

                    {/* Quick Personnel Lookup Summary Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <UserCheckIcon className="w-5 h-5" weight="bold" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                                        Assigned Dean
                                    </span>
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate block">
                                        {selectedDean ? selectedDean.full_name : 'Unassigned'}
                                    </span>
                                    {selectedDean?.email && (
                                        <span className="text-xs text-slate-500 truncate block">
                                            {selectedDean.email}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {onStepChange && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    variant="text"
                                    onClick={() => onStepChange(2)}
                                >
                                    {disabled ? 'View Dean' : 'Manage'}
                                </CommonButton>
                            )}
                        </div>

                        <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <ChalkboardTeacherIcon className="w-5 h-5" weight="bold" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                                        Department Faculty
                                    </span>
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate block">
                                        {assignedFacultyList.length} Faculty {assignedFacultyList.length === 1 ? 'Member' : 'Members'}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate block">
                                        {assignedFacultyList.length > 0
                                            ? assignedFacultyList.slice(0, 2).map((f) => f.full_name).join(', ')
                                              + (assignedFacultyList.length > 2 ? ` +${assignedFacultyList.length - 2} more` : '')
                                            : 'No faculty assigned yet'}
                                    </span>
                                </div>
                            </div>
                            {onStepChange && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    variant="text"
                                    onClick={() => onStepChange(3)}
                                >
                                    {disabled ? 'View Faculty' : 'Manage'}
                                </CommonButton>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: DEAN ASSIGNMENT & LOOKUP */}
            {activeStep === 2 && (
                <div className="flex flex-col gap-4">
                    {/* Current Dean Card */}
                    <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <UserCheckIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                        Assigned Department Dean
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        {watchedName
                                            ? `Academic leader governing ${watchedName}${watchedCode ? ` (${watchedCode})` : ''}.`
                                            : 'Academic leader governing this department.'}
                                    </p>
                                </div>
                            </div>
                            {!disabled && selectedDean && (
                                <CommonButton
                                    color="error"
                                    size="small"
                                    startIcon={<XIcon className="w-3.5 h-3.5" />}
                                    variant="outlined"
                                    onClick={() => handleSelectDean('')}
                                >
                                    Unassign Dean
                                </CommonButton>
                            )}
                        </div>

                        {selectedDean ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/70 dark:border-brand-800/60">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                        {getInitials(selectedDean.full_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                                {selectedDean.full_name}
                                            </span>
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                                                Dean
                                            </span>
                                            {selectedDean.status && (
                                                <CommonBadgeStatus
                                                    label={selectedDean.status}
                                                    variant={selectedDean.status === 'Active' ? 'success' : 'warning'}
                                                />
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                            {selectedDean.email || 'No email on record'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <CheckCircleIcon className="w-4 h-4" weight="fill" />
                                    <span>Assigned to Department</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/30 text-center gap-2">
                                <UserCircleIcon className="w-8 h-8 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    No Dean Assigned
                                </span>
                                <span className="text-xs text-slate-500 max-w-sm">
                                    {disabled
                                        ? 'This department does not currently have an assigned Dean.'
                                        : 'Select a Dean from the directory below to assign them to this department.'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Dean Selection Directory (in Create / Edit mode) */}
                    {!disabled && (
                        <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                        Available Deans Directory
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Choose a user with the Dean role to lead this department.
                                    </p>
                                </div>

                                <div className="relative min-w-[240px]">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                        placeholder="Search deans by name or email..."
                                        type="text"
                                        value={deanSearch}
                                        onChange={(e) => setDeanSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {isLoadingUsers ? (
                                <div className="py-8 text-center text-xs text-slate-500">
                                    Loading deans...
                                </div>
                            ) : filteredDeanCandidates.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl">
                                    No matching users with the Dean role found.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                                    {filteredDeanCandidates.map((dean) => {
                                        const isSelected = dean.id === watchedDeanId;
                                        const isAssignedElsewhere =
                                            Boolean(dean.department_id)
                                            && dean.department_id !== departmentId;

                                        return (
                                            <div
                                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border transition-all ${
                                                    isSelected
                                                        ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30'
                                                        : 'border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/40'
                                                }`}
                                                key={dean.id}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {getInitials(dean.full_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                                                {dean.full_name}
                                                            </span>
                                                            {dean.status && (
                                                                <CommonBadgeStatus
                                                                    label={dean.status}
                                                                    variant={dean.status === 'Active' ? 'success' : 'warning'}
                                                                />
                                                            )}
                                                            {dean.department_code && (
                                                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                                                                    isAssignedElsewhere
                                                                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                }`}>
                                                                    {isAssignedElsewhere
                                                                        ? `Currently in ${dean.department_code}`
                                                                        : `Current: ${dean.department_code}`}
                                                                </span>
                                                            )}
                                                            {!dean.department_code && (
                                                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 font-medium">
                                                                    Unassigned
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-slate-500 block truncate">
                                                            {dean.email}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 self-end sm:self-center">
                                                    {isSelected ? (
                                                        <CommonButton
                                                            color="inherit"
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleSelectDean('')}
                                                        >
                                                            Selected
                                                        </CommonButton>
                                                    ) : (
                                                        <CommonButton
                                                            color="primary"
                                                            size="small"
                                                            variant={isAssignedElsewhere ? 'outlined' : 'contained'}
                                                            onClick={() => handleSelectDean(dean.id)}
                                                        >
                                                            {isAssignedElsewhere ? 'Reassign Here' : 'Assign as Dean'}
                                                        </CommonButton>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: FACULTY ROSTER LOOKUP & ASSIGNMENT */}
            {activeStep === 3 && (
                <div className="flex flex-col gap-4">
                    {/* Assigned Faculty Roster Card (Lookup + Unassign) */}
                    <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <ChalkboardTeacherIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                            Assigned Department Faculty
                                        </h4>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold">
                                            {assignedFacultyList.length}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {disabled
                                            ? 'Directory of all faculty members assigned to this department.'
                                            : 'Review or remove faculty members assigned to this department.'}
                                    </p>
                                </div>
                            </div>

                            {assignedFacultyList.length > 0 && (
                                <div className="relative min-w-[220px]">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                        placeholder="Filter assigned faculty..."
                                        type="text"
                                        value={assignedFacultySearch}
                                        onChange={(e) => setAssignedFacultySearch(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {assignedFacultyList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/30 text-center gap-2">
                                <UsersIcon className="w-8 h-8 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    No Faculty Assigned Yet
                                </span>
                                <span className="text-xs text-slate-500 max-w-sm">
                                    {disabled
                                        ? 'No faculty members are currently assigned to this department.'
                                        : 'Use the Available Faculty Directory below to assign faculty members to this department.'}
                                </span>
                            </div>
                        ) : filteredAssignedFaculty.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-500">
                                No assigned faculty match &ldquo;{assignedFacultySearch}&rdquo;.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                                {filteredAssignedFaculty.map((fac) => (
                                    <div
                                        className="flex items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-slate-50/60 dark:bg-zinc-900/40"
                                        key={fac.id}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                {getInitials(fac.full_name)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                                        {fac.full_name}
                                                    </span>
                                                    {fac.status && (
                                                        <CommonBadgeStatus
                                                            label={fac.status}
                                                            variant={fac.status === 'Active' ? 'success' : 'warning'}
                                                        />
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-500 block truncate">
                                                    {fac.email || '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {!disabled && (
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
                                                title="Unassign from department"
                                                type="button"
                                                onClick={() => handleRemoveFaculty(fac.id)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Faculty Picker (in Create / Edit mode) */}
                    {!disabled && (
                        <div className="bg-white dark:bg-zinc-800/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                        Assign Faculty Members
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Search and add faculty members to this department.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                        <input
                                            checked={onlyUnassignedFaculty}
                                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            type="checkbox"
                                            onChange={(e) => setOnlyUnassignedFaculty(e.target.checked)}
                                        />
                                        <span>Unassigned only</span>
                                    </label>

                                    <div className="relative min-w-[220px]">
                                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                            placeholder="Search faculty by name or email..."
                                            type="text"
                                            value={availableFacultySearch}
                                            onChange={(e) => setAvailableFacultySearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {isLoadingUsers ? (
                                <div className="py-8 text-center text-xs text-slate-500">
                                    Loading faculty directory...
                                </div>
                            ) : availableFacultyCandidates.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl">
                                    No additional matching faculty members available to assign.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                                    {availableFacultyCandidates.map((fac) => {
                                        const isAssignedElsewhere =
                                            Boolean(fac.department_id)
                                            && fac.department_id !== departmentId;

                                        return (
                                            <div
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/40 transition-all"
                                                key={fac.id}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {getInitials(fac.full_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                                                {fac.full_name}
                                                            </span>
                                                            {fac.status && (
                                                                <CommonBadgeStatus
                                                                    label={fac.status}
                                                                    variant={fac.status === 'Active' ? 'success' : 'warning'}
                                                                />
                                                            )}
                                                            {fac.department_code ? (
                                                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                                                                    Currently in {fac.department_code}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 font-medium">
                                                                    Unassigned
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-slate-500 block truncate">
                                                            {fac.email}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 self-end sm:self-center">
                                                    <CommonButton
                                                        color="primary"
                                                        size="small"
                                                        startIcon={<PlusIcon className="w-3.5 h-3.5" weight="bold" />}
                                                        variant={isAssignedElsewhere ? 'outlined' : 'contained'}
                                                        onClick={() => handleAddFaculty(fac.id)}
                                                    >
                                                        {isAssignedElsewhere ? 'Reassign Here' : 'Assign'}
                                                    </CommonButton>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
