import { Switch, SwitchProps } from '@mui/material';

interface CommonToggleProps extends SwitchProps {
    // Label for toggle switch.
    label?: string;
}

/**
 * CommonToggle
 * A reusable toggle switch component built with MUI.
 *
 * @example
 * <CommonToggle
 *    label="Enable Notifications"
 * />
 */
export default function CommonToggle({
    label,
    sx,
    ...props
}: CommonToggleProps) {
    const baseStyle = {
        height: '24px',
        padding: '0px',
        width: '44px',
        '& .MuiSwitch-switchBase': {
            padding: '2px',
            '&.Mui-checked': {
                color: '#ffffff',
                '& + .MuiSwitch-track': {
                    backgroundColor: '#022179',
                    opacity: 1
                }
            },
            '&.Mui-disabled': {
                color: '#ffffff',
                '& + .MuiSwitch-track': {
                    backgroundColor: '#E4E4E7',
                    opacity: 1
                }
            },
            '&.Mui-checked.Mui-disabled': {
                '& + .MuiSwitch-track': {
                    backgroundColor: '#A1A1AA',
                    opacity: 1
                }
            },
            '&:hover': { backgroundColor: 'transparent' }
        },
        '& .MuiSwitch-thumb': {
            backgroundColor: '#ffffff',
            boxShadow: 'none',
            height: '20px',
            width: '20px'
        },
        '& .MuiSwitch-track': {
            backgroundColor: '#D4D4D8',
            borderRadius: '12px',
            boxShadow: 'none',
            opacity: 1
        },
        ...sx
    }; // Base styles for the switch component.

    return (
        <div className="flex items-center gap-4">
            <Switch
                sx={baseStyle}
                {...props}
            />
            <div className="flex items-start text-[10px]">
                {label}
            </div>
        </div>
    );
}