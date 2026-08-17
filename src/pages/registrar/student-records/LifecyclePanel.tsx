import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonActionModal from '@components/modal/CommonActionModal';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { ArrowsLeftRightIcon, UserSwitchIcon } from '@phosphor-icons/react';
import { changeStudentStatus, listStudentLifecycleEvents, shiftStudentProgram } from '@services/records.service';
import { getStudentById } from '@services/student.service';
import { ProgramShiftFormValues, StatusChangeFormValues, StudentLifecycleEvent } from '@type/records.type';
import { StudentStatus } from '@type/student.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: StudentStatus }[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'LOA', value: 'LOA' },
    { label: 'Graduated', value: 'Graduated' },
    { label: 'Expelled', value: 'Expelled' }
];

const STATUS_FORM_ID = 'student-status-change-form';
const SHIFT_FORM_ID = 'student-program-shift-form';

interface LifecyclePanelProps {
    studentId: string;
}

function formatDate(value: string): string {
    return new Date(value)
        .toLocaleDateString();
}

function describeEvent(event: StudentLifecycleEvent): string {
    if (event.event_type === 'Status Change') {
        return `${event.from_status ?? '—'} → ${event.to_status ?? '—'}`;
    }

    const program = `${event.from_program_code ?? 'None'} → ${event.to_program_code ?? 'None'}`;
    const year = event.from_year_level !== event.to_year_level
        ? ` · Year ${event.from_year_level ?? '—'} → Year ${event.to_year_level ?? '—'}`
        : '';

    return `${program}${year}`;
}

export default function LifecyclePanel({ studentId }: LifecyclePanelProps) {
    const { programOptions } = useProgramOptions();
    const [events, setEvents] = useState<StudentLifecycleEvent[]>([]);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isShiftOpen, setIsShiftOpen] = useState(false);

    const statusMethods = useForm<StatusChangeFormValues>({
        defaultValues: { status: '', effective_date: '', reason: '' }
    });

    const shiftMethods = useForm<ProgramShiftFormValues>({
        defaultValues: { program_id: '', year_level: '', effective_date: '', reason: '' }
    });

    async function loadEvents() {
        const result = await listStudentLifecycleEvents(studentId);
        if (result.data) setEvents(result.data);
    }

    useEffect(function() {
        loadEvents();
    }, [studentId]);

    async function handleOpenStatus() {
        const result = await getStudentById(studentId);

        statusMethods.reset({
            status: result.data?.status ?? '',
            effective_date: '',
            reason: ''
        });
        setIsStatusOpen(true);
    }

    async function handleOpenShift() {
        const result = await getStudentById(studentId);

        shiftMethods.reset({
            program_id: result.data?.program_id ?? '',
            year_level: result.data?.year_level ?? '',
            effective_date: '',
            reason: ''
        });
        setIsShiftOpen(true);
    }

    async function handleStatusSubmit(values: StatusChangeFormValues) {
        const result = await changeStudentStatus(studentId, values);

        if (!result.error) {
            setIsStatusOpen(false);
            await loadEvents();
        }
    }

    async function handleShiftSubmit(values: ProgramShiftFormValues) {
        const result = await shiftStudentProgram(studentId, values);

        if (!result.error) {
            setIsShiftOpen(false);
            await loadEvents();
        }
    }

    function handleStatusError(errors: FieldErrors<StatusChangeFormValues>) {
        formErrors(errors, statusMethods);
    }

    function handleShiftError(errors: FieldErrors<ProgramShiftFormValues>) {
        formErrors(errors, shiftMethods);
    }

    const statusFields: FormFieldConfig<StatusChangeFormValues>[] = [
        {
            fieldProps: { helperText: 'The new enrollment status for this student' },
            name: 'status',
            options: STATUS_OPTIONS,
            rules: { required: 'Please select a status' },
            type: 'select'
        },
        {
            fieldProps: { helperText: 'When the change takes effect (defaults to today)' },
            name: 'effective_date',
            type: 'date'
        },
        {
            fieldProps: { helperText: 'Why the status is changing — kept in the permanent record' },
            name: 'reason',
            rules: { required: 'A reason is required for the audit trail' },
            type: 'text-area'
        }
    ];

    const shiftFields: FormFieldConfig<ProgramShiftFormValues>[] = [
        {
            fieldProps: { helperText: 'The program the student is shifting into' },
            name: 'program_id',
            options: programOptions,
            rules: { required: 'Please select a program' },
            type: 'select'
        },
        {
            fieldProps: { helperText: 'Year level the student enters in the new program' },
            name: 'year_level',
            options: YEAR_LEVEL_OPTIONS,
            rules: { required: 'Please select a year level' },
            type: 'select'
        },
        {
            fieldProps: { helperText: 'When the shift takes effect (defaults to today)' },
            name: 'effective_date',
            type: 'date'
        },
        {
            fieldProps: { helperText: 'Why the student is shifting — kept in the permanent record' },
            name: 'reason',
            rules: { required: 'A reason is required for the audit trail' },
            type: 'text-area'
        }
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="flex flex-col">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Student Lifecycle
                    </h1>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        Status changes and program shifts on the permanent record.
                    </span>
                </div>
                <div className="flex gap-2">
                    <CommonButton
                        size="small"
                        startIcon={<UserSwitchIcon size={16} />}
                        variant="outlined"
                        onClick={handleOpenStatus}
                    >
                        Change Status
                    </CommonButton>
                    <CommonButton
                        size="small"
                        startIcon={<ArrowsLeftRightIcon size={16} />}
                        variant="contained"
                        onClick={handleOpenShift}
                    >
                        Shift Program
                    </CommonButton>
                </div>
            </div>

            {events.length === 0 && (
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    No lifecycle events recorded for this student.
                </p>
            )}

            <div className="flex flex-col gap-2">
                {events.map(function(event) {
                    return (
                        <div
                            className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3 rounded-lg"
                            key={event.id}
                        >
                            <div className="flex flex-wrap gap-2 items-center">
                                <CommonBadgeStatus
                                    label={event.event_type}
                                    variant={event.event_type === 'Program Shift'
                                        ? 'info'
                                        : 'warning'}
                                />
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {describeEvent(event)}
                                </span>
                                <span className="ml-auto text-(--mui-palette-text-secondary) text-xs">
                                    Effective {formatDate(event.effective_date)}
                                </span>
                            </div>
                            {event.reason && (
                                <p className="text-(--mui-palette-text-secondary) text-sm">
                                    {event.reason}
                                </p>
                            )}
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Recorded by {event.created_by_name ?? 'System'} on {formatDate(event.created_at)}
                            </span>
                        </div>
                    );
                })}
            </div>

            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Record a status change with a reason for the audit trail.',
                        title: 'Change Student Status'
                    }
                }}
                containerClassName="w-140"
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setIsStatusOpen(false);
                        }
                    },
                    confirmProps: {
                        children: 'Save',
                        disabled: !statusMethods.formState.isDirty,
                        form: STATUS_FORM_ID,
                        type: 'submit'
                    }
                }}
                open={isStatusOpen}
                onClose={function() {
                    setIsStatusOpen(false);
                }}
            >
                <CommonForm
                    control={statusMethods.control}
                    fields={statusFields}
                    formProps={{
                        id: STATUS_FORM_ID,
                        onSubmit: statusMethods.handleSubmit(handleStatusSubmit, handleStatusError)
                    }}
                    hasHelper
                />
            </CommonActionModal>

            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Move the student into another program and year level.',
                        title: 'Shift Program'
                    }
                }}
                containerClassName="w-140"
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setIsShiftOpen(false);
                        }
                    },
                    confirmProps: {
                        children: 'Save',
                        disabled: !shiftMethods.formState.isDirty,
                        form: SHIFT_FORM_ID,
                        type: 'submit'
                    }
                }}
                open={isShiftOpen}
                onClose={function() {
                    setIsShiftOpen(false);
                }}
            >
                <CommonForm
                    control={shiftMethods.control}
                    fields={shiftFields}
                    formProps={{
                        id: SHIFT_FORM_ID,
                        onSubmit: shiftMethods.handleSubmit(handleShiftSubmit, handleShiftError)
                    }}
                    hasHelper
                />
            </CommonActionModal>
        </div>
    );
}