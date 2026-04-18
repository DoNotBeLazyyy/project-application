import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import CommonTable from '@components/table/CommonTable';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { AttendanceSession, AttendanceSessionFormValues } from '@type/faculty.type';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { FieldErrors, useForm } from 'react-hook-form';
import { formErrors } from '@utils/form.util';
import { useMemo } from 'react';

const CREATE_FORM_ID = 'create-attendance-session-form';

const defaultFormValues: AttendanceSessionFormValues = {
    session_date: '',
    notes: ''
};

const fields: FormFieldConfig<AttendanceSessionFormValues>[] = [
    {
        name: 'session_date',
        rules: { required: 'Required' },
        type: 'date'
    },
    {
        name: 'notes',
        type: 'text-area'
    }
];

interface AttendanceSessionListProps {
    isCreateOpen: boolean;
    sessions: AttendanceSession[];
    onCreateClose: () => void;
    onCreateOpen: () => void;
    onCreateSubmit: (values: AttendanceSessionFormValues) => Promise<void>;
    onDelete: (sessionId: string) => Promise<void>;
    onSelectSession: (session: AttendanceSession) => Promise<void>;
}

export default function AttendanceSessionList({
    isCreateOpen,
    sessions,
    onCreateClose,
    onCreateOpen,
    onCreateSubmit,
    onDelete,
    onSelectSession
}: AttendanceSessionListProps) {
    const createMethods = useForm<AttendanceSessionFormValues>({
        defaultValues: defaultFormValues
    });

    async function handleSubmit(values: AttendanceSessionFormValues) {
        await onCreateSubmit(values);
        createMethods.reset(defaultFormValues);
    }

    function handleFormError(errors: FieldErrors<AttendanceSessionFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleClose() {
        createMethods.reset(defaultFormValues);
        onCreateClose();
    }

    const columnDefs = useMemo<ColDef<AttendanceSession>[]>(function() {
        return [
            {
                field: 'session_date',
                flex: 2,
                headerName: 'Date',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleDateString()
                    : '—'
            },
            {
                field: 'notes',
                flex: 3,
                headerName: 'Notes',
                sortable: false,
                valueFormatter: (params) => params.value || '—'
            },
            {
                headerName: '',
                maxWidth: 56,
                minWidth: 56,
                sortable: false,
                cellRenderer: (params: { data: AttendanceSession }) => (
                    <div className="flex h-full items-center justify-center">
                        <CommonButton
                            color="error"
                            size="small"
                            onClick={function(e) {
                                e.stopPropagation();
                                onDelete(params.data.id);
                            }}
                        >
                            <TrashIcon size={14} weight="bold" />
                        </CommonButton>
                    </div>
                )
            }
        ];
    }, [onDelete]);

    return (
        <div className="flex flex-col gap-3 w-80 flex-shrink-0">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Sessions
                </span>
                <CommonButton
                    size="small"
                    startIcon={<PlusIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={onCreateOpen}
                >
                    New Session
                </CommonButton>
            </div>
            <div className="flex-1 min-h-0 h-full">
                <CommonTable<AttendanceSession>
                    leadingColumnDefs={columnDefs}
                    rowData={sessions}
                    onRowClicked={function(e: RowClickedEvent<AttendanceSession>) {
                        if (e.data) {
                            onSelectSession(e.data);
                        }
                    }}
                />
            </div>
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Create a new attendance session for this section.',
                        title: 'New Attendance Session'
                    }
                }}
                open={isCreateOpen}
                onClose={handleClose}
            >
                <div className="flex flex-col gap-4 w-96">
                    <CommonForm
                        containerClassName="flex flex-col gap-4"
                        control={createMethods.control}
                        fields={fields}
                        formProps={{
                            id: CREATE_FORM_ID,
                            onSubmit: createMethods.handleSubmit(handleSubmit, handleFormError)
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={handleClose}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            form={CREATE_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Create
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
}