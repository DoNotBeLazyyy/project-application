import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import EvaluationTemplateFormPanel from '@pages/admin/evaluation-management/EvaluationTemplateForm';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { createEvaluationTemplate, deleteEvaluationTemplate, getEvaluationTemplates, updateEvaluationTemplate } from '@services/evaluation.service';
import { EvaluationTemplateForm, EvaluationTemplateRow } from '@type/evaluation.type';
import { CommonListResDto } from '@type/http.type';
import { ColDef } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'evaluation-template-create';
const UPDATE_FORM_ID = 'evaluation-template-update';

const DEFAULT_VALUES: EvaluationTemplateForm = {
    title: '',
    description: '',
    is_active: true,
    sequence: '1',
    program_ids: [],
    questions: [
        {
            question_text: '',
            question_type: 'Rating',
            is_required: true,
            min_rating: '1',
            max_rating: '5'
        }
    ]
};

function mapToFormValues(template: EvaluationTemplateRow): EvaluationTemplateForm {
    return {
        id: template.id,
        title: template.title,
        description: template.description ?? '',
        is_active: template.is_active,
        sequence: String(template.sequence ?? 1),
        program_ids: template.program_ids ?? [],
        questions: template.questions.length
            ? template.questions.map((question) => ({
                id: question.id,
                question_text: question.question_text,
                question_type: question.question_type,
                is_required: question.is_required,
                min_rating: String(question.min_rating ?? 1),
                max_rating: String(question.max_rating ?? 5)
            }))
            : DEFAULT_VALUES.questions
    };
}

function formatPrograms(programIds: string[], options: CommonSelectOption[]): string {
    if (!programIds.length) {
        return 'All programs';
    }

    return programIds
        .map(function(programId) {
            return options.find((option) => option.value === programId)?.label ?? programId;
        })
        .join(', ');
}

function buildListDto(content: EvaluationTemplateRow[]): CommonListResDto<EvaluationTemplateRow> {
    const size = content.length || 1;

    return {
        content,
        empty: content.length === 0,
        first: true,
        last: true,
        number: 0,
        numberOfElements: content.length,
        pageable: {
            offset: 0,
            paged: true,
            pageNumber: 0,
            pageSize: size,
            sort: { empty: true, sorted: false, unsorted: true },
            unpaged: false
        },
        size,
        sort: { empty: true, sorted: false, unsorted: true },
        totalElements: content.length,
        totalPages: 1
    };
}

export default function EvaluationManagement() {
    const [templates, setTemplates] = useState<EvaluationTemplateRow[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const createMethods = useForm<EvaluationTemplateForm>({
        defaultValues: DEFAULT_VALUES,
        mode: 'all'
    });

    const updateMethods = useForm<EvaluationTemplateForm>({
        defaultValues: DEFAULT_VALUES,
        mode: 'all'
    });

    const { programOptions } = useProgramOptions();

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function fetchTemplates() {
        const result = await getEvaluationTemplates();
        if (!result.data) {
            return { data: null, error: result.error };
        }
        setTemplates(result.data);

        return { data: buildListDto(result.data), error: null };
    }

    function loadIntoForm(id: string) {
        const template = templates.find((t) => t.id === id);
        if (!template) {
            return;
        }
        updateMethods.reset(mapToFormValues(template));
    }

    function handleOpenView(id: string) {
        setSelectedId(id);
        loadIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_VALUES);
    }

    function handleOpenUpdate(id: string) {
        setSelectedId(id);
        loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleSwitchToEdit() {
        setIsViewOpen(false);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_VALUES);
    }

    async function handleCreate(values: EvaluationTemplateForm) {
        const result = await createEvaluationTemplate(values);
        if (!result.error) {
            createMethods.reset(DEFAULT_VALUES);
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    async function handleUpdate(values: EvaluationTemplateForm) {
        if (!selectedId) {
            return;
        }
        const result = await updateEvaluationTemplate(selectedId, values);
        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
        }
    }

    async function handleDeleteRow(id: string) {
        return deleteEvaluationTemplate(id);
    }

    const columnDefs = useMemo<ColDef<EvaluationTemplateRow>[]>(function() {
        return [
            {
                field: 'sequence',
                flex: 1,
                headerName: 'Order',
                maxWidth: 100,
                sortable: false
            },
            {
                field: 'title',
                flex: 3,
                headerName: 'Section',
                sortable: false
            },
            {
                flex: 3,
                headerName: 'Programs',
                sortable: false,
                valueGetter: (params) => formatPrograms(params.data?.program_ids ?? [], programOptions)
            },
            {
                flex: 1,
                headerName: 'Questions',
                sortable: false,
                valueGetter: (params) => params.data?.questions?.length ?? 0
            },
            {
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: EvaluationTemplateRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.is_active
                                ? 'Active'
                                : 'Inactive'}
                            variant={params.data.is_active
                                ? 'success'
                                : 'error'}
                        />
                    </div>
                )
            }
        ];
    }, [programOptions]);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<EvaluationTemplateRow> {
            return {
                onEditClick: (row: EvaluationTemplateRow) => function() {
                    handleOpenUpdate(row.id);
                },
                menuOptions: (row: EvaluationTemplateRow): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => handleOpenView(row.id)
                    },
                    {
                        preset: 'edit',
                        onClick: () => handleOpenUpdate(row.id)
                    },
                    {
                        preset: 'delete',
                        onClick: () => onDelete(row.id)
                    }
                ]
            };
        };
    }, [templates]);

    return (
        <CommonTableCard<EvaluationTemplateRow>
            cardHeaderProps={{
                subheader: 'Build the ordered sections of the faculty evaluation students complete before viewing released grades.',
                title: 'Faculty Evaluations'
            }}
            createModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        title: 'Add Evaluation Section',
                        subheader: 'Define a section, its program scope, and its questions.'
                    }
                },
                formId: CREATE_FORM_ID,
                formContent: (
                    <EvaluationTemplateFormPanel
                        formId={CREATE_FORM_ID}
                        methods={createMethods}
                        onSubmit={handleCreate}
                    />
                ),
                open: isCreateOpen,
                onClose: function() {
                    createMethods.reset(DEFAULT_VALUES);
                    setIsCreateOpen(false);
                }
            }}
            dependencies={[refreshKey]}
            tableActionConfig={tableActionConfig}
            tableProps={{
                leadingColumnDefs: columnDefs
            }}
            uniqueIdKey="id"
            updateModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        title: 'Edit Evaluation Section',
                        subheader: 'Update this section, its program scope, and its questions.'
                    }
                },
                confirmText: 'Save',
                formId: UPDATE_FORM_ID,
                formContent: (
                    <EvaluationTemplateFormPanel
                        formId={UPDATE_FORM_ID}
                        methods={updateMethods}
                        onSubmit={handleUpdate}
                    />
                ),
                onConfirmClose: function() {
                    const current = updateMethods.getValues();
                    const snapshot = updateMethods.formState.defaultValues;
                    return JSON.stringify(current) === JSON.stringify(snapshot);
                },
                open: isUpdateOpen,
                onClose: handleCloseUpdate
            }}
            viewModalProps={{
                cardProps: {
                    cardHeaderProps: {
                        title: 'View Evaluation Section',
                        subheader: 'Viewing evaluation section details.'
                    }
                },
                confirmText: 'Edit',
                formContent: (
                    <EvaluationTemplateFormPanel
                        disabled
                        methods={updateMethods}
                        onSubmit={handleUpdate}
                    />
                ),
                formButtonsProps: {
                    confirmProps: {
                        onClick: handleSwitchToEdit
                    }
                },
                open: isViewOpen,
                onClose: handleCloseView
            }}
            onCreate={function() {
                createMethods.reset({
                    ...DEFAULT_VALUES,
                    sequence: String(templates.length + 1)
                });
                setIsCreateOpen(true);
            }}
            onDeleteRow={handleDeleteRow}
            onFetch={fetchTemplates}
            onRowClick={handleOpenView}
        />
    );
}