import {
    AppBar, Box, Button, Stack, Toolbar, Typography
} from '@mui/material';
import { NavLink, Outlet } from 'react-router-dom';

export default function ComponentSample() {
    const sampleMenus = [
        {
            label: 'Table',
            path: 'table'
        },
        {
            label: 'Radio',
            path: 'radio'
        },
        {
            label: 'Checkbox',
            path: 'checkbox'
        },
        {
            label: 'Input',
            path: 'input'
        },
        {
            label: 'Navar',
            path: 'navar'
        },
        {
            label: 'Sidebar',
            path: 'sidebar'
        },
        {
            label: 'Tab Menu',
            path: 'tab-menu'
        },
        {
            label: 'Button',
            path: 'button'
        }
    ] as const;

    return (
        <div className="h-full w-full">
            <AppBar
                elevation={0}
                position="sticky"
                sx={{
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E4E4E7',
                    color: '#18181B'
                }}
            >
                <Toolbar
                    sx={{
                        justifyContent: 'space-between',
                        mx: 'auto',
                        px: {
                            xs: '16px',
                            md: '24px'
                        },
                        py: '8px',
                        width: '100%',
                        maxWidth: '1440px'
                    }}
                >
                    <Typography
                        sx={{
                            color: '#022179',
                            fontSize: '20px',
                            fontWeight: 800,
                            letterSpacing: '-0.02em'
                        }}
                    >
                        Component Samples
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: 'center'
                        }}
                    >
                        {sampleMenus.map((menu) => (
                            <Button
                                component={NavLink}
                                key={menu.path}
                                to={menu.path}
                            >
                                {menu.label}
                            </Button>
                        ))}
                    </Stack>
                </Toolbar>
            </AppBar>
            <Box
                sx={{
                    height: '100%',
                    mx: 'auto',
                    p: '20px',
                    width: '100%',
                    maxWidth: '1440px'
                }}
            >
                <Outlet />
            </Box>
        </div>
    );
}