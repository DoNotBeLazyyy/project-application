import { Stack, Typography } from '@mui/material';

export interface DemoRowProps {
    // Demo children
    children: React.ReactNode;

    // Demo label
    label: string;
}

export default function DemoRow({
    children,
    label
}: DemoRowProps) {
    return (
        <Stack
            direction={{
                xs: 'column',
                lg: 'row'
            }}
            spacing={2}
            sx={{
                alignItems: {
                    xs: 'flex-start',
                    lg: 'center'
                },
                borderBottom: '1px solid #F4F4F5',
                py: '16px'
            }}
        >
            <Typography
                sx={{
                    color: '#3F3F46',
                    flexShrink: 0,
                    fontSize: '14px',
                    fontWeight: 700,
                    minWidth: {
                        xs: 'unset',
                        lg: '180px'
                    },
                    width: {
                        xs: '100%',
                        lg: '180px'
                    }
                }}
            >
                {label}
            </Typography>
            <Stack
                direction="row"
                flexWrap="wrap"
                gap={2}
                sx={{ alignItems: 'center' }}
            >
                {children}
            </Stack>
        </Stack>
    );
}