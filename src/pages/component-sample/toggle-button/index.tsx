import CommonToggle from '@components/switch/CommonToggle';
import { Stack } from '@mui/system';
import { InputChangeEvent } from '@type/common.type';
import { useState } from 'react';

export default function CommonToggleSample() {
    const [checked, setChecked] = useState(false);

    function handleToggleChange(
        _event: InputChangeEvent,
        value: boolean
    ) {
        setChecked(value);
    }

    return (
        <Stack spacing={2}>
            <div className="flex flex-col justify-center gap-1">
                <CommonToggle
                    label="Common Toggle with custom styles"
                    sx={{
                        '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': {
                            backgroundColor: '#ABFA00'
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#FF0000'
                        }
                    }}
                />
                <CommonToggle
                    checked={true}
                    disabled
                    label="disabled Toggle on"
                />
                <CommonToggle
                    disabled
                    label="disabled Toggle off"
                />
                <CommonToggle
                    checked={checked}
                    label="Common Toggle on and off"
                    onChange={handleToggleChange}
                />
            </div>
            <div className="flex flex-col justify-center gap-1">
                <CommonToggle />
            </div>
        </Stack>
    );
}