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

interface BulkImportModalProps<TPayload> {
    open: boolean;
    templateColumns: CsvTemplateColumn[];
    title?: string;
    onClose: () => void;
    onBulkImport: (rows: TPayload[]) => Promise<DetailedBulkImportResult>;
    onMapRow: (row: ParsedRow) => TPayload;
    onSuccess?: () => void;
}

export default function BulkImportModal<TPayload>({
    open,
    templateColumns,
    title = 'Bulk Import',
    onClose,
    onBulkImport,
    onMapRow,
    onSuccess
}: BulkImportModalProps<TPayload>) {
    const [step, setStep] = useState<BulkImportStep>('upload');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [result, setResult] = useState<DetailedBulkImportResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parseWarning, setParseWarning] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewColumnDefs = useMemo<ColDef<ParsedRow>[]>(function() {
        return templateColumns.map((col) => ({
            field: col.key,
            flex: 1,
            headerName: col.label,
            minWidth: 120,
            sortable: false,
            valueFormatter: (params) => params.value || '—'
        }));
    }, [templateColumns]);

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
        const headers = templateColumns.map((col) => escapeCsvValue(col.label));
        const hints = templateColumns.map((col) => escapeCsvValue(col.hint ?? ''));
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
        const matchedColumns = headers.map((header) => templateColumns.find(
            (col) => col.label.trim()
                .toLowerCase() === header.toLowerCase()
        ) ?? null);

        const unknownHeaders = headers.filter((header, index) => header !== '' && !matchedColumns[index]);
        const missingHeaders = templateColumns.filter(
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
            const payload = parsedRows.map(onMapRow);
            const importResult = await onBulkImport(payload);
            setResult(importResult);
            setStep('results');
            if (!importResult.errors.length && !importResult.structuredErrors?.length) {
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
                <div className="h-64">
                    <CommonTable<ParsedRow>
                        leadingColumnDefs={previewColumnDefs}
                        rowData={parsedRows}
                    />
                </div>
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
        preview: `${title} — Preview`,
        results: `${title} — Results`,
        upload: title
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