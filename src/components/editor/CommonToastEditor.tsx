import '@components/editor/toastui-editor-theme.css';
import { uploadFile } from '@services/storage.service';
import Editor from '@toast-ui/editor';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef
} from 'react';

export interface CommonToastEditorProps {
    disabled?: boolean;
    height?: string;
    initialEditType?: 'markdown' | 'wysiwyg';
    initialValue?: string;
    placeholder?: string;
    previewStyle?: 'tab' | 'vertical';
    storageBucket?: 'materials' | 'announcements' | 'events';
    value?: string;
    onBlur?: () => void;
    onChange?: (value: string) => void;
}

type EditorInstance = InstanceType<typeof Editor>;

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
 * Encapsulated TOAST UI Editor wrapper providing rich markdown and WYSIWYG editing,
 * AU-JAS LMS brand styling, and seamless Supabase Storage image upload integration.
 */
const CommonToastEditor = forwardRef<CommonToastEditorRef, CommonToastEditorProps>(function CommonToastEditor(
    {
        disabled = false,
        height = '320px',
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
    const editorInstanceRef = useRef<EditorInstance | null>(null);
    const lastValueRef = useRef<string>(value ?? initialValue ?? '');

    useImperativeHandle(ref, () => ({
        getInstance: () => editorInstanceRef.current,
        getHTML: () => editorInstanceRef.current?.getHTML() ?? '',
        getMarkdown: () => editorInstanceRef.current?.getMarkdown() ?? '',
        setHTML: (html: string) => editorInstanceRef.current?.setHTML(html),
        setMarkdown: (markdown: string) => editorInstanceRef.current?.setMarkdown(markdown)
    }));

    useEffect(() => {
        if (!containerRef.current) {
            return;
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
            initialValue: value ?? initialValue ?? '',
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

        editorInstanceRef.current = editor;

        return () => {
            editor.destroy();
            editorInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (editorInstanceRef.current && value !== undefined && value !== lastValueRef.current) {
            lastValueRef.current = value;
            editorInstanceRef.current.setMarkdown(value);
        }
    }, [value]);

    return (
        <div
            className={`w-full transition-opacity ${disabled
                ? 'opacity-60 pointer-events-none'
                : ''}`}
            ref={containerRef}
        />
    );
});

export default CommonToastEditor;