import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonInput from '@components/input/CommonInput';
import { Fab, IconButton } from '@mui/material';
import { PaperPlaneRightIcon, SparkleIcon, XIcon } from '@phosphor-icons/react';
import { askAssistant } from '@services/assistant.service';
import { useAppStore } from '@stores/app.store';
import { AssistantMessage, AssistantTurn } from '@type/assistant.type';
import { generateId } from '@utils/uuid.util';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SECTION_PATH_PATTERN = /\/sections\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const ROLE_SUBTITLE: Record<string, string> = {
    Admin: 'How-to guide',
    Dean: 'How-to guide',
    Faculty: 'Teaching insight and how-to guide',
    Registrar: 'How-to guide',
    Student: 'Academic advising and how-to guide'
};

const ROLE_GREETING: Record<string, string> = {
    Admin: 'Ask me how anything in the Administrator panel works.',
    Dean: 'Ask me how anything in the Dean panel works.',
    Faculty: 'Ask me about your sections, who needs attention, or how anything here works.',
    Registrar: 'Ask me how anything in the Registrar panel works.',
    Student: 'Ask me about your grades, your honors trajectory, or how anything here works.'
};

const SUGGESTION_VISIBLE_COUNT = 3;

const ROLE_SUGGESTIONS: Record<string, string[]> = {
    Admin: [
        'How do I invite a new user?',
        'How do I open a new term?',
        'What do academic thresholds change?',
        'How do I resend an invitation?',
        'How do I give a user a second role?',
        'How do I upload users in bulk?',
        'How do I close the current term?',
        'What happens when I archive a school year?'
    ],
    Dean: [
        'How do I assign an instructor to a section?',
        'How do I add a prerequisite to a course?',
        'Where do I check for schedule conflicts?',
        'How do I build a curriculum map?',
        'How do I create a new program level?',
        'How do I open a new section?',
        'How do I change a course type?',
        'Where do I review faculty loading?'
    ],
    Faculty: [
        'Which of my students are at risk right now?',
        'What are my classes struggling with the most?',
        'How do I grade with a rubric?',
        'How do I set up my grading components?',
        'How do I build an assessment?',
        'How do I take attendance for today?',
        'How do I post an announcement to my section?',
        'How do I release grades to my students?'
    ],
    Registrar: [
        'How do I release grades for a section?',
        'How do I enrol a student in bulk?',
        'Where do I print a transcript?',
        'How do I clear a student for enrolment?',
        'How do I fix a wrong final grade?',
        'How do I move a student to another section?',
        'Where do I see the grade audit log?',
        'How do I set clearance requirements?'
    ],
    Student: [
        'Am I on track for Latin honors?',
        'Which subject is hurting my GWA the most?',
        'What should I focus on for the rest of this term?',
        'What assessments are due soon?',
        'How is my attendance so far?',
        'Where do I check my clearance status?',
        'How is my final grade computed?',
        'Where do I see my class schedule?'
    ]
};

function createMessageId(): string {
    return generateId();
}

function extractSectionId(pathname: string): string | null {
    const match = SECTION_PATH_PATTERN.exec(pathname);

    return match
        ? match[1]
        : null;
}

interface SuggestionListProps {
    items: string[];
    onSelect: (suggestion: string) => void;
}

function SuggestionList({ items, onSelect }: SuggestionListProps) {
    return (
        <div className="flex flex-col gap-2">
            {items.map((suggestion) => (
                <button
                    className="border border-(--mui-palette-divider) hover:bg-black/5 px-3 py-2 rounded-lg text-(--mui-palette-text-primary) text-left text-xs"
                    key={suggestion}
                    type="button"
                    onClick={function() {
                        onSelect(suggestion);
                    }}
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
}

export default function AiAssistant() {
    const { pathname } = useLocation();
    const activeRole = useAppStore((s) => s.activeRole);
    const [isOpen, setIsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [draft, setDraft] = useState('');
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const role = activeRole ?? '';
    const allRoleSuggestions = ROLE_SUGGESTIONS[role] ?? [];
    const unusedSuggestions = allRoleSuggestions.filter((item) => !usedSuggestions.includes(item));
    const suggestions = unusedSuggestions.length > 0
        ? unusedSuggestions.slice(0, SUGGESTION_VISIBLE_COUNT)
        : allRoleSuggestions.slice(0, SUGGESTION_VISIBLE_COUNT);
    const lastMessage = messages[messages.length - 1];
    const canShowFollowUps = !isSending
        && suggestions.length > 0
        && (!lastMessage || (lastMessage.role === 'assistant' && !lastMessage.isFailed));

    useEffect(function() {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isSending, isOpen]);

    useEffect(function() {
        setUsedSuggestions([]);
    }, [activeRole]);

    function handleSuggestionSelect(suggestion: string) {
        setUsedSuggestions((prev) => prev.includes(suggestion)
            ? prev
            : [...prev, suggestion]);
        handleSend(suggestion);
    }

    async function handleSend(text: string) {
        const trimmed = text.trim();

        if (trimmed.length === 0 || isSending || !activeRole) {
            return;
        }

        const history: AssistantTurn[] = messages
            .filter((item) => !item.isFailed)
            .map((item) => ({ role: item.role, content: item.content }));

        setMessages((prev) => [...prev, { id: createMessageId(), role: 'user', content: trimmed }]);
        setDraft('');
        setIsSending(true);

        const result = await askAssistant(
            trimmed,
            history,
            activeRole,
            extractSectionId(pathname),
            null
        );

        setIsSending(false);

        const reply = result.data?.reply;

        if (!reply) {
            setMessages((prev) => [...prev, {
                id: createMessageId(),
                role: 'assistant',
                content: result.error?.message ?? 'The assistant could not answer that. Please try again.',
                isFailed: true
            }]);
            return;
        }

        setMessages((prev) => [...prev, { id: createMessageId(), role: 'assistant', content: reply }]);
    }

    function handleComposerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();
        handleSend(draft);
    }

    function handleToggle() {
        setIsOpen((prev) => !prev);
    }

    if (!activeRole) {
        return null;
    }

    return (
        <>
            {!isOpen && (
                <Fab
                    aria-label="Open AI Assistant"
                    color="primary"
                    data-testid="ai-assistant-fab"
                    size="medium"
                    sx={{ bottom: 24, position: 'fixed', right: 24, zIndex: 1200 }}
                    onClick={handleToggle}
                >
                    <SparkleIcon size={22} weight="fill" />
                </Fab>
            )}
            {isOpen && (
                <CommonCard
                    data-testid="ai-assistant-card"
                    sx={{
                        bottom: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: 'min(600px, calc(100vh - 48px))',
                        position: 'fixed',
                        right: 24,
                        width: 'min(400px, calc(100vw - 32px))',
                        zIndex: 1200
                    }}
                    variant="elevation"
                >
                    <div className="flex items-start justify-between px-4 py-3">
                        <div className="flex flex-col">
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                AU-JAS Assistant
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {ROLE_SUBTITLE[role] ?? 'How-to guide'}
                            </span>
                        </div>
                        <IconButton
                            size="small"
                            onClick={handleToggle}
                        >
                            <XIcon size={16} />
                        </IconButton>
                    </div>
                    <div
                        className="flex flex-1 flex-col gap-3 overflow-y-auto pb-3 px-4"
                        ref={scrollRef}
                    >
                        {messages.length === 0 && (
                            <>
                                <p className="text-(--mui-palette-text-secondary) text-sm">
                                    {ROLE_GREETING[role] ?? 'Ask me how anything here works.'}
                                </p>
                                <SuggestionList
                                    items={suggestions}
                                    onSelect={handleSuggestionSelect}
                                />
                            </>
                        )}
                        {messages.map((item) => (
                            <div
                                className={
                                    item.role === 'user'
                                        ? 'flex justify-end'
                                        : 'flex justify-start'
                                }
                                key={item.id}
                            >
                                <p
                                    className={
                                        item.role === 'user'
                                            ? 'bg-(--mui-palette-primary-main) max-w-[85%] px-3 py-2 rounded-xl text-sm text-white whitespace-pre-wrap'
                                            : item.isFailed
                                                ? 'bg-(--mui-palette-error-main)/10 max-w-[85%] px-3 py-2 rounded-xl text-(--mui-palette-error-main) text-sm whitespace-pre-wrap'
                                                : 'bg-black/5 max-w-[85%] px-3 py-2 rounded-xl text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap'
                                    }
                                >
                                    {item.content}
                                </p>
                            </div>
                        ))}
                        {isSending && (
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Thinking...
                            </span>
                        )}
                        {canShowFollowUps && (
                            <div className="flex flex-col gap-2 pt-1">
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    You can also ask
                                </span>
                                <SuggestionList
                                    items={suggestions}
                                    onSelect={handleSuggestionSelect}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 items-end px-4 py-3">
                        <CommonInput
                            fullWidth
                            hasClearButton={false}
                            maxRows={4}
                            multiline
                            placeholder="Ask a question..."
                            size="small"
                            value={draft}
                            variant="outlined"
                            onChange={function(event) {
                                setDraft(event.target.value);
                            }}
                            onKeyDown={handleComposerKeyDown}
                        />
                        <CommonButton
                            disabled={isSending || draft.trim().length === 0}
                            size="small"
                            startIcon={<PaperPlaneRightIcon size={16} />}
                            variant="contained"
                            onClick={function() {
                                handleSend(draft);
                            }}
                        />
                    </div>
                </CommonCard>
            )}
        </>
    );
}