import { Box, Stack, Typography } from '@mui/material';
import { DemoRowProps } from '@pages/component-sample/button/DemoRow';

interface SectionCardProps extends DemoRowProps {
    // Section subtitle
    subtitle?: string;
}

export default function SectionCard({
    children,
    subtitle,
    label
}: SectionCardProps) {
    return (
        <Box
            sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '24px',
                boxShadow: '0 8px 24px 0 #0000000D',
                p: '24px'
            }}
        >
            <Stack
                spacing={1}
                sx={{ mb: '20px' }}
            >
                <Typography
                    sx={{
                        color: '#18181B',
                        fontSize: '20px',
                        fontWeight: 700,
                        lineHeight: '28px'
                    }}
                >
                    {label}
                </Typography>
                {subtitle && (
                    <Typography
                        sx={{
                            color: '#71717A',
                            fontSize: '14px',
                            fontWeight: 400,
                            lineHeight: '20px'
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Stack>
            {children}
        </Box>
    );
}