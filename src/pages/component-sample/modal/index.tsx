import AlertPromptModalSample from '@pages/component-sample/modal/AlertPromptModalSample';
import ConfirmPromptModalSample from '@pages/component-sample/modal/ConfirmPromptModalSample';
import DeletePromptModalSample from '@pages/component-sample/modal/DeletePromptModalSample';
import FilterModalSample from '@pages/component-sample/modal/FilterModalSample';
import TypedDeletePromptModalSample from '@pages/component-sample/modal/TypedDeletePromptModalSample';

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