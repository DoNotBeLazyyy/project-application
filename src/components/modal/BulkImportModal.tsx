import CommonButton from '@components/button/CommonButton';
import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import CommonModal from '@components/modal/CommonModal';
import CommonTable from '@components/table/CommonTable';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, CheckCircleIcon, WarningCircleIcon, XCircleIcon
} from '@phosphor-icons/react';
import { BulkImportError, CsvTemplateColumn, DetailedBulkImportResult } from '@type/bulk-import.type';
import {
    CsvParseResult,
    escapeCsvValue,
    generateTemplateCsv,
    isHintRecord,
    matchColumnHeader,
    splitCsvRecords
} from '@utils/csv.util';
import { exportCsvFile } from '@utils/file.util';
import { classMerge } from '@utils/css.util';
import { ColDef } from 'ag-grid-community';
import { useMemo, useRef, useState } from 'react';

type BulkImportStep = 'upload' | 'preview' | 'results';

type ParsedRow = Record<string, string>;



export function getTargetEntityName(title?: string, entityName?: string): string {
    if (entityName?.trim()) return entityName.trim();
    if (title) {
        let cleaned = title.trim();
        cleaned = cleaned.replace(/\s*—\s*(preview|results)\s*$/i, '');
        cleaned = cleaned.replace(/\s*\(csv\)\s*$/i, '');
        cleaned = cleaned.replace(/^(bulk\s+)?(import|enroll|upload)\s+/i, '');
        cleaned = cleaned.trim();
        if (cleaned) return cleaned;
    }
    return 'Records';
}

function DefaultPreviewCard({
    columns = [],
    index,
    row
}: {
    columns?: CsvTemplateColumn[];
    index: number;
    row: ParsedRow;
}) {
    const codeVal = row.code || row.section_code || row.course_code || row.department_code || row.term_label || '';
    const titleVal = row.title || row.label || row.name || '';
    const primaryHeading = codeVal && titleVal ? `${codeVal} — ${titleVal}` : codeVal || titleVal || `Row #${index + 1}`;

    const longFieldKeys = new Set(['description', 'prerequisites', 'notes', 'comments', 'details']);
    const safeCols = (columns || []).filter(Boolean);
    const shortColumns = safeCols.filter((col) => col?.key && !longFieldKeys.has(col.key.toLowerCase()));
    const longColumns = safeCols.filter((col) => col?.key && longFieldKeys.has(col.key.toLowerCase()));

    return (
        <div className="p-4 rounded-xl border border-(--mui-palette-divider) bg-white dark:bg-zinc-800/80 shadow-xs flex flex-col gap-3 transition-all hover:border-brand-300 dark:hover:border-brand-700">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--mui-palette-divider) pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">
                        #{index + 1}
                    </span>
                    <h4 className="font-semibold text-sm text-(--mui-palette-text-primary) truncate">
                        {primaryHeading}
                    </h4>
                </div>

                {row.is_active !== undefined && row.is_active !== '' && (
                    <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            String(row.is_active).toLowerCase() === 'true' || row.is_active === '1'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-slate-300'
                        }`}
                    >
                        {String(row.is_active).toLowerCase() === 'true' || row.is_active === '1' ? 'Active' : 'Inactive'}
                    </span>
                )}
            </div>

            {/* Short fields grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                {shortColumns.map((col) => {
                    const val = row[col.key];
                    if (col.key === 'is_active') return null;

                    return (
                        <div key={col.key} className="flex flex-col gap-0.5">
                            <span className="text-(--mui-palette-text-secondary) font-medium text-[11px] uppercase tracking-wide">
                                {col.label}
                            </span>
                            <span className="text-(--mui-palette-text-primary) font-semibold break-words">
                                {val && val.trim() !== '' ? val : '—'}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Long fields (full width cards inside entry) */}
            {longColumns.length > 0 && (
                <div className="flex flex-col gap-2 pt-1 border-t border-(--mui-palette-divider)">
                    {longColumns.map((col) => {
                        const val = row[col.key];
                        return (
                            <div key={col.key} className="flex flex-col gap-1 text-xs">
                                <span className="text-(--mui-palette-text-secondary) font-medium text-[11px] uppercase tracking-wide">
                                    {col.label}
                                </span>
                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-(--mui-palette-divider) text-(--mui-palette-text-primary) font-medium text-xs whitespace-pre-wrap leading-relaxed">
                                    {val && val.trim() !== '' ? val : <span className="text-(--mui-palette-text-secondary) italic">None</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface BulkImportModalProps<TPayload> {
    open: boolean;
    previewLayout?: 'table' | 'card';
    renderPreviewCard?: (
        row: ParsedRow,
        index: number,
        columns: CsvTemplateColumn[]
    ) => React.ReactNode;
    templateColumns?: CsvTemplateColumn[];
    columns?: CsvTemplateColumn[];
    title?: string;
    entityName?: string;
    templateDownloadFilename?: string;
    onClose: () => void;
    onBulkImport?: (rows: TPayload[]) => Promise<DetailedBulkImportResult | { provisioned_count: number; errors: string[] }>;
    onImport?: (rows: TPayload[]) => Promise<DetailedBulkImportResult | { provisioned_count: number; errors: string[] }>;
    onMapRow?: (row: ParsedRow) => TPayload;
    onSuccess?: () => void;
}

export default function BulkImportModal<TPayload>({
    open,
    previewLayout = 'card',
    renderPreviewCard,
    templateColumns,
    columns,
    title,
    entityName,
    templateDownloadFilename,
    onClose,
    onBulkImport,
    onImport,
    onMapRow,
    onSuccess
}: BulkImportModalProps<TPayload>) {
    const activeColumns = useMemo(() => (templateColumns || columns || []).filter(Boolean), [templateColumns, columns]);
    const modalTitle = title || (entityName ? `Bulk Import ${entityName}` : 'Bulk Import');
    const targetEntityName = getTargetEntityName(modalTitle, entityName);
    const entityPlural = targetEntityName.toLowerCase().endsWith('s')
        ? targetEntityName.toLowerCase()
        : `${targetEntityName.toLowerCase()} records`;

    const [step, setStep] = useState<BulkImportStep>('upload');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [mappedRows, setMappedRows] = useState<any[]>([]);
    const [result, setResult] = useState<DetailedBulkImportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parseWarning, setParseWarning] = useState<string | null>(null);
    const [activeResultTab, setActiveResultTab] = useState<'created' | 'updated' | 'blocked' | 'conflicts'>('created');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewColumnDefs = useMemo<ColDef<ParsedRow>[]>(function() {
        return (activeColumns || []).map((col) => ({
            field: col.key,
            flex: 1,
            headerName: col.label,
            minWidth: 120,
            sortable: false,
            valueFormatter: (params) => params.value || '—'
        }));
    }, [activeColumns]);

    const errorColumnDefs = useMemo<ColDef<BulkImportError>[]>(function() {
        return [
            {
                field: 'row',
                flex: 0,
                headerName: 'Row',
                maxWidth: 72,
                minWidth: 72,
                sortable: false
            },
            {
                field: 'code',
                flex: 1,
                headerName: 'Code',
                minWidth: 160,
                sortable: false,
                valueFormatter: (params) => params.value || '—'
            },
            {
                field: 'message',
                flex: 2,
                headerName: 'Reason',
                minWidth: 200,
                sortable: false,
                cellClass: 'text-[var(--mui-palette-error-main)]'
            }
        ];
    }, []);

    function handleClose() {
        if (isLoading) return;
        setStep('upload');
        setParsedRows([]);
        setMappedRows([]);
        setResult(null);
        setParseError(null);
        setParseWarning(null);
        setActiveResultTab('created');
        onClose();
    }

    const resolvedDownloadFilename = useMemo(() => {
        if (templateDownloadFilename) {
            return templateDownloadFilename.endsWith('.csv') ? templateDownloadFilename : `${templateDownloadFilename}.csv`;
        }
        const cleanEntity = targetEntityName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return `${cleanEntity || 'import'}_template.csv`;
    }, [templateDownloadFilename, targetEntityName]);

    function downloadTemplate() {
        const csvContent = generateTemplateCsv(activeColumns);
        exportCsvFile(resolvedDownloadFilename, csvContent);
    }

    function parseCsv(text: string): CsvParseResult {
        const records = splitCsvRecords(text);
        if (!records.length) {
            return { missingHeaders: [], rows: [], unknownHeaders: [] };
        }

        const headers = records[0];
        const matchedColumns = headers.map((header) => {
            return (activeColumns || []).find((col) => matchColumnHeader(header, col)) ?? null;
        });

        const unknownHeaders = headers.filter((header, index) => header !== '' && !matchedColumns[index]);
        const missingHeaders = (activeColumns || []).filter(
            (col) => col.required !== false && !matchedColumns.some((matched) => matched?.key === col.key)
        )
            .map((col) => col.label);

        const dataRecords = records.slice(1)
            .filter((record, index) => !(index === 0 && isHintRecord(record, matchedColumns)));

        const rows = dataRecords.map((values) => {
            const row: ParsedRow = {};
            matchedColumns.forEach((matchedCol, index) => {
                if (matchedCol) {
                    row[matchedCol.key] = values[index] ?? '';
                }
            });
            return row;
        });

        return { missingHeaders, rows, unknownHeaders };
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        setParseError(null);
        setParseWarning(null);

        if (!file) return;

        if (!file.name.toLowerCase()
            .endsWith('.csv')) {
            setParseError('Only CSV files are accepted.');
            return;
        }

        const reader = new FileReader();
        reader.onerror = function() {
            setParseError(`"${file.name}" could not be read. Check that the file is not open in another program, then try again.`);
        };
        reader.onabort = function() {
            setParseError(`Reading "${file.name}" was interrupted. Select the file again.`);
        };
        reader.onload = function(event) {
            const text = typeof event.target?.result === 'string'
                ? event.target.result
                : '';
            const { missingHeaders, rows, unknownHeaders } = parseCsv(text);

            if (missingHeaders.length) {
                setParseError(`These required columns are missing from the file header: ${missingHeaders.join(', ')}. Download the CSV template and keep its header row unchanged.`);
                return;
            }

            if (!rows.length) {
                setParseError('The CSV file appears to be empty or has no data rows.');
                return;
            }

            if (unknownHeaders.length) {
                setParseWarning(`These columns were not recognized and will be ignored: ${unknownHeaders.join(', ')}.`);
            }

            setParsedRows(rows);
            setStep('preview');
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    async function handleConfirmImport() {
        setIsLoading(true);
        try {
            const mapper = onMapRow || ((row: ParsedRow) => row as unknown as TPayload);
            const payload = parsedRows.map(mapper);
            setMappedRows(payload);
            const importFn = onBulkImport || onImport;
            if (!importFn) return;

            const rawResult = await importFn(payload);
            const importResult: DetailedBulkImportResult = 'structuredErrors' in rawResult
                ? rawResult
                : {
                    provisioned_count: rawResult.provisioned_count,
                    errors: rawResult.errors,
                    structuredErrors: rawResult.errors.map((err, i) => ({
                        row: i + 1,
                        code: 'IMPORT_ERROR',
                        message: err
                    }))
                };

            setResult(importResult);
            const created = importResult.created_count ?? importResult.provisioned_count ?? 0;
            const blocked = importResult.structuredErrors?.length ?? importResult.errors?.length ?? 0;
            if (created === 0 && blocked > 0) {
                setActiveResultTab('blocked');
            } else {
                setActiveResultTab('created');
            }
            setStep('results');
            if (!importResult.errors?.length && !importResult.structuredErrors?.length) {
                onSuccess?.();
            }
        }
        finally {
            setIsLoading(false);
        }
    }

    function handleReupload() {
        setParsedRows([]);
        setParseError(null);
        setParseWarning(null);
        setActiveResultTab('created');
        setStep('upload');
    }

    function renderUploadStep() {
        return (
            <div className="flex flex-col gap-4">
                <div
                    className="border-(--mui-palette-divider) border-2 border-dashed cursor-pointer flex flex-col gap-2 hover:bg-(--mui-palette-action-hover) hover:border-(--mui-palette-primary-main) items-center justify-center p-10 rounded-lg transition-colors"
                    onClick={function() {
                        fileInputRef.current?.click();
                    }}
                >
                    <ArrowLineUpIcon
                        className="text-(--mui-palette-grey-400)"
                        size={40}
                        weight="bold"
                    />
                    <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Click to select a CSV file
                    </p>
                    <p className="text-(--mui-palette-text-secondary) text-xs">
                        Only .csv files are accepted
                    </p>
                    <input
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                    />
                </div>
                {parseError && (
                    <div className="flex gap-2 items-center text-(--mui-palette-error-main)">
                        <XCircleIcon size={16} weight="bold" />
                        <span className="text-sm">{parseError}</span>
                    </div>
                )}
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLineDownIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={downloadTemplate}
                >
                    Download CSV Template
                </CommonButton>
            </div>
        );
    }

    function renderPreviewStep() {
        const isCardLayout = previewLayout === 'card' || Boolean(renderPreviewCard);

        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                        {parsedRows.length} row{parsedRows.length !== 1
                            ? 's'
                            : ''} detected
                    </p>
                    <CommonButton
                        color="inherit"
                        disabled={isLoading}
                        size="small"
                        variant="outlined"
                        onClick={handleReupload}
                    >
                        Re-upload
                    </CommonButton>
                </div>
                {parseWarning && (
                    <div className="flex gap-2 items-start text-(--mui-palette-warning-main)">
                        <WarningCircleIcon className="mt-0.5 shrink-0" size={16} weight="bold" />
                        <span className="text-xs">{parseWarning}</span>
                    </div>
                )}
                {isCardLayout ? (
                    <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-3">
                        {parsedRows.map((row, index) => {
                            if (renderPreviewCard) {
                                return renderPreviewCard(row, index, activeColumns);
                            }
                            return (
                                <DefaultPreviewCard
                                    columns={activeColumns}
                                    index={index}
                                    key={index}
                                    row={row}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-64">
                        <CommonTable<ParsedRow>
                            leadingColumnDefs={previewColumnDefs}
                            rowData={parsedRows}
                        />
                    </div>
                )}
                <CommonButton
                    disabled={isLoading}
                    loading={isLoading}
                    size="small"
                    variant="contained"
                    onClick={handleConfirmImport}
                >
                    {isLoading
                        ? 'Importing...'
                        : `Confirm Import (${parsedRows.length} rows)`}
                </CommonButton>
            </div>
        );
    }

    function renderResultsStep() {
        const hasStructuredErrors = result?.structuredErrors && result.structuredErrors.length > 0;
        const hasStringErrors = result?.errors && result.errors.length > 0;
        const hasErrors = hasStructuredErrors || hasStringErrors;
        const hasConflicts = result?.structuredConflicts && result.structuredConflicts.length > 0;

        const createdCount = result?.created_count ?? result?.provisioned_count ?? 0;
        const updatedCount = result?.updated_count ?? 0;
        const blockedCount = result?.structuredErrors?.length ?? result?.errors?.length ?? 0;
        const createdRows = result?.createdRows ?? [];
        const updatedRows = result?.updatedRows ?? [];
        const conflictRows = result?.conflictRows ?? [];
        const structuredErrors = result?.structuredErrors ?? [];
        const structuredConflicts = result?.structuredConflicts ?? [];
        const conflictsCount = conflictRows.length > 0 ? conflictRows.length : (result?.structuredConflicts?.length ?? result?.conflicts_count ?? 0);

        // Derive display items for newly created records
        const failedRowNumbers = new Set(structuredErrors.map((e) => e.row));
        const createdDisplayItems = createdRows.length > 0
            ? createdRows.map((item) => ({
                row: item.row,
                code: item.section_code,
                course_code: item.course_code,
                room: item.room,
                faculty_email: item.faculty_email,
                heading: item.section_code || `Row #${item.row}`,
                details: [] as { label: string; value: string }[],
                isSection: Boolean(item.section_code)
            }))
            : createdCount > 0 && parsedRows.length > 0
                ? parsedRows
                    .map((row, idx) => ({ row: idx + 1, data: row }))
                    .filter((item) => !failedRowNumbers.has(item.row))
                    .map(({ row, data }) => {
                        const mapped = mappedRows[row - 1] as Record<string, any> | undefined;
                        const codeVal = mapped?.code || mapped?.section_code || data.code || data.section_code || data.course_code || data.department_code || data.term_label || data.email || '';
                        const titleVal = data.title || data.label || data.name || (data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : '');
                        const primaryHeading = codeVal && titleVal ? `${codeVal} — ${titleVal}` : codeVal || titleVal || `Row #${row}`;

                        const details: { label: string; value: string }[] = [];
                        for (const col of activeColumns) {
                            if (!col?.key) continue;
                            const val = data[col.key];
                            if (!val || !val.trim()) continue;
                            if (val === codeVal || val === titleVal) continue;
                            details.push({ label: col.label || col.key, value: val });
                            if (details.length >= 3) break;
                        }

                        return {
                            row,
                            code: codeVal,
                            course_code: undefined,
                            room: undefined,
                            faculty_email: undefined,
                            heading: primaryHeading,
                            details,
                            isSection: false
                        };
                    })
                : [];

        return (
            <div className="flex flex-col gap-4">
                {/* User-Friendly Interactive Summary Stats Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                        type="button"
                        className={classMerge(
                            'p-3.5 rounded-xl border flex flex-col gap-1 text-left transition-all cursor-pointer',
                            activeResultTab === 'created'
                                ? 'bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                                : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300'
                        )}
                        onClick={() => setActiveResultTab('created')}
                    >
                        <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
                            Created ({createdCount})
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                                {createdCount}
                            </span>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                new
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className={classMerge(
                            'p-3.5 rounded-xl border flex flex-col gap-1 text-left transition-all cursor-pointer',
                            activeResultTab === 'updated'
                                ? 'bg-blue-100/80 dark:bg-blue-950/80 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                                : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 hover:border-blue-300'
                        )}
                        onClick={() => setActiveResultTab('updated')}
                    >
                        <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 dark:text-blue-400">
                            Updated ({updatedCount})
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-blue-800 dark:text-blue-300">
                                {updatedCount}
                            </span>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                existing
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className={classMerge(
                            'p-3.5 rounded-xl border flex flex-col gap-1 text-left transition-all cursor-pointer',
                            activeResultTab === 'blocked'
                                ? 'bg-rose-100/80 dark:bg-rose-950/80 border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 hover:border-rose-300'
                        )}
                        onClick={() => setActiveResultTab('blocked')}
                    >
                        <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700 dark:text-rose-400">
                            Blocked / Failed ({blockedCount})
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-rose-800 dark:text-rose-300">
                                {blockedCount}
                            </span>
                            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                errors
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className={classMerge(
                            'p-3.5 rounded-xl border flex flex-col gap-1 text-left transition-all cursor-pointer',
                            activeResultTab === 'conflicts'
                                ? 'bg-amber-100/80 dark:bg-amber-950/80 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:border-amber-300'
                        )}
                        onClick={() => setActiveResultTab('conflicts')}
                    >
                        <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                            Conflicts ({conflictsCount})
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-amber-800 dark:text-amber-300">
                                {conflictsCount}
                            </span>
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                flagged
                            </span>
                        </div>
                    </button>
                </div>

                {/* Tab Content 1: Created Rows */}
                {activeResultTab === 'created' && (
                    <div className="flex flex-col gap-2 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                                <CheckCircleIcon size={18} weight="bold" />
                                <span>Newly Created {targetEntityName} ({createdCount})</span>
                            </div>
                        </div>
                        {createdCount === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">No new {entityPlural} were created.</p>
                        ) : createdDisplayItems.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                                {createdDisplayItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800/60 flex flex-col gap-1 text-xs"
                                    >
                                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px]">
                                                Row #{item.row}
                                            </span>
                                            {item.code && (
                                                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{item.code}</span>
                                            )}
                                        </div>
                                        {item.isSection ? (
                                            <>
                                                <div className="text-slate-600 dark:text-slate-300 flex justify-between gap-1 mt-0.5">
                                                    <span>Course: <strong>{item.course_code || '—'}</strong></span>
                                                    <span>Room: <strong>{item.room || '—'}</strong></span>
                                                </div>
                                                {item.faculty_email && (
                                                    <div className="text-[11px] text-slate-500 truncate">
                                                        Faculty: {item.faculty_email}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                                    {item.heading}
                                                </div>
                                                {item.details && item.details.length > 0 && (
                                                    <div className="text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px]">
                                                        {item.details.map((d, dIdx) => (
                                                            <span key={dIdx}>
                                                                <span className="font-medium text-slate-600 dark:text-slate-300">{d.label}:</span> {d.value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium py-2">
                                Successfully created {createdCount} {entityPlural}.
                            </p>
                        )}
                    </div>
                )}

                {/* Tab Content 2: Updated Rows */}
                {activeResultTab === 'updated' && (
                    <div className="flex flex-col gap-2 border border-blue-200 dark:border-blue-900 rounded-xl p-3.5 bg-blue-50/40 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm">
                                <ArrowLineUpIcon size={18} weight="bold" />
                                <span>Updated Existing {targetEntityName} ({updatedCount})</span>
                            </div>
                        </div>
                        {updatedCount === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">No existing {entityPlural} were updated.</p>
                        ) : updatedRows.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                                {updatedRows.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800/60 flex flex-col gap-1.5 text-xs shadow-xs"
                                    >
                                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-zinc-700/60 pb-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[11px]">
                                                Row #{item.row}
                                            </span>
                                            <span className="font-mono text-blue-700 dark:text-blue-300">{item.section_code || item.course_code || '—'}</span>
                                        </div>
                                        {item.course_code && (
                                            <div className="text-slate-600 dark:text-slate-300 flex justify-between gap-1">
                                                <span>Course: <strong>{item.course_code || '—'}</strong></span>
                                                {item.room && <span>Room: <strong>{item.room}</strong></span>}
                                            </div>
                                        )}
                                        {item.faculty_email && (
                                            <div className="text-[11px] text-slate-500 truncate">
                                                Faculty: {item.faculty_email}
                                            </div>
                                        )}
                                        {item.changes && item.changes.length > 0 ? (
                                            <div className="mt-1 flex flex-col gap-1 pt-1.5 border-t border-slate-100 dark:border-zinc-700/50">
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                                    Modified Fields:
                                                </span>
                                                {item.changes.map((change, cIdx) => (
                                                    <div key={cIdx} className="flex flex-wrap items-center gap-1 text-[11px] bg-slate-50 dark:bg-zinc-900/60 px-2 py-1 rounded border border-slate-200/60 dark:border-zinc-700/40">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{change.field}:</span>
                                                        <span className="line-through text-rose-500 font-medium px-1 bg-rose-50 dark:bg-rose-950/40 rounded">{change.previous}</span>
                                                        <span className="text-slate-400">→</span>
                                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold px-1 bg-emerald-50 dark:bg-emerald-950/40 rounded">{change.changed}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                                                Updated existing record
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium py-2">
                                Successfully updated {updatedCount} {entityPlural}.
                            </p>
                        )}
                    </div>
                )}

                {/* Tab Content 3: Blocked / Failed Rows */}
                {activeResultTab === 'blocked' && (
                    <div className="flex flex-col gap-2 border border-rose-200 dark:border-rose-900 rounded-xl p-3.5 bg-rose-50/40 dark:bg-rose-950/20">
                        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                            <XCircleIcon size={18} weight="bold" />
                            <span>Blocked / Failed Rows ({blockedCount})</span>
                        </div>
                        {blockedCount === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">No rows were blocked or failed.</p>
                        ) : structuredErrors.length > 0 ? (
                            <div className="h-48">
                                <CommonTable<BulkImportError>
                                    leadingColumnDefs={errorColumnDefs}
                                    rowData={structuredErrors}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                                {result?.errors?.map((error, index) => (
                                    <div
                                        className="flex gap-2 items-start text-(--mui-palette-error-main)"
                                        key={index}
                                    >
                                        <XCircleIcon className="mt-0.5 shrink-0" size={14} weight="bold" />
                                        <span className="text-xs">{error}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content 4: Conflicts */}
                {activeResultTab === 'conflicts' && (
                    <div className="flex flex-col gap-2 border border-amber-200 dark:border-amber-900 rounded-xl p-3.5 bg-amber-50/40 dark:bg-amber-950/20">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                            <WarningCircleIcon size={18} weight="bold" />
                            <span>Flagged Conflicts ({conflictsCount})</span>
                        </div>
                        {conflictsCount === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">No conflicts were detected.</p>
                        ) : conflictRows.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                                {conflictRows.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-800/80 flex flex-col gap-1.5 text-xs shadow-xs"
                                    >
                                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 border-b border-amber-100 dark:border-zinc-700/60 pb-1.5">
                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px]">
                                                Row #{item.row}
                                            </span>
                                            <span className="font-mono text-amber-800 dark:text-amber-300">{item.section_code || item.course_code || '—'}</span>
                                        </div>
                                        <div className="text-slate-600 dark:text-slate-300 flex justify-between gap-1">
                                            <span>Course: <strong>{item.course_code || '—'}</strong></span>
                                            <span>Room: <strong>{item.room || '—'}</strong></span>
                                        </div>
                                        {item.faculty_email && (
                                            <div className="text-[11px] text-slate-500 truncate">
                                                Faculty: <strong>{item.faculty_email}</strong>
                                            </div>
                                        )}
                                        {item.days && item.time && (
                                            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                                Schedule: {item.days} ({item.time})
                                            </div>
                                        )}
                                        <div className="mt-1 pt-1.5 border-t border-amber-100 dark:border-zinc-700/50 flex flex-col gap-0.5">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 dark:text-rose-400">
                                                Conflict:
                                            </span>
                                            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-1 rounded border border-rose-200/60 dark:border-rose-900/50">
                                                {item.conflict_with || item.message}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
                                {structuredConflicts.map((conf, idx) => (
                                    <div
                                        className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200"
                                        key={idx}
                                    >
                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold shrink-0">
                                            Row #{conf.row}
                                        </span>
                                        <span className="font-medium leading-relaxed">
                                            {conf.message}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-2 justify-end pt-2 border-t border-(--mui-palette-divider)">
                    {hasErrors && (
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={handleReupload}
                        >
                            Import Again
                        </CommonButton>
                    )}
                    <CommonButton
                        size="small"
                        variant="contained"
                        onClick={handleClose}
                    >
                        Done
                    </CommonButton>
                </div>
            </div>
        );
    }

    const stepTitles: Record<BulkImportStep, string> = {
        preview: `${modalTitle} — Preview`,
        results: `${modalTitle} — Results`,
        upload: modalTitle
    };

    return (
        <CommonModal
            cardProps={{
                cardHeaderProps: {
                    action: <ModalCloseIcon onClick={handleClose} />,
                    title: stepTitles[step]
                },
                defaultActionProps: {
                    onClick: handleClose
                }
            }}
            open={open}
            onClose={handleClose}
        >
            <div className="max-w-full sm:w-3xl w-full flex-1 flex flex-col min-h-0">
                {step === 'upload' && renderUploadStep()}
                {step === 'preview' && renderPreviewStep()}
                {step === 'results' && renderResultsStep()}
            </div>
        </CommonModal>
    );
}