import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonTable from '@components/table/CommonTable';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, CheckCircleIcon, WarningCircleIcon, XCircleIcon
} from '@phosphor-icons/react';
import { BulkImportResult, CsvTemplateColumn } from '@type/bulk-import.type';
import { classMerge } from '@utils/css.util';
import { ColDef } from 'ag-grid-community';
import { useMemo, useRef, useState } from 'react';

type BulkImportStep = 'upload' | 'preview' | 'results';

type ParsedRow = Record<string, string>;

export interface BulkImportError {
    row: number;
    code: string;
    message: string;
}

export interface DetailedBulkImportResult extends BulkImportResult {
    structuredErrors?: BulkImportError[];
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
        onClose();
    }

    function downloadTemplate() {
        const headers = templateColumns.map((col) => col.label);
        const hints = templateColumns.map((col) => col.hint ?? '');
        const csvContent = [headers.join(','), hints.join(',')].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function parseCsv(text: string): ParsedRow[] {
        const lines = text.trim()
            .split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',')
            .map((h) => h.trim());
        return lines.slice(1)
            .map((line) => {
                const values = line.split(',')
                    .map((v) => v.trim());
                const row: ParsedRow = {};
                headers.forEach((header, index) => {
                    const matchedCol = templateColumns.find((col) => col.label === header);
                    if (matchedCol) {
                        row[matchedCol.key] = values[index] ?? '';
                    }
                });
                return row;
            });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        setParseError(null);

        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setParseError('Only CSV files are accepted.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target?.result as string;
            const rows = parseCsv(text);

            if (!rows.length) {
                setParseError('The CSV file appears to be empty or has no data rows.');
                return;
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
            <div className="w-3xl">
                {step === 'upload' && renderUploadStep()}
                {step === 'preview' && renderPreviewStep()}
                {step === 'results' && renderResultsStep()}
            </div>
        </CommonModal>
    );
}