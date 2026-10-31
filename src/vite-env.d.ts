/// <reference types='vite/client' />

declare module '@toast-ui/editor' {
    export interface EditorInstance {
        destroy(): void;
        getHTML(): string;
        getMarkdown(): string;
        setHTML(html: string): void;
        setMarkdown(markdown: string): void;
    }

    export default class Editor implements EditorInstance {
        constructor(options: {
            autofocus?: boolean;
            el: HTMLElement;
            events?: {
                blur?: () => void;
                change?: () => void;
            };
            height?: string;
            hideModeSwitch?: boolean;
            hooks?: {
                addImageBlobHook?: (blob: Blob | File, callback: (url: string, text?: string) => void) => Promise<void> | void;
            };
            initialEditType?: string;
            initialValue?: string;
            placeholder?: string;
            plugins?: unknown[];
            previewStyle?: string;
            toolbarItems?: (string | string[])[][];
            usageStatistics?: boolean;
        });

        static factory(options: {
            el: HTMLElement;
            initialValue?: string;
            plugins?: unknown[];
            viewer?: boolean;
        }): EditorInstance;

        destroy(): void;
        getHTML(): string;
        getMarkdown(): string;
        setHTML(html: string): void;
        setMarkdown(markdown: string): void;
    }
}

declare module '@toast-ui/editor-plugin-color-syntax' {
    import { PluginInfo } from '@toast-ui/editor';
    const colorSyntax: (context?: any, options?: any) => PluginInfo | Record<string, unknown>;
    export default colorSyntax;
}

declare module 'tui-color-picker';