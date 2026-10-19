import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonToastEditor from '@components/editor/ValidCommonToastEditor';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@toast-ui/editor', () => {
    return {
        default: class MockEditor {
            options: any;
            constructor(options: any) {
                this.options = options;
                if (options?.el) {
                    const editorDiv = document.createElement('div');
                    editorDiv.className = 'toastui-editor-contents';
                    editorDiv.setAttribute('contenteditable', 'true');
                    options.el.appendChild(editorDiv);
                }
            }
            destroy = vi.fn();
            getHTML = vi.fn(() => '');
            getMarkdown = vi.fn(() => '');
            setHTML = vi.fn();
            setMarkdown = vi.fn();
            static factory = vi.fn(() => ({
                destroy: vi.fn(),
                getHTML: vi.fn(() => ''),
                getMarkdown: vi.fn(() => ''),
                setHTML: vi.fn(),
                setMarkdown: vi.fn()
            }));
        }
    };
});

describe('ValidCommonToastEditor - Error Tooltip Auto-Open', () => {
    function TestAnnouncementForm({ defaultTitle = 'Valid Announcement Title' }: { defaultTitle?: string }) {
        const { control, handleSubmit } = useForm({
            defaultValues: {
                title: defaultTitle,
                description: ''
            }
        });

        return (
            <form onSubmit={handleSubmit(() => {})}>
                <ValidCommonInput
                    control={control}
                    isRequired
                    label="Announcement Title"
                    name="title"
                    rules={{
                        required: 'Title is required'
                    }}
                />
                <ValidCommonToastEditor
                    control={control}
                    isRequired
                    label="Announcement Content"
                    name="description"
                    rules={{
                        required: 'Content is required'
                    }}
                />
                <button type="submit">Save</button>
            </form>
        );
    }

    it('automatically opens the error tooltip when Announcement Content is the only / first field with error', async () => {
        const user = userEvent.setup();
        render(<TestAnnouncementForm defaultTitle="Existing Title" />);

        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        // When submitted with only Announcement Content empty, its error tooltip should display and open automatically
        await waitFor(() => {
            const tooltip = screen.getByRole('tooltip');
            expect(tooltip).toBeInTheDocument();
            expect(tooltip).toHaveTextContent('Content is required');
        });
    });

    it('does not open Announcement Content error tooltip when Title is the first field with error', async () => {
        const user = userEvent.setup();
        render(<TestAnnouncementForm defaultTitle="" />);

        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        // Title should be the first error and display its tooltip
        await waitFor(() => {
            const tooltip = screen.getByRole('tooltip');
            expect(tooltip).toBeInTheDocument();
            expect(tooltip).toHaveTextContent('Title is required');
        });
    });
});
