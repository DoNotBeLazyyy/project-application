import { Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface InputDemoRowProps {
    // Input children
    children: ReactNode;

    // Input label
    label: string;
}

export default function InputDemoRow({
    children,
    label
}: InputDemoRowProps) {
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
                    lg: 'flex-start'
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
                    pt: '12px',
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
                sx={{
                    width: '100%',
                    alignItems: 'flex-start',
                    justifyItems: 'flex-start'
                }}
            >
                {children}
            </Stack>
        </Stack>
    );
}