import CommonTabMenu, { TabItem } from '@components/tab/CommonTabMenu';
import { StringNum } from '@type/common.type';
import { TabMenuVariant } from '@type/tab.types';
import { useState } from 'react';

const TAB_LABELS = ['Dashboard', 'Calendar', 'Attendance', 'Shifts', 'Settings'];

const TABS_WITH_ICON: TabItem[] = TAB_LABELS.map((label, index) => ({
    icon: true,
    label,
    value: index
}));

const VARIANTS: TabMenuVariant[] = ['filled', 'outlined', 'pill', 'soft'];

const ICON_VARIANTS = new Set<TabMenuVariant>(['filled', 'outlined', 'soft']);

export default function CommonTabMenuSample() {
    const [activeSheets, setActiveSheets] = useState<Record<string, StringNum>>(
        Object.fromEntries(VARIANTS.map((v) => [v, 0]))
    );

    function handleSetActiveSheet(variant: string, value: StringNum) {
        setActiveSheets((prev) => ({ ...prev, [variant]: value }));
    }

    return (
        <div className="flex flex-col gap-8 p-6">
            {VARIANTS.map((variant) => (
                <div key={variant}>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                        {variant}
                    </p>
                    <CommonTabMenu
                        tabs={ICON_VARIANTS.has(variant)
                            ? TABS_WITH_ICON
                            : TAB_LABELS}
                        value={activeSheets[variant]}
                        variant={variant}
                        onSetActiveSheet={(value) => handleSetActiveSheet(variant, value)}
                    />
                </div>
            ))}
        </div>
    );
}