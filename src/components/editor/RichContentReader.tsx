import '@components/editor/toastui-editor-theme.css';
import ImagePreviewModal, { ImagePreviewItem } from '@components/modal/ImagePreviewModal';
import Editor, { EditorInstance } from '@toast-ui/editor';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';
import { useEffect, useRef, useState } from 'react';

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
 * Also enables click-to-preview lightbox for any embedded images.
 */
export default function RichContentReader({
    className = 'w-full max-w-full text-(--mui-palette-text-primary) text-sm sm:text-base leading-relaxed break-words',
    content,
    emptyPlaceholder = 'No content provided.'
}: RichContentReaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<EditorInstance | null>(null);
    const [previewImage, setPreviewImage] = useState<ImagePreviewItem | null>(null);

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
                plugins: [colorSyntax],
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

    const [previewImages, setPreviewImages] = useState<ImagePreviewItem[]>([]);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // Handle clicking images inside rich text content to open zoomable lightbox preview
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        function handleImageClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'IMG') {
                const clickedImg = target as HTMLImageElement;
                if (!clickedImg.src) return;

                const allImgs = Array.from(container?.querySelectorAll('img') || []).filter(
                    (el) => Boolean(el.src)
                );
                const allItems: ImagePreviewItem[] = allImgs.map((el) => ({
                    fileName: el.alt || el.src.split('/').pop()?.split('?')[0] || 'Image',
                    url: el.src
                }));

                const clickedIdx = allImgs.indexOf(clickedImg);
                setPreviewImages(allItems.length > 0 ? allItems : [{
                    fileName: clickedImg.alt || 'Image',
                    url: clickedImg.src
                }]);
                setPreviewIndex(clickedIdx >= 0 ? clickedIdx : 0);
            }
        }

        container.addEventListener('click', handleImageClick);
        return () => {
            container.removeEventListener('click', handleImageClick);
        };
    }, []);

    return (
        <>
            <div className={`${className} [&_img]:cursor-pointer [&_img]:rounded-lg [&_img]:transition-opacity hover:[&_img]:opacity-95`} ref={containerRef} />
            <ImagePreviewModal
                images={previewImages}
                initialIndex={previewIndex ?? 0}
                open={previewIndex !== null}
                onClose={() => setPreviewIndex(null)}
            />
        </>
    );
}
