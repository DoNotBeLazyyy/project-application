import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { bulkCreateEvaluationTemplates, deleteEvaluationTemplate, listEvaluationTemplates } from '@services/evaluation.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { EvaluationTemplateBulkRow, EvaluationTemplateListRow } from '@type/evaluation.type';
import { SortStringDto } from '@type/http.type';
import { ColDef } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_PATH = '/admin/evaluations';

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

export default function EvaluationManagement() {
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    const { programOptions } = useProgramOptions();

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

    const columnDefs = useMemo<ColDef<EvaluationTemplateListRow>[]>(function() {
        return [
            {
                field: 'sequence',
                flex: 1,
                headerName: 'Order',
                maxWidth: 100,
                sortable: true
            },
            {
                field: 'title',
                flex: 3,
                headerName: 'Section',
                sortable: true
            },
            {
                flex: 3,
                headerName: 'Programs',
                sortable: false,
                valueGetter: (params) => formatPrograms(params.data?.program_ids ?? [], programOptions)
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
                    navigate(`${BASE_PATH}/${row.id}?edit=1`);
                },
                menuOptions: (row: EvaluationTemplateListRow): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => navigate(`${BASE_PATH}/${row.id}`)
                    },
                    {
                        preset: 'edit',
                        onClick: () => navigate(`${BASE_PATH}/${row.id}?edit=1`)
                    },
                    {
                        preset: 'delete',
                        onClick: () => onDelete(row.id)
                    }
                ]
            };
        };
    }, [navigate]);

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
                            onClick: function() {
                                navigate(`${BASE_PATH}/new`);
                            }
                        },
                        downloadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        },
                        uploadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        }
                    }
                }}
                dependencies={[refreshKey]}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDeleteRow={handleDeleteRow}
                onFetch={fetchTemplates}
                onRowClick={function(id: string) {
                    navigate(`${BASE_PATH}/${id}`);
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
                    program_codes: row.program_codes,
                    question_text: row.question_text,
                    question_type: row.question_type,
                    is_required: row.is_required,
                    min_rating: row.min_rating,
                    max_rating: row.max_rating
                })}
                onSuccess={triggerRefresh}
            />
        </>
    );
}