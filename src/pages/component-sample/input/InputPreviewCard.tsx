import { Box, Typography } from '@mui/material';
import { InputDemoRowProps } from '@pages/component-sample/input/InputDemoRow';

export default function InputPreviewCard({
    children,
    label
}: InputDemoRowProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '320px',
                minWidth: '260px',
                width: 'auto'
            }}
        >
            <Typography
                sx={{
                    color: '#71717A',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '18px'
                }}
            >
                {label}
            </Typography>

            {children}
        </Box>
    );
}