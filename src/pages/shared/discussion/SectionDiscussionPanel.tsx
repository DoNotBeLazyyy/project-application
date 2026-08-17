import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonTextarea from '@components/textarea/CommonTextarea';
import DiscussionAttachmentPicker from '@pages/shared/discussion/DiscussionAttachmentPicker';
import DiscussionThreadView from '@pages/shared/discussion/DiscussionThreadView';
import { CheckCircleIcon, ChatCircleTextIcon, PlusIcon, PushPinIcon } from '@phosphor-icons/react';
import { createThread, listSectionThreads, uploadDiscussionFile } from '@services/discussion.service';
import { useToastStore } from '@stores/toast.store';
import { DiscussionAttachmentPayload, DiscussionThreadRow } from '@type/discussion.type';
import { formatDate } from '@utils/date.util';
import { extractClipboardFiles } from '@utils/file.util';
import { ChangeEvent, ClipboardEvent, useEffect, useState } from 'react';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const COMPOSE_TEXTAREA_SX = {
    '& .common_textarea_html_input': {
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        resize: 'none'
    }
};

interface SectionDiscussionPanelProps {
    sectionId: string;
}

export default function SectionDiscussionPanel({ sectionId }: SectionDiscussionPanelProps) {
    const [threads, setThreads] = useState<DiscussionThreadRow[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const showToast = useToastStore((s) => s.showToast);

    async function loadThreads() {
        const result = await listSectionThreads(sectionId, 1, 50, '', []);

        if (result.data) {
            setThreads(result.data.content);
        }
    }

    useEffect(function() {
        loadThreads();
    }, [sectionId]);

    function handleAddFiles(added: File[]) {
        const accepted = added.filter(function(file) {
            if (file.size > MAX_ATTACHMENT_BYTES) {
                showToast(`${file.name} is larger than 25 MB and was skipped.`, 'warning');

                return false;
            }

            return true;
        });

        if (accepted.length > 0) {
            setFiles(function(prev) {
                return [...prev, ...accepted];
            });
        }
    }

    function handleRemoveFile(index: number) {
        setFiles(function(prev) {
            return prev.filter(function(_file, i) {
                return i !== index;
            });
        });
    }

    function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
        const pasted = extractClipboardFiles(event.clipboardData);

        if (pasted.length === 0) {
            return;
        }

        event.preventDefault();
        handleAddFiles(pasted);
    }

    async function handleCreate() {
        if (!title.trim() || !body.trim() || isUploading) {
            return;
        }

        setIsUploading(true);

        const uploaded: DiscussionAttachmentPayload[] = [];

        for (const file of files) {
            const upload = await uploadDiscussionFile(sectionId, file);

            if (upload.error || !upload.data) {
                setIsUploading(false);
                showToast(`Failed to upload ${file.name}.`, 'error');

                return;
            }

            uploaded.push(upload.data);
        }

        const result = await createThread(sectionId, title.trim(), body.trim(), uploaded);

        setIsUploading(false);

        if (!result.error) {
            setTitle('');
            setBody('');
            setFiles([]);
            setIsComposing(false);
            await loadThreads();
        }
    }

    if (selectedThreadId) {
        return (
            <DiscussionThreadView
                threadId={selectedThreadId}
                onBack={function() {
                    setSelectedThreadId(null);
                    loadThreads();
                }}
                onDeleted={function() {
                    setSelectedThreadId(null);
                    loadThreads();
                }}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between shrink-0">
                <span className="font-medium text-(--mui-palette-text-secondary) text-sm">
                    {threads.length} Discussion{threads.length === 1
                        ? ''
                        : 's'}
                </span>
                <CommonButton
                    size="small"
                    startIcon={<PlusIcon size={16} weight="bold" />}
                    variant="contained"
                    onClick={function() {
                        setIsComposing((prev) => !prev);
                    }}
                >
                    New Discussion
                </CommonButton>
            </div>
            {isComposing && (
                <div className="flex flex-col gap-3 rounded-lg border border-(--mui-palette-divider) p-4 shrink-0">
                    <CommonInput
                        fullWidth
                        placeholder="Discussion title"
                        size="small"
                        value={title}
                        onChange={function(e: ChangeEvent<HTMLInputElement>) {
                            setTitle(e.target.value);
                        }}
                    />
                    <CommonTextarea
                        maxLength={2000}
                        placeholder="What would you like to ask or share?"
                        sx={COMPOSE_TEXTAREA_SX}
                        value={body}
                        onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                            setBody(e.target.value);
                        }}
                        onPaste={handlePaste}
                    />
                    <DiscussionAttachmentPicker
                        files={files}
                        isDisabled={isUploading}
                        onAdd={handleAddFiles}
                        onRemove={handleRemoveFile}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={function() {
                                setIsComposing(false);
                            }}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={!title.trim() || !body.trim() || isUploading}
                            size="small"
                            variant="contained"
                            onClick={handleCreate}
                        >
                            Post
                        </CommonButton>
                    </div>
                </div>
            )}
            {threads.length === 0 && !isComposing && (
                <div className="flex flex-col gap-2 items-center py-10">
                    <ChatCircleTextIcon
                        className="text-(--mui-palette-text-disabled)"
                        size={32}
                    />
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        No discussions yet. Start the first one.
                    </p>
                </div>
            )}
            <div className="flex flex-col gap-2">
                {threads.map(function(thread) {
                    return (
                        <button
                            className="flex flex-col gap-1 rounded-lg border border-(--mui-palette-divider) p-4 text-left hover:bg-black/5"
                            key={thread.id}
                            type="button"
                            onClick={function() {
                                setSelectedThreadId(thread.id);
                            }}
                        >
                            <div className="flex gap-2 items-center">
                                {thread.is_pinned && (
                                    <PushPinIcon
                                        className="text-(--mui-palette-primary-main)"
                                        size={14}
                                        weight="fill"
                                    />
                                )}
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {thread.title}
                                </span>
                                {thread.is_resolved && (
                                    <CheckCircleIcon
                                        className="text-(--mui-palette-success-main)"
                                        size={14}
                                        weight="fill"
                                    />
                                )}
                            </div>
                            <span className="line-clamp-1 text-(--mui-palette-text-secondary) text-xs">
                                {thread.body}
                            </span>
                            <span className="text-(--mui-palette-text-disabled) text-xs">
                                {thread.author_name} · {formatDate(new Date(thread.created_at))} · {thread.reply_count} repl{thread.reply_count === 1
                                    ? 'y'
                                    : 'ies'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}