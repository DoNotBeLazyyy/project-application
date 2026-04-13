import CommonToggle from '@components/switch/CommonToggle';
import { Switch } from '@mui/material';
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
        <div className="flex gap-10 h-full items-center justify-center p-5 w-full">
            <Stack spacing={10}>
                <div className="flex flex-col justify-center gap-1 text-[50px]">
                    Toggle with label
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
                    {checked && (
                        <div className="text-[50px] font-bold">
                            HELLO WORLD
                        </div>
                    )}
                </div>
                <div className="flex flex-col justify-center gap-1 text-[50px]">
                    Toggle without label
                    <CommonToggle />
                    <CommonToggle disabled />
                    <CommonToggle
                        checked={true}
                        disabled
                    />
                </div>

                <div className="flex flex-col justify-center gap-1 text-[50px]">
                    NEW SWITCH
                    <Switch
                        onChange={handleToggleChange}
                    />
                    {checked && (
                        <div className="text-[50px] font-bold">
                            HELLO WORLD
                        </div>
                    )}
                    <Switch
                        checked={false}
                        disabled
                    />
                    <Switch
                        checked={true}
                        disabled
                    />
                </div>
            </Stack>
        </div>
    );
}