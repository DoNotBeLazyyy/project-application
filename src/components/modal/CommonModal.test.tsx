import CommonActionModal from '@components/modal/CommonActionModal';
import CommonFormModal from '@components/modal/CommonFormModal';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('CommonModal & Derived Modals', () => {
    describe('CommonModal', () => {
        it('does not close when pressing Escape key', () => {
            const handleClose = vi.fn();
            render(
                <CommonModal open={true} onClose={handleClose}>
                    <div>Modal Content</div>
                </CommonModal>
            );

            expect(screen.getByText('Modal Content')).toBeInTheDocument();

            fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
            expect(handleClose).not.toHaveBeenCalled();
        });

        it('does not close when clicking the dark backdrop area', () => {
            const handleClose = vi.fn();
            render(
                <CommonModal open={true} onClose={handleClose}>
                    <div>Modal Content</div>
                </CommonModal>
            );

            const backdrop = document.querySelector('.MuiBackdrop-root');
            expect(backdrop).toBeInTheDocument();
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(handleClose).not.toHaveBeenCalled();
            }
        });

        it('allows closing via explicit button trigger', () => {
            const handleClose = vi.fn();
            render(
                <CommonModal open={true} onClose={handleClose}>
                    <button type="button" onClick={() => handleClose()}>Close Button</button>
                </CommonModal>
            );

            const closeBtn = screen.getByText('Close Button');
            fireEvent.click(closeBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('CommonActionModal', () => {
        it('does not close on Escape key or backdrop click', () => {
            const handleClose = vi.fn();
            render(
                <CommonActionModal open={true} onClose={handleClose}>
                    <div>Action Modal Content</div>
                </CommonActionModal>
            );

            fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
            expect(handleClose).not.toHaveBeenCalled();

            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(handleClose).not.toHaveBeenCalled();
            }
        });
    });

    describe('CommonFormModal', () => {
        it('does not close on Escape key or backdrop click', () => {
            const handleClose = vi.fn();
            render(
                <CommonFormModal
                    open={true}
                    formContent={<div>Form Modal Content</div>}
                    onClose={handleClose}
                />
            );

            fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
            expect(handleClose).not.toHaveBeenCalled();

            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(handleClose).not.toHaveBeenCalled();
            }
        });
    });

    describe('CommonPromptModal', () => {
        it('does not close on Escape key or backdrop click', () => {
            const handleClose = vi.fn();
            render(
                <CommonPromptModal
                    open={true}
                    mainContent={{ title: 'Are you sure?' }}
                    onClose={handleClose}
                />
            );

            fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
            expect(handleClose).not.toHaveBeenCalled();

            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(handleClose).not.toHaveBeenCalled();
            }
        });
    });
});
