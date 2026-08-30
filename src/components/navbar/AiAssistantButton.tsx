import { IconButton, Tooltip } from '@mui/material';
import { SparkleIcon } from '@phosphor-icons/react';
import { useAssistantStore } from '@stores/assistant.store';

/**
 * AiAssistantButton
 *
 * Header navbar action button that toggles the AU-JAS AI Assistant dialog.
 */
export default function AiAssistantButton() {
    const isOpen = useAssistantStore((state) => state.isOpen);
    const toggleOpen = useAssistantStore((state) => state.toggleOpen);

    return (
        <Tooltip title="AI Assistant">
            <IconButton
                aria-label="Toggle AI Assistant"
                size="small"
                sx={{
                    backgroundColor: isOpen
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'transparent',
                    color: 'var(--mui-tokens-color-common-white)',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                }}
                onClick={toggleOpen}
            >
                <SparkleIcon size={20} weight="fill" />
            </IconButton>
        </Tooltip>
    );
}