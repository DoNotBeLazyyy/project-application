import { Box, Stack, Typography } from '@mui/material';
import InputAdornmentSamples from '@pages/component-sample/input/InputAdornmentSamples';
import InputQuickPreview from '@pages/component-sample/input/InputQuickPreview';
import InputSizeSamples from '@pages/component-sample/input/InputSizeSamples';
import InputStateSamples from '@pages/component-sample/input/InputStateSamples';

export default function CommonInputSample() {
    return (
        <Box
            sx={{
                backgroundColor: '#F8FAFC',
                minHeight: '100vh',
                p: {
                    xs: '20px',
                    md: '32px'
                }
            }}
        >
            <Stack spacing={4}>
                <Box>
                    <Typography
                        sx={{
                            color: '#18181B',
                            fontSize: {
                                xs: '28px',
                                md: '36px'
                            },
                            fontWeight: 700,
                            lineHeight: {
                                xs: '36px',
                                md: '44px'
                            },
                            mb: '8px'
                        }}
                    >
                        CommonInput Display Page
                    </Typography>
                    <Typography
                        sx={{
                            color: '#52525B',
                            fontSize: '15px',
                            fontWeight: 400,
                            lineHeight: '24px',
                            maxWidth: '900px'
                        }}
                    >
                        This page displays the available CommonInput combinations in an organized layout,
                        grouped by quick preview, size scale, state reference, and adornment variations.
                    </Typography>
                </Box>
                <InputQuickPreview />
                <InputSizeSamples />
                <InputStateSamples />
                <InputAdornmentSamples />
            </Stack>
        </Box>
    );
}