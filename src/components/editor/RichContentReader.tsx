import '@components/editor/toastui-editor-theme.css';
import Editor, { EditorInstance } from '@toast-ui/editor';
import { useEffect, useRef } from 'react';

export interface RichContentReaderProps {
    content?: string | null;
    className?: string;
    emptyPlaceholder?: string;
}

/**
 * RichContentReader
 *
 * Renders rich text/markdown content using TOAST UI's native document viewer.
 * Provides a clean reading experience with natural document flow, zero edit chrome,
 * responsive typography, and full dark/light theme support.
 */
export default function RichContentReader({
    className = 'w-full max-w-full text-(--mui-palette-text-primary) text-sm sm:text-base leading-relaxed break-words',
    content,
    emptyPlaceholder = 'No content provided.'
}: RichContentReaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<EditorInstance | null>(null);

    useEffect(function() {
        if (!containerRef.current) {
            return;
        }

        // Clean up previous instance
        if (instanceRef.current) {
            try {
                instanceRef.current.destroy();
            } catch {
                // Ignore destroy errors during unmount/remount
            }
            instanceRef.current = null;
        }

        const trimmed = (content ?? '').trim();

        if (!trimmed) {
            containerRef.current.innerHTML = `
                <div class="italic text-slate-400 dark:text-zinc-500 text-sm py-2">
                    ${emptyPlaceholder}
                </div>
            `;
            return;
        }

        containerRef.current.innerHTML = '';

        try {
            const viewer = Editor.factory({
                el: containerRef.current,
                initialValue: trimmed,
                viewer: true
            });
            instanceRef.current = viewer;
        } catch {
            // Fallback to simple text display if editor factory encounters unexpected format
            if (containerRef.current) {
                containerRef.current.textContent = trimmed;
            }
        }

        return function() {
            if (instanceRef.current) {
                try {
                    instanceRef.current.destroy();
                } catch {
                    // Ignore destroy errors during unmount
                }
                instanceRef.current = null;
            }
        };
    }, [content, emptyPlaceholder]);

    return <div className={className} ref={containerRef} />;
}
