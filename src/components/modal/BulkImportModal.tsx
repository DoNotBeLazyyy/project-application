import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonTable from '@components/table/CommonTable';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, CheckCircleIcon, WarningCircleIcon, XCircleIcon
} from '@phosphor-icons/react';
import { BulkImportError, CsvTemplateColumn, DetailedBulkImportResult } from '@type/bulk-import.type';
import { classMerge } from '@utils/css.util';
import { ColDef } from 'ag-grid-community';
import { useMemo, useRef, useState } from 'react';

type BulkImportStep = 'upload' | 'preview' | 'results';

type ParsedRow = Record<string, string>;

interface CsvParseResult {
    rows: ParsedRow[];
    missingHeaders: string[];
    unknownHeaders: string[];
}

function splitCsvRecords(text: string): string[][] {
    const records: string[][] = [];
    let currentRecord: string[] = [];
    let currentValue = '';
    let isQuoted = false;
    let index = 0;

    function pushValue() {
        currentRecord.push(currentValue);
        currentValue = '';
    }

    function pushRecord() {
        pushValue();
        records.push(currentRecord);
        currentRecord = [];
    }

    while (index < text.length) {
        const char = text[index];

        if (isQuoted) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    currentValue += '"';
                    index += 2;
                    continue;
                }
                isQuoted = false;
                index += 1;
                continue;
            }
            currentValue += char;
            index += 1;
            continue;
        }

        if (char === '"' && currentValue.trim() === '') {
            currentValue = '';
            isQuoted = true;
            index += 1;
            continue;
        }

        if (char === ',') {
            pushValue();
            index += 1;
            continue;
        }

        if (char === '\n') {
            pushRecord();
            index += 1;
            continue;
        }

        if (char === '\r') {
            index += 1;
            continue;
        }

        currentValue += char;
        index += 1;
    }

    if (currentValue !== '' || currentRecord.length) {
        pushRecord();
    }

    return records.map((record) => record.map((value) => value.trim()))
        .filter((record) => record.some((value) => value !== ''));
}

function escapeCsvValue(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
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
    onClose,
    onBulkImport,
    onImport,
    onMapRow,
    onSuccess
}: BulkImportModalProps<TPayload>) {
    const activeColumns = useMemo(() => (templateColumns || columns || []).filter(Boolean), [templateColumns, columns]);
    const modalTitle = title || (entityName ? `Bulk Import ${entityName}` : 'Bulk Import');

    const [step, setStep] = useState<BulkImportStep>('upload');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [result, setResult] = useState<DetailedBulkImportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parseWarning, setParseWarning] = useState<string | null>(null);
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
        setStep('upload');
        setParsedRows([]);
        setResult(null);
        setParseError(null);
        setParseWarning(null);
        onClose();
    }

    function downloadTemplate() {
        const headers = (activeColumns || []).map((col) => escapeCsvValue(col.label || ''));
        const hints = (activeColumns || []).map((col) => escapeCsvValue(col.hint ?? ''));
        const csvContent = [headers.join(','), hints.join(',')].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function parseCsv(text: string): CsvParseResult {
        const records = splitCsvRecords(text);
        if (!records.length) {
            return { missingHeaders: [], rows: [], unknownHeaders: [] };
        }

        const headers = records[0];
        const matchedColumns = headers.map((header) => (activeColumns || []).find(
            (col) => col.label.trim()
                .toLowerCase() === header.toLowerCase()
        ) ?? null);

        const unknownHeaders = headers.filter((header, index) => header !== '' && !matchedColumns[index]);
        const missingHeaders = (activeColumns || []).filter(
            (col) => !matchedColumns.some((matched) => matched?.key === col.key)
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

    function isHintRecord(values: string[], matchedColumns: (CsvTemplateColumn | null)[]): boolean {
        const comparableHints = matchedColumns.filter((col, index) => col?.hint && values[index] !== undefined);
        if (!comparableHints.length) return false;

        return matchedColumns.every((col, index) => {
            if (!col?.hint) return true;
            return (values[index] ?? '') === col.hint.trim();
        });
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

        return (
            <div className="flex flex-col gap-4">
                <div
                    className={classMerge(
                        'flex gap-3 items-start p-4 rounded-lg',
                        hasErrors
                            ? 'bg-(--mui-palette-warning-light)'
                            : 'bg-(--mui-palette-success-light)'
                    )}>
                    {hasErrors
                        ? <WarningCircleIcon className="shrink-0 text-(--mui-palette-warning-main)" size={20} weight="bold" />
                        : <CheckCircleIcon className="shrink-0 text-(--mui-palette-success-main)" size={20} weight="bold" />
                    }
                    <div className="flex flex-col gap-1">
                        <p className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {result?.provisioned_count} row{result?.provisioned_count !== 1
                                ? 's'
                                : ''} imported successfully
                        </p>
                        {hasErrors && (
                            <p className="text-(--mui-palette-text-secondary) text-xs">
                                {(result?.structuredErrors?.length ?? result?.errors.length ?? 0)} row{(result?.structuredErrors?.length ?? result?.errors.length ?? 0) !== 1
                                    ? 's'
                                    : ''} failed
                            </p>
                        )}
                    </div>
                </div>

                {hasStructuredErrors && (
                    <div className="flex flex-col gap-2">
                        <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Failed Rows
                        </p>
                        <div className="h-48">
                            <CommonTable<BulkImportError>
                                leadingColumnDefs={errorColumnDefs}
                                rowData={result?.structuredErrors ?? []}
                            />
                        </div>
                    </div>
                )}

                {hasStringErrors && !hasStructuredErrors && (
                    <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                        {result?.errors.map((error, index) => (
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

                <div className="flex gap-2 justify-end">
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
                    title: stepTitles[step]
                }
            }}
            open={open}
            onClose={step === 'results'
                ? handleClose
                : onClose}
        >
            <div className="max-w-full sm:w-3xl w-full">
                {step === 'upload' && renderUploadStep()}
                {step === 'preview' && renderPreviewStep()}
                {step === 'results' && renderResultsStep()}
            </div>
        </CommonModal>
    );
}