import CommonNavigationBar from '@components/navar/CommonNavigationBar';
import { BellIcon, MagnifyingGlassIcon, UserCircleIcon } from '@phosphor-icons/react';

export default function CommonNavarSample() {
    return (
        <div className="flex flex-col gap-(--mui-tokens-spacing-8) p-(--mui-tokens-spacing-6)">
            <div>
                <p className="mb-(--mui-tokens-spacing-3) text-(length:--mui-tokens-fontSize-sm) font-(--mui-tokens-fontWeight-bold) text-(--mui-tokens-color-neutral-600)">
                    Default
                </p>
                <CommonNavigationBar
                    leftContent={
                        <span className="text-(length:--mui-tokens-fontSize-sm) text-(--mui-tokens-color-common-white)">
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
                <p className="mb-(--mui-tokens-spacing-3) text-(length:--mui-tokens-fontSize-sm) font-(--mui-tokens-fontWeight-bold) text-(--mui-tokens-color-neutral-600)">
                    Rounded
                </p>
                <CommonNavigationBar
                    className="rounded-(--mui-tokens-radius-lg)"
                    leftContent={
                        <span className="text-(length:--mui-tokens-fontSize-sm) text-(--mui-tokens-color-common-white)">
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
                <p className="mb-(--mui-tokens-spacing-3) text-(length:--mui-tokens-fontSize-sm) font-(--mui-tokens-fontWeight-bold) text-(--mui-tokens-color-neutral-600)">
                    Full Rounded
                </p>
                <CommonNavigationBar
                    className="rounded-(--mui-tokens-radius-full)"
                    leftContent={
                        <span className="text-(length:--mui-tokens-fontSize-sm) text-(--mui-tokens-color-common-white)">
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
                <p className="mb-(--mui-tokens-spacing-3) text-(length:--mui-tokens-fontSize-sm) font-(--mui-tokens-fontWeight-bold) text-(--mui-tokens-color-neutral-600)">
                    With Search
                </p>
                <CommonNavigationBar
                    className="rounded-(--mui-tokens-radius-lg)"
                    leftContent={
                        <div className="flex items-center gap-(--mui-tokens-spacing-2) rounded-(--mui-tokens-radius-md) bg-white/10 px-(--mui-tokens-spacing-3) py-(--mui-tokens-spacing-2)">
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
                <p className="mb-(--mui-tokens-spacing-3) text-(length:--mui-tokens-fontSize-sm) font-(--mui-tokens-fontWeight-bold) text-(--mui-tokens-color-neutral-600)">
                    Custom Background
                </p>
                <CommonNavigationBar
                    className="rounded-(--mui-tokens-radius-lg) bg-(--mui-tokens-color-brand-900)"
                    leftContent={
                        <span className="text-(length:--mui-tokens-fontSize-sm) text-(--mui-tokens-color-common-white)">
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