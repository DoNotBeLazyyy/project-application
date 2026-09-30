import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import EvaluationTemplateGridCard from '@pages/admin/evaluation-management/EvaluationTemplateGridCard';
import EvaluationWizardModal from '@pages/admin/evaluation-management/EvaluationWizardModal';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import {
    bulkCreateEvaluationTemplates,
    createEvaluationTemplate,
    deleteEvaluationTemplate,
    getEvaluationTemplateById,
    listEvaluationTemplates,
    updateEvaluationTemplate
} from '@services/evaluation.service';
import { useToastStore } from '@stores/toast.store';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { EvaluationQuestionForm, EvaluationTemplateBulkRow, EvaluationTemplateForm, EvaluationTemplateListRow } from '@type/evaluation.type';
import { SortStringDto } from '@type/http.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'sequence', label: 'Order' },
    { field: 'title', label: 'Section' }
];

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'section_title', label: 'Section Title', hint: 'e.g. Teaching Effectiveness' },
    { key: 'section_sequence', label: 'Section Sequence', hint: 'e.g. 1 (optional)' },
    { key: 'section_description', label: 'Section Description', hint: 'optional' },
    { key: 'is_active', label: 'Active', hint: 'TRUE or FALSE (optional, defaults TRUE)' },
    { key: 'program_codes', label: 'Program Codes', hint: 'e.g. BSCS|BSIT (optional, blank = all)' },
    { key: 'question_text', label: 'Question Text', hint: 'e.g. Explains concepts clearly' },
    { key: 'question_type', label: 'Question Type', hint: 'Rating, Multiple Choice, or Open Ended' },
    { key: 'is_required', label: 'Required', hint: 'TRUE or FALSE (optional, defaults TRUE)' },
    { key: 'min_rating', label: 'Min Rating', hint: 'e.g. 1 (Rating only)' },
    { key: 'max_rating', label: 'Max Rating', hint: 'e.g. 5 (Rating only)' }
];

const DEFAULT_QUESTIONS: EvaluationQuestionForm[] = [
    {
        question_text: '',
        question_type: 'Rating',
        is_required: true,
        min_rating: '1',
        max_rating: '5'
    }
];

const DEFAULT_FORM_VALUES: EvaluationTemplateForm = {
    title: '',
    description: '',
    is_active: true,
    sequence: '1',
    target_mode: 'INCLUDE',
    suggestion_placeholder: '',
    program_ids: [],
    questions: DEFAULT_QUESTIONS
};

function formatPrograms(programIds: string[]): string {
    if (!programIds.length) {
        return 'All programs';
    }

    return 'Selected only';
}

export default function EvaluationManagement() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { programOptions } = useProgramOptions();

    const createMethods = useForm<EvaluationTemplateForm>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    const updateMethods = useForm<EvaluationTemplateForm>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function fetchTemplates(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listEvaluationTemplates(page, size, search, sort);
    }

    async function handleDeleteRow(id: string) {
        return deleteEvaluationTemplate(id);
    }

    async function loadIntoForm(id: string) {
        const res = await getEvaluationTemplateById(id);
        if (res.data) {
            updateMethods.reset({
                id: res.data.id,
                title: res.data.title,
                description: res.data.description ?? '',
                is_active: res.data.is_active,
                sequence: String(res.data.sequence ?? 1),
                target_mode: res.data.target_mode ?? 'INCLUDE',
                suggestion_placeholder: res.data.suggestion_placeholder ?? '',
                program_ids: res.data.program_ids ?? [],
                questions: res.data.questions.length
                    ? res.data.questions.map(function(q) {
                        return {
                            id: q.id,
                            question_text: q.question_text,
                            question_type: q.question_type,
                            is_required: q.is_required,
                            min_rating: String(q.min_rating ?? 1),
                            max_rating: String(q.max_rating ?? 5)
                        };
                    })
                    : DEFAULT_QUESTIONS
            });
        }
    }

    function handleOpenCreate() {
        createMethods.reset(DEFAULT_FORM_VALUES);
        setIsCreateOpen(true);
    }

    function handleCloseCreate() {
        setIsCreateOpen(false);
        createMethods.reset(DEFAULT_FORM_VALUES);
    }

    async function handleOpenView(id: string) {
        setSelectedId(id);
        await loadIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    async function handleOpenUpdate(id: string) {
        setSelectedId(id);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string) {
        setIsViewOpen(false);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    async function handleCreateSubmit(values: EvaluationTemplateForm) {
        setIsSaving(true);
        try {
            const res = await createEvaluationTemplate(values);
            if (!res.error) {
                useToastStore.getState().showToast('Evaluation section created successfully.', 'success');
                handleCloseCreate();
                triggerRefresh();
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function handleUpdateSubmit(values: EvaluationTemplateForm) {
        if (!selectedId) return;
        setIsSaving(true);
        try {
            const res = await updateEvaluationTemplate(selectedId, values);
            if (!res.error) {
                useToastStore.getState().showToast('Evaluation section updated successfully.', 'success');
                handleCloseUpdate();
                triggerRefresh();
            }
        } finally {
            setIsSaving(false);
        }
    }

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'sequence',
                flex: 1,
                headerName: 'Order',
                maxWidth: 100,
                mobileCard: 'meta',
                sortable: true
            },
            {
                field: 'title',
                flex: 3,
                headerName: 'Section',
                mobileCard: 'title',
                sortable: true
            },
            {
                colId: 'programs',
                flex: 3,
                headerName: 'Programs',
                sortable: false,
                valueGetter: (params) => formatPrograms(
                    params.data?.program_ids ?? []
                )
            },
            {
                field: 'question_count',
                flex: 1,
                headerName: 'Questions',
                sortable: false
            },
            {
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: EvaluationTemplateListRow }) => (
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
        return function(onDelete: (id: string) => void): TableActionConfig<EvaluationTemplateListRow> {
            return {
                onEditClick: (row: EvaluationTemplateListRow) => function() {
                    handleOpenUpdate(row.id);
                },
                menuOptions: (row: EvaluationTemplateListRow): MenuOption[] => [
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
    }, []);

    return (
        <>
            <CommonTableCard<EvaluationTemplateListRow>
                cardHeaderProps={{
                    subheader: 'Build the ordered sections of the faculty evaluation students complete before viewing released grades.',
                    title: 'Faculty Evaluations'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.evaluationTemplates
                    },
                    tableButtonsProps: {
                        createButtonProps: {
                            onClick: handleOpenCreate
                        },
                        uploadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        }
                    }
                }}
                dependencies={[refreshKey]}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <EvaluationTemplateGridCard
                            isSelected={isSelected}
                            programsLabel={formatPrograms(
                                item.program_ids ?? []
                            )}
                            row={item}
                            onEdit={function(id) {
                                handleOpenUpdate(id);
                            }}
                            onRequestDelete={onRequestDeleteRow}
                            onToggleSelect={onToggleSelect}
                            onView={function(id) {
                                handleOpenView(id);
                            }}
                        />
                    );
                }}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDeleteRow={handleDeleteRow}
                onFetch={fetchTemplates}
                onRowClick={function(id: string) {
                    handleOpenView(id);
                }}
            />

            <BulkImportModal<EvaluationTemplateBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Evaluation Sections"
                onBulkImport={bulkCreateEvaluationTemplates}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    section_title: row.section_title,
                    section_sequence: row.section_sequence,
                    section_description: row.section_description,
                    is_active: row.is_active,
                    target_mode: row.target_mode,
                    suggestion_placeholder: row.suggestion_placeholder,
                    program_codes: row.program_codes,
                    question_text: row.question_text,
                    question_type: row.question_type,
                    is_required: row.is_required,
                    min_rating: row.min_rating,
                    max_rating: row.max_rating
                })}
                onSuccess={triggerRefresh}
            />

            {/* Create Evaluation Section Wizard Modal */}
            <EvaluationWizardModal
                isSaving={isSaving}
                methods={createMethods}
                open={isCreateOpen}
                onClose={handleCloseCreate}
                onSubmit={handleCreateSubmit}
            />

            {/* Edit Evaluation Section Wizard Modal */}
            <EvaluationWizardModal
                isSaving={isSaving}
                methods={updateMethods}
                open={isUpdateOpen}
                templateId={selectedId}
                onClose={handleCloseUpdate}
                onSubmit={handleUpdateSubmit}
            />

            {/* View Evaluation Section Wizard Modal */}
            <EvaluationWizardModal
                readOnly
                methods={updateMethods}
                open={isViewOpen}
                templateId={selectedId}
                onClose={handleCloseView}
                onSubmit={function() {}}
                onSwitchToEdit={function() {
                    if (selectedId) {
                        handleSwitchToEdit(selectedId);
                    }
                }}
            />
        </>
    );
}