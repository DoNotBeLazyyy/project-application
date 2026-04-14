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
                        checked={false}
                        disabled
                    />
                    <div className="gap-4 text-[16px] flex">
                        <Switch
                            checked={true}
                            disabled
                        />
                        <div className="justify-center text-[#FF0000]">hello</div>
                    </div>

                    {/** Eto lang need ko */}
                    <div className="gap-2 flex-col p-10 text-[30px] flex">
                        Switches with label
                        <div className="flex gap-[16px] leading-[20px] align-middle text-[#4F4F4F]">
                            <Switch
                                checked={true}
                            />
                            <div className="font-normal text-base leading-5 tracking-normal align-middle text-[#4F4F4F]">
                            Toggle Button
                            </div>
                        </div>
                        <div className="flex gap-[16px] leading-[20px] align-middle text-[#4F4F4F]">
                            <Switch />
                            <div className="font-normal text-base leading-5 tracking-normal align-middle text-[#4F4F4F]">
                            Toggle Button
                            </div>
                        </div>
                        <div className="flex gap-[16px] leading-[20px] align-middle text-[#4F4F4F]">
                            <Switch
                                checked={true}
                                disabled
                            />
                            <div className="font-normal text-base leading-5 tracking-normal align-middle text-[#4F4F4F]">
                            Toggle Button
                            </div>
                        </div>
                        <div className="flex gap-[16px] leading-[20px] align-middle text-[#4F4F4F]">
                            <Switch
                                disabled
                            />
                            <div className="font-normal text-base leading-5 tracking-normal align-middle text-[#4F4F4F]">
                            Toggle Button 4
                            </div>
                        </div>
                        <div className="flex flex-col gap-[16px] leading-[20px] align-middle text-[#4F4F4F]">
                            <Switch
                                onChange={handleToggleChange}
                            />
                            <div className="font-normal text-base leading-5 tracking-normal align-middle text-[#4F4F4F]">
                                Toggle Button
                            </div>
                            {checked && (
                                <div className="flex text-[50px] font-bold">
                                    HELLO WORLD
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Stack>
        </div>
    );
}