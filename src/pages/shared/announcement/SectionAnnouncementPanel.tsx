import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { MegaphoneIcon, PlusIcon, PushPinIcon, TrashIcon } from '@phosphor-icons/react';
import { createAnnouncement, deleteAnnouncement, listSectionAnnouncements } from '@services/announcement.service';
import { AnnouncementFeedRow } from '@type/announcement.type';
import { formatShortDate } from '@utils/date.util';
import { ChangeEvent, useEffect, useState } from 'react';

interface SectionAnnouncementPanelProps {
    canManage?: boolean;
    sectionId: string;
}

export default function SectionAnnouncementPanel({ canManage = true, sectionId }: SectionAnnouncementPanelProps) {
    const [announcements, setAnnouncements] = useState<AnnouncementFeedRow[]>([]);
    const [isComposing, setIsComposing] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    async function loadAnnouncements() {
        const result = await listSectionAnnouncements(sectionId);
        if (result.data) {
            setAnnouncements(result.data.content);
        }
    }

    useEffect(function() {
        if (sectionId) {
            loadAnnouncements();
        }
    }, [sectionId]);

    function resetComposer() {
        setIsComposing(false);
        setTitle('');
        setContent('');
        setIsPinned(false);
    }

    async function handlePostAnnouncement() {
        if (!title.trim() || !content.trim()) return;

        const result = await createAnnouncement({
            attachments: [],
            content: content.trim(),
            expires_at: '',
            is_pinned: isPinned,
            section_ids: [sectionId],
            target_audience: 'Section',
            title: title.trim()
        });

        if (!result.error) {
            resetComposer();
            await loadAnnouncements();
        }
    }

    async function handleConfirmDelete() {
        if (!pendingDeleteId) return;

        const result = await deleteAnnouncement(pendingDeleteId);
        setPendingDeleteId(null);

        if (!result.error) {
            await loadAnnouncements();
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-secondary) text-sm">
                    {announcements.length} Announcement{announcements.length === 1
                        ? ''
                        : 's'}
                </span>
                {canManage && !isComposing && (
                    <CommonButton
                        size="small"
                        startIcon={<PlusIcon size={16} weight="bold" />}
                        variant="contained"
                        onClick={function() {
                            setIsComposing(true);
                        }}
                    >
                        Post Announcement
                    </CommonButton>
                )}
            </div>

            {canManage && isComposing && (
                <div className="flex flex-col gap-3 rounded-lg border border-(--mui-palette-divider) p-4">
                    <h3 className="font-semibold text-(--mui-palette-text-primary) text-sm">
                        New Section Announcement
                    </h3>
                    <CommonInput
                        fullWidth
                        placeholder="Announcement Title"
                        size="small"
                        value={title}
                        onChange={function(e: ChangeEvent<HTMLInputElement>) {
                            setTitle(e.target.value);
                        }}
                    />
                    <CommonTextarea
                        maxLength={2000}
                        placeholder="Write your announcement details here..."
                        value={content}
                        onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                            setContent(e.target.value);
                        }}
                    />
                    <div className="flex items-center justify-between">
                        <label className="flex gap-2 items-center text-(--mui-palette-text-secondary) text-xs cursor-pointer">
                            <input
                                checked={isPinned}
                                type="checkbox"
                                onChange={function(e: ChangeEvent<HTMLInputElement>) {
                                    setIsPinned(e.target.checked);
                                }}
                            />
                            Pin to top of section
                        </label>
                        <div className="flex gap-2">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={resetComposer}
                            >
                                Cancel
                            </CommonButton>
                            <CommonButton
                                disabled={!title.trim() || !content.trim()}
                                size="small"
                                variant="contained"
                                onClick={handlePostAnnouncement}
                            >
                                Post Now
                            </CommonButton>
                        </div>
                    </div>
                </div>
            )}

            {announcements.length === 0 && !isComposing && (
                <div className="flex flex-col gap-2 items-center py-10">
                    <MegaphoneIcon
                        className="text-(--mui-palette-text-disabled)"
                        size={32}
                    />
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        No announcements posted for this section yet.
                    </p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {announcements.map(function(item) {
                    return (
                        <div
                            className="bg-(--mui-palette-background-paper) flex flex-col gap-2 rounded-lg border border-(--mui-palette-divider) p-4 shadow-2xs"
                            key={item.id}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2 items-center">
                                        {item.is_pinned && (
                                            <PushPinIcon
                                                className="text-amber-500 shrink-0"
                                                size={16}
                                                weight="fill"
                                            />
                                        )}
                                        <h4 className="font-semibold text-(--mui-palette-text-primary) text-base m-0">
                                            {item.title}
                                        </h4>
                                    </div>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        Posted by {item.author_name} · {formatShortDate(item.created_at)}
                                    </span>
                                </div>
                                {canManage && (
                                    <button
                                        className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-error-main)"
                                        title="Delete announcement"
                                        type="button"
                                        onClick={function() {
                                            setPendingDeleteId(item.id);
                                        }}
                                    >
                                        <TrashIcon size={16} />
                                    </button>
                                )}
                            </div>
                            <p className="m-0 text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                                {item.content}
                            </p>
                        </div>
                    );
                })}
            </div>

            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setPendingDeleteId(null);
                        }
                    },
                    confirmProps: {
                        onClick: handleConfirmDelete
                    }
                }}
                mainContent={{
                    title: 'Delete this announcement?'
                }}
                open={pendingDeleteId !== null}
                subContent={{ title: 'This will remove the announcement for all enrolled students in this section.' }}
                onClose={function() {
                    setPendingDeleteId(null);
                }}
            />
        </div>
    );
}