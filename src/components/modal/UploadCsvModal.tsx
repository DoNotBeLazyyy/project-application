import CommonButton from '@components/button/CommonButton';
import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import CommonModal from '@components/modal/CommonModal';
import CommonTable from '@components/table/CommonTable';
import {
    ArrowLineDownIcon, ArrowLineUpIcon, CheckCircleIcon, WarningCircleIcon, XCircleIcon
} from '@phosphor-icons/react';
import { BulkImportError, DetailedBulkImportResult } from '@type/bulk-import.type';
import {
    CsvParseResult,
    generateTemplateCsv,
    parseCsvWithColumns
} from '@utils/csv.util';
import { exportCsvFile } from '@utils/file.util';
import { UploadCsvModalProps } from '@type/table-card.type';
import { classMerge } from '@utils/css.util';
import { ColDef } from 'ag-grid-community';
import { useMemo, useRef, useState } from 'react';

type UploadStep = 'upload' | 'preview' | 'results';
type ParsedRow = Record<string, string>;



export default function UploadCsvModal({
    onBulkImport,
    onClose,
    onMapRow,
    onSuccess,
    open,
    templateColumns = [],
    templateDownloadFilename = 'import_template.csv',
    title = 'Upload via CSV'
}: UploadCsvModalProps) {
    const [step, setStep] = useState<UploadStep>('upload');
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
                cellClass: 'text-[var(--mui-palette-error-main)]',
                field: 'message',
                flex: 2,
                headerName: 'Reason',
                minWidth: 200,
                sortable: false
            }
        ];
    }, []);

    function handleClose() {
        if (isLoading) return;
        setStep('upload');
        setParsedRows([]);
        setResult(null);
        setParseError(null);
        setParseWarning(null);
        onClose();
    }

    function downloadTemplate() {
        const csvContent = generateTemplateCsv(templateColumns);
        exportCsvFile(templateDownloadFilename, csvContent);
    }

    function parseCsv(text: string): CsvParseResult {
        return parseCsvWithColumns(text, templateColumns || []);
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
            setParseError(`"${file.name}" could not be read. Please try again.`);
        };
        reader.onload = function(event) {
            const text = typeof event.target?.result === 'string'
                ? event.target.result
                : '';
            const { missingHeaders, missingValues, rows, unknownHeaders } = parseCsv(text);

            if (missingHeaders.length) {
                setParseError(`These required columns are missing: ${missingHeaders.join(', ')}. Download the template to ensure valid format.`);
                return;
            }

            if (missingValues.length) {
                const shown = missingValues.slice(0, 5).join('; ');
                const more = missingValues.length > 5
                    ? ` and ${missingValues.length - 5} more`
                    : '';
                setParseError(`These required cells are blank: ${shown}${more}. Fill them in and upload the file again.`);
                return;
            }

            if (!rows.length) {
                setParseError('The CSV file has no data rows.');
                return;
            }

            if (unknownHeaders.length) {
                setParseWarning(`These extra columns were ignored: ${unknownHeaders.join(', ')}.`);
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
            const payload = onMapRow
                ? parsedRows.map(onMapRow)
                : parsedRows;
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
                {/* PROMINENT IN-MODAL TEMPLATE DOWNLOAD CALLOUT BANNER */}
                {templateColumns.length > 0 && (
                    <div className="bg-(--mui-palette-brand-50) border border-(--mui-palette-brand-200) flex flex-wrap gap-3 items-center justify-between p-3.5 rounded-xl">
                        <div className="min-w-0">
                            <span className="block font-bold text-(--mui-palette-brand-900) text-xs">
                                Need the exact CSV template?
                            </span>
                            <span className="text-(--mui-palette-brand-700) text-[11px]">
                                Download our pre-formatted template with required columns.
                            </span>
                        </div>
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<ArrowLineDownIcon size={16} weight="bold" />}
                            variant="contained"
                            onClick={downloadTemplate}
                        >
                            Download Template (.csv)
                        </CommonButton>
                    </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                    className="border-(--mui-palette-divider) border-2 border-dashed cursor-pointer flex flex-col gap-2 hover:bg-(--mui-palette-action-hover) hover:border-(--mui-palette-primary-main) items-center justify-center p-8 rounded-xl transition-colors"
                    onClick={function() {
                        fileInputRef.current?.click();
                    }}
                >
                    <ArrowLineUpIcon
                        className="text-(--mui-palette-grey-400)"
                        size={36}
                        weight="bold"
                    />
                    <p className="font-bold text-(--mui-palette-text-primary) text-sm">
                        Click to select or drag & drop CSV file
                    </p>
                    <p className="text-(--mui-palette-text-secondary) text-xs">
                        Maximum file size: 10MB • Format: UTF-8 .csv
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
                        <span className="text-xs">{parseError}</span>
                    </div>
                )}
            </div>
        );
    }

    function renderPreviewStep() {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                        {parsedRows.length} record{parsedRows.length !== 1
                            ? 's'
                            : ''} ready for validation
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
                <div className="h-64">
                    <CommonTable<ParsedRow>
                        leadingColumnDefs={previewColumnDefs}
                        rowData={parsedRows}
                    />
                </div>
                <div className="flex justify-end">
                    <CommonButton
                        disabled={isLoading}
                        loading={isLoading}
                        size="small"
                        variant="contained"
                        onClick={handleConfirmImport}
                    >
                        {isLoading
                            ? 'Processing & Validating...'
                            : `Confirm & Process (${parsedRows.length} records)`}
                    </CommonButton>
                </div>
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
                    )}
                >
                    {hasErrors
                        ? <WarningCircleIcon className="shrink-0 text-(--mui-palette-warning-main)" size={20} weight="bold" />
                        : <CheckCircleIcon className="shrink-0 text-(--mui-palette-success-main)" size={20} weight="bold" />
                    }
                    <div className="flex flex-col gap-1">
                        <p className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {result?.provisioned_count} record{result?.provisioned_count !== 1
                                ? 's'
                                : ''} imported successfully
                        </p>
                        {hasErrors && (
                            <p className="text-(--mui-palette-text-secondary) text-xs">
                                {(result?.structuredErrors?.length ?? result?.errors.length ?? 0)} record{((result?.structuredErrors?.length ?? result?.errors.length ?? 0)) !== 1
                                    ? 's'
                                    : ''} failed validation
                            </p>
                        )}
                    </div>
                </div>

                {hasStructuredErrors && (
                    <div className="flex flex-col gap-2">
                        <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Failed Records
                        </p>
                        <div className="h-48">
                            <CommonTable<BulkImportError>
                                leadingColumnDefs={errorColumnDefs}
                                rowData={result?.structuredErrors ?? []}
                            />
                        </div>
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

    const stepTitles: Record<UploadStep, string> = {
        preview: `${title} — Preview & Validate`,
        results: `${title} — Results`,
        upload: title
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
            <div className="max-w-full sm:w-3xl w-full">
                {step === 'upload' && renderUploadStep()}
                {step === 'preview' && renderPreviewStep()}
                {step === 'results' && renderResultsStep()}
            </div>
        </CommonModal>
    );
}