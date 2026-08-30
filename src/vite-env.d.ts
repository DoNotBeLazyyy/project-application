/// <reference types='vite/client' />

declare module '@toast-ui/editor' {
    export default class Editor {
        constructor(options: Record<string, unknown>);
        destroy(): void;
        getHTML(): string;
        getMarkdown(): string;
        setHTML(html: string): void;
        setMarkdown(markdown: string): void;
    }
}