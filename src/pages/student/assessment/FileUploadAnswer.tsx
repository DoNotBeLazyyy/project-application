import CommonButton from '@components/button/CommonButton';
import { ArrowLineUpIcon, FileIcon, TrashIcon } from '@phosphor-icons/react';
import { saveStudentAnswerFiles, uploadSubmissionFile } from '@services/student-portal.service';
import { getFileUrl } from '@services/storage.service';
import { StudentQuestion, SubmissionFileAttachment } from '@type/student-portal.type';
import { useRef, useState } from 'react';

interface FileUploadAnswerProps {
    question: StudentQuestion;
    submissionId: string;
}

function isTypeAllowed(fileName: string, allowed: string[] | null): boolean {
    if (!allowed || allowed.length === 0) return true;
    const lower = fileName.toLowerCase();
    return allowed.some(function(ext) {
        const normalized = ext.toLowerCase()
            .replace(/^\./, '');
        return lower.endsWith(`.${normalized}`);
    });
}

export default function FileUploadAnswer({
    question,
    submissionId
}: FileUploadAnswerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<SubmissionFileAttachment[]>(
        question.saved_answer?.file_attachments ?? []
    );
    const [isBusy, setIsBusy] = useState(false);
    const [errorText, setErrorText] = useState('');

    const maxCount = question.max_file_count ?? 1;
    const maxBytes = question.max_file_size_mb
        ? question.max_file_size_mb * 1024 * 1024
        : null;

    async function persist(next: SubmissionFileAttachment[]) {
        setFiles(next);
        await saveStudentAnswerFiles(submissionId, question.id, next);
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files ?? []);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (selected.length === 0) return;

        setErrorText('');

        if (files.length + selected.length > maxCount) {
            setErrorText(`You may upload at most ${maxCount} file${maxCount === 1
                ? ''
                : 's'}.`);
            return;
        }

        for (const file of selected) {
            if (!isTypeAllowed(file.name, question.allowed_file_types)) {
                setErrorText(`${file.name} is not an allowed file type.`);
                return;
            }

            if (maxBytes && file.size > maxBytes) {
                setErrorText(`${file.name} exceeds the ${question.max_file_size_mb}MB limit.`);
                return;
            }
        }

        setIsBusy(true);

        try {
            const uploaded: SubmissionFileAttachment[] = [];

            for (const file of selected) {
                const result = await uploadSubmissionFile(submissionId, question.id, file);
                if (result.error || !result.data) {
                    setErrorText(result.error?.message ?? `Failed to upload ${file.name}.`);
                    return;
                }

                uploaded.push(result.data);
            }

            await persist([...files, ...uploaded]);
        }
        finally {
            setIsBusy(false);
        }
    }

    async function handleRemove(path: string) {
        setIsBusy(true);

        try {
            await persist(files.filter((f) => f.path !== path));
        }
        finally {
            setIsBusy(false);
        }
    }

    async function handleView(path: string) {
        const result = await getFileUrl('submissions', path);
        if (result.data) window.open(result.data.url, '_blank', 'noopener');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 items-center">
                <CommonButton
                    disabled={isBusy || files.length >= maxCount}
                    size="small"
                    startIcon={<ArrowLineUpIcon size={14} weight="bold" />}
                    variant="outlined"
                    onClick={function() {
                        fileInputRef.current?.click();
                    }}
                >
                    {isBusy
                        ? 'Working...'
                        : 'Upload File'}
                </CommonButton>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    {question.allowed_file_types && question.allowed_file_types.length > 0
                        ? `Allowed: ${question.allowed_file_types.join(', ')}`
                        : 'Any file type'}
                    {question.max_file_size_mb && ` · Max ${question.max_file_size_mb}MB`}
                    {` · Up to ${maxCount} file${maxCount === 1
                        ? ''
                        : 's'}`}
                </span>
            </div>
            <input
                className="hidden"
                multiple={maxCount > 1}
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
            />
            {errorText && (
                <span className="text-(--mui-palette-error-main) text-xs">
                    {errorText}
                </span>
            )}
            {files.length > 0 && (
                <div className="flex flex-col gap-1">
                    {files.map((file) => (
                        <div
                            className="border border-(--mui-palette-divider) flex gap-2 items-center p-2 rounded-lg"
                            key={file.path}
                        >
                            <FileIcon
                                className="shrink-0 text-(--mui-palette-text-secondary)"
                                size={16}
                                weight="bold"
                            />
                            <button
                                className="flex-1 min-w-0 text-(--mui-palette-primary-main) text-left text-sm truncate underline"
                                type="button"
                                onClick={function() {
                                    handleView(file.path);
                                }}
                            >
                                {file.name}
                            </button>
                            <CommonButton
                                color="error"
                                disabled={isBusy}
                                size="small"
                                onClick={function() {
                                    handleRemove(file.path);
                                }}
                            >
                                <TrashIcon size={13} weight="bold" />
                            </CommonButton>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}