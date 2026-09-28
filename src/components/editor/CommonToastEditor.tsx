import '@components/editor/toastui-editor-theme.css';
import { uploadFile } from '@services/storage.service';
import Editor, { EditorInstance } from '@toast-ui/editor';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef
} from 'react';

export interface CommonToastEditorProps {
    disabled?: boolean;
    height?: string;
    hideModeSwitch?: boolean;
    initialEditType?: 'markdown' | 'wysiwyg';
    initialValue?: string;
    placeholder?: string;
    previewStyle?: 'tab' | 'vertical';
    storageBucket?: 'materials' | 'announcements' | 'events';
    value?: string;
    onBlur?: () => void;
    onChange?: (value: string) => void;
}

export interface CommonToastEditorRef {
    getInstance: () => EditorInstance | null;
    getMarkdown: () => string;
    getHTML: () => string;
    setMarkdown: (markdown: string) => void;
    setHTML: (html: string) => void;
}

/**
 * CommonToastEditor
 *
 * Encapsulated TOAST UI Editor wrapper providing rich visual editing in edit mode,
 * and a clean document reader view in read-only mode.
 */
const CommonToastEditor = forwardRef<CommonToastEditorRef, CommonToastEditorProps>(function CommonToastEditor(
    {
        disabled = false,
        height = '320px',
        hideModeSwitch = true,
        initialEditType = 'wysiwyg',
        initialValue = '',
        placeholder = 'Write content here...',
        previewStyle = 'tab',
        storageBucket = 'materials',
        value,
        onBlur,
        onChange
    },
    ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<EditorInstance | null>(null);
    const lastValueRef = useRef<string>(value ?? initialValue ?? '');

    useImperativeHandle(ref, () => ({
        getInstance: () => instanceRef.current,
        getHTML: () => {
            const inst = instanceRef.current;
            if (!inst) return '';
            if ('getHTML' in inst && typeof inst.getHTML === 'function') {
                return inst.getHTML();
            }
            return '';
        },
        getMarkdown: () => {
            const inst = instanceRef.current;
            if (!inst) return '';
            if ('getMarkdown' in inst && typeof inst.getMarkdown === 'function') {
                return inst.getMarkdown();
            }
            return lastValueRef.current;
        },
        setHTML: (html: string) => {
            const inst = instanceRef.current;
            if (inst && 'setHTML' in inst && typeof inst.setHTML === 'function') {
                inst.setHTML(html);
            }
        },
        setMarkdown: (markdown: string) => {
            const inst = instanceRef.current;
            if (inst && 'setMarkdown' in inst && typeof inst.setMarkdown === 'function') {
                inst.setMarkdown(markdown);
            }
        }
    }));

    const destroyCurrentInstance = () => {
        if (instanceRef.current) {
            try {
                instanceRef.current.destroy();
            } catch {
                // Ignore destroy errors during unmount or transition
            }
            instanceRef.current = null;
        }
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }
    };

    // Initialize or re-create instance when mode (disabled) or editor configuration changes
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const currentVal = value ?? initialValue ?? '';
        lastValueRef.current = currentVal;

        destroyCurrentInstance();

        if (disabled) {
            if (!currentVal.trim()) {
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <div class="italic text-slate-400 dark:text-zinc-500 text-sm py-2">
                            No description or content provided.
                        </div>
                    `;
                }
                return () => {
                    destroyCurrentInstance();
                };
            }

            const viewer = Editor.factory({
                el: containerRef.current,
                initialValue: currentVal,
                viewer: true
            });
            instanceRef.current = viewer;

            return () => {
                destroyCurrentInstance();
            };
        }

        const editor = new Editor({
            el: containerRef.current,
            events: {
                blur: () => {
                    onBlur?.();
                },
                change: () => {
                    const currentMarkdown = editor.getMarkdown();
                    lastValueRef.current = currentMarkdown;
                    onChange?.(currentMarkdown);
                }
            },
            height,
            hideModeSwitch,
            hooks: {
                addImageBlobHook: async(blob: Blob | File, callback: (url: string, text?: string) => void) => {
                    try {
                        const file = blob instanceof File
                            ? blob
                            : new File([blob], `image-${Date.now()}.png`, { type: blob.type });

                        const timestamp = Date.now();
                        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const storagePath = `editor-images/${timestamp}-${sanitizedName}`;

                        const result = await uploadFile({
                            bucket: storageBucket,
                            file,
                            path: storagePath
                        });

                        if (result.data?.url) {
                            callback(result.data.url, file.name);
                        }
                    }
                    catch {
                        // Silent fallback
                    }
                }
            },
            initialEditType,
            initialValue: currentVal,
            placeholder,
            previewStyle,
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task', 'indent', 'outdent'],
                ['table', 'image', 'link'],
                ['code', 'codeblock']
            ],
            usageStatistics: false
        });

        instanceRef.current = editor;

        return () => {
            destroyCurrentInstance();
        };
    }, [disabled, height, hideModeSwitch, initialEditType, placeholder, previewStyle, storageBucket]);

    // Handle asynchronous content updates (e.g. when data is fetched from the server)
    useEffect(() => {
        if (value === undefined || value === lastValueRef.current) {
            return;
        }

        lastValueRef.current = value;

        if (disabled) {
            if (!containerRef.current) return;

            if (!value.trim()) {
                destroyCurrentInstance();
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <div class="italic text-slate-400 dark:text-zinc-500 text-sm py-2">
                            No description or content provided.
                        </div>
                    `;
                }
                return;
            }

            if (instanceRef.current && typeof instanceRef.current.setMarkdown === 'function') {
                instanceRef.current.setMarkdown(value);
            } else {
                destroyCurrentInstance();
                if (containerRef.current) {
                    const viewer = Editor.factory({
                        el: containerRef.current,
                        initialValue: value,
                        viewer: true
                    });
                    instanceRef.current = viewer;
                }
            }
        } else {
            if (instanceRef.current && typeof instanceRef.current.setMarkdown === 'function') {
                instanceRef.current.setMarkdown(value);
            }
        }
    }, [value, disabled]);

    return (
        <div
            className={
                disabled
                    ? 'bg-(--mui-palette-action-hover)/20 border border-(--mui-palette-divider) min-h-[100px] max-h-[480px] p-4 rounded-lg text-(--mui-palette-text-primary) text-sm w-full max-w-full overflow-y-auto overflow-x-auto break-words'
                    : 'w-full max-w-full overflow-hidden'
            }
            ref={containerRef}
        />
    );
});

export default CommonToastEditor;