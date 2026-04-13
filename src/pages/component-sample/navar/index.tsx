import CommonNavar from '@components/navar/CommonNavar';
import { BellIcon, MagnifyingGlassIcon, UserCircleIcon } from '@phosphor-icons/react';

export default function CommonNavarSample() {
    return (
        <div className="flex flex-col gap-[var(--mui-tokens-spacing-8)] p-[var(--mui-tokens-spacing-6)]">
            <div>
                <p className="mb-[var(--mui-tokens-spacing-3)] text-[length:var(--mui-tokens-fontSize-sm)] font-[var(--mui-tokens-fontWeight-bold)] text-[var(--mui-tokens-color-neutral-600)]">
                    Default
                </p>
                <CommonNavar
                    leftContent={
                        <span className="text-[length:var(--mui-tokens-fontSize-sm)] text-[var(--mui-tokens-color-common-white)]">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-[var(--mui-tokens-color-common-white)]" size={20} />
                            <UserCircleIcon className="text-[var(--mui-tokens-color-common-white)]" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="mb-[var(--mui-tokens-spacing-3)] text-[length:var(--mui-tokens-fontSize-sm)] font-[var(--mui-tokens-fontWeight-bold)] text-[var(--mui-tokens-color-neutral-600)]">
                    Rounded
                </p>
                <CommonNavar
                    className="rounded-[var(--mui-tokens-radius-lg)]"
                    leftContent={
                        <span className="text-[length:var(--mui-tokens-fontSize-sm)] text-[var(--mui-tokens-color-common-white)]">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-[var(--mui-tokens-color-common-white)]" size={20} />
                            <UserCircleIcon className="text-[var(--mui-tokens-color-common-white)]" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="mb-[var(--mui-tokens-spacing-3)] text-[length:var(--mui-tokens-fontSize-sm)] font-[var(--mui-tokens-fontWeight-bold)] text-[var(--mui-tokens-color-neutral-600)]">
                    Full Rounded
                </p>
                <CommonNavar
                    className="rounded-[var(--mui-tokens-radius-full)]"
                    leftContent={
                        <span className="text-[length:var(--mui-tokens-fontSize-sm)] text-[var(--mui-tokens-color-common-white)]">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-[var(--mui-tokens-color-common-white)]" size={20} />
                            <UserCircleIcon className="text-[var(--mui-tokens-color-common-white)]" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="mb-[var(--mui-tokens-spacing-3)] text-[length:var(--mui-tokens-fontSize-sm)] font-[var(--mui-tokens-fontWeight-bold)] text-[var(--mui-tokens-color-neutral-600)]">
                    With Search
                </p>
                <CommonNavar
                    className="rounded-[var(--mui-tokens-radius-lg)]"
                    leftContent={
                        <div className="flex items-center gap-[var(--mui-tokens-spacing-2)] rounded-[var(--mui-tokens-radius-md)] bg-white/10 px-[var(--mui-tokens-spacing-3)] py-[var(--mui-tokens-spacing-2)]">
                            <MagnifyingGlassIcon className="text-[var(--mui-tokens-color-common-white)]" size={16} />
                            <span className="text-[length:var(--mui-tokens-fontSize-sm)] text-white/60">
                                Search...
                            </span>
                        </div>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-[var(--mui-tokens-color-common-white)]" size={20} />
                            <UserCircleIcon className="text-[var(--mui-tokens-color-common-white)]" size={24} />
                        </>
                    }
                />
            </div>

            <div>
                <p className="mb-[var(--mui-tokens-spacing-3)] text-[length:var(--mui-tokens-fontSize-sm)] font-[var(--mui-tokens-fontWeight-bold)] text-[var(--mui-tokens-color-neutral-600)]">
                    Custom Background
                </p>
                <CommonNavar
                    className="rounded-[var(--mui-tokens-radius-lg)] bg-[var(--mui-tokens-color-brand-900)]"
                    leftContent={
                        <span className="text-[length:var(--mui-tokens-fontSize-sm)] text-[var(--mui-tokens-color-common-white)]">
                            Dashboard
                        </span>
                    }
                    rightContent={
                        <>
                            <BellIcon className="text-[var(--mui-tokens-color-common-white)]" size={20} />
                            <UserCircleIcon className="text-[var(--mui-tokens-color-common-white)]" size={24} />
                        </>
                    }
                />
            </div>
        </div>
    );
}