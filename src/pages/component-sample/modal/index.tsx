import AlertPromptModalSample from '@pages/component-sample/modal/AlertModalSample';
import ConfirmPromptModalSample from '@pages/component-sample/modal/ConfirmModalSample';
import DeletePromptModalSample from '@pages/component-sample/modal/DeleteModalSample';
import FilterModalSample from '@pages/component-sample/modal/FilterModalSample';
import TypedDeletePromptModalSample from '@pages/component-sample/modal/TypedDeleteModalSample';

/**
 * ModalSamplePage
 *
 * A centralized showcase page for demonstrating various specialized modal components.
 * This orchestrator excludes the generic CommonModalSample to focus on specialized action intents.
 *
 * @example
 * <ModalSamplePage />
 */
export default function ModalSamplePage() {
    return (
        <div className="bg-(--mui-tokens-color-neutral-50) flex flex-wrap gap-(--mui-tokens-spacing-4) items-center justify-center min-h-screen p-10">
            <DeletePromptModalSample />
            <ConfirmPromptModalSample />
            <AlertPromptModalSample />
            <TypedDeletePromptModalSample />
            <FilterModalSample />
        </div>
    );
}