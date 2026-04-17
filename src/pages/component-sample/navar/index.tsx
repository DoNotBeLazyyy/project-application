import CommonNavbar from '@components/navbar/CommonNavbar';
import { BellIcon, MagnifyingGlassIcon, UserCircleIcon } from '@phosphor-icons/react';

export default function CommonNavarSample() {
    return (
        <div className="flex flex-col gap-(--mui-tokens-spacing-8) p-(--mui-tokens-spacing-6)">
            <div>
                <p className="font-(--mui-tokens-fontWeight-bold) mb-(--mui-tokens-spacing-3) text-(--mui-tokens-color-neutral-600) text-(length:--mui-tokens-fontSize-sm)">
                    Default
                </p>
                <CommonNavbar
                    leftContent={
                        <span className="text-(--mui-tokens-color-common-white) text-(length:--mui-tokens-fontSize-sm)">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-(--mui-tokens-color-common-white)" size={20} />
                            <UserCircleIcon className="text-(--mui-tokens-color-common-white)" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="font-(--mui-tokens-fontWeight-bold) mb-(--mui-tokens-spacing-3) text-(--mui-tokens-color-neutral-600) text-(length:--mui-tokens-fontSize-sm)">
                    Rounded
                </p>
                <CommonNavbar
                    className="rounded-(--mui-tokens-radius-lg)"
                    leftContent={
                        <span className="text-(--mui-tokens-color-common-white) text-(length:--mui-tokens-fontSize-sm)">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-(--mui-tokens-color-common-white)" size={20} />
                            <UserCircleIcon className="text-(--mui-tokens-color-common-white)" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="font-(--mui-tokens-fontWeight-bold) mb-(--mui-tokens-spacing-3) text-(--mui-tokens-color-neutral-600) text-(length:--mui-tokens-fontSize-sm)">
                    Full Rounded
                </p>
                <CommonNavbar
                    className="rounded-(--mui-tokens-radius-full)"
                    leftContent={
                        <span className="text-(--mui-tokens-color-common-white) text-(length:--mui-tokens-fontSize-sm)">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-(--mui-tokens-color-common-white)" size={20} />
                            <UserCircleIcon className="text-(--mui-tokens-color-common-white)" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="font-(--mui-tokens-fontWeight-bold) mb-(--mui-tokens-spacing-3) text-(--mui-tokens-color-neutral-600) text-(length:--mui-tokens-fontSize-sm)">
                    With Search
                </p>
                <CommonNavbar
                    className="rounded-(--mui-tokens-radius-lg)"
                    leftContent={
                        <div className="bg-white/10 flex gap-(--mui-tokens-spacing-2) items-center px-(--mui-tokens-spacing-3) py-(--mui-tokens-spacing-2) rounded-(--mui-tokens-radius-md)">
                            <MagnifyingGlassIcon className="text-(--mui-tokens-color-common-white)" size={16} />
                            <span className="text-(length:--mui-tokens-fontSize-sm) text-white/60">
                                Search...
                            </span>
                        </div>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-(--mui-tokens-color-common-white)" size={20} />
                            <UserCircleIcon className="text-(--mui-tokens-color-common-white)" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="font-(--mui-tokens-fontWeight-bold) mb-(--mui-tokens-spacing-3) text-(--mui-tokens-color-neutral-600) text-(length:--mui-tokens-fontSize-sm)">
                    Custom Background
                </p>
                <CommonNavbar
                    className="bg-(--mui-tokens-color-brand-900) rounded-(--mui-tokens-radius-lg)"
                    leftContent={
                        <span className="text-(--mui-tokens-color-common-white) text-(length:--mui-tokens-fontSize-sm)">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-(--mui-tokens-color-common-white)" size={20} />
                            <UserCircleIcon className="text-(--mui-tokens-color-common-white)" size={24} />
                        </>
                    }
                />
            </div>
        </div>
    );
}