import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonTextarea from '@components/textarea/CommonTextarea';
import DiscussionThreadView from '@pages/shared/discussion/DiscussionThreadView';
import { CheckCircleIcon, ChatCircleTextIcon, PlusIcon, PushPinIcon } from '@phosphor-icons/react';
import { createThread, listSectionThreads } from '@services/discussion.service';
import { DiscussionThreadRow } from '@type/discussion.type';
import { formatDate } from '@utils/date.util';
import { ChangeEvent, useEffect, useState } from 'react';

interface SectionDiscussionPanelProps {
    sectionId: string;
}

export default function SectionDiscussionPanel({ sectionId }: SectionDiscussionPanelProps) {
    const [threads, setThreads] = useState<DiscussionThreadRow[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');

    async function loadThreads() {
        const result = await listSectionThreads(sectionId, 1, 50, '', []);

        if (result.data) {
            setThreads(result.data.content);
        }
    }

    useEffect(function() {
        loadThreads();
    }, [sectionId]);

    async function handleCreate() {
        if (!title.trim() || !body.trim()) {
            return;
        }

        const result = await createThread(sectionId, title.trim(), body.trim());

        if (!result.error) {
            setTitle('');
            setBody('');
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
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
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
                <div className="flex flex-col gap-3 rounded-lg border border-(--mui-palette-divider) p-4">
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
                        value={body}
                        onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                            setBody(e.target.value);
                        }}
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
                            disabled={!title.trim() || !body.trim()}
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