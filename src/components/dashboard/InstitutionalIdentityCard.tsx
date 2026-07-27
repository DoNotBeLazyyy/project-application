import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import {
    INSTITUTION_CAMPUS,
    INSTITUTION_CORE_VALUES,
    INSTITUTION_HYMN_TITLE,
    INSTITUTION_HYMN_VERSES,
    INSTITUTION_MISSION,
    INSTITUTION_NAME,
    INSTITUTION_VISION
} from '@constants/institution.constant';
import { CompassIcon, MusicNotesIcon, SealCheckIcon } from '@phosphor-icons/react';
import { SyntheticEvent, useState } from 'react';

type IdentityTab = 'hymn' | 'vision' | 'values';

const IDENTITY_TABS = [
    {
        icon: <MusicNotesIcon />,
        label: 'Hymn',
        value: 'hymn'
    },
    {
        icon: <CompassIcon />,
        label: 'Vision & Mission',
        value: 'vision'
    },
    {
        icon: <SealCheckIcon />,
        label: 'Core Values',
        value: 'values'
    }
];

function HymnPanel() {
    return (
        <div className="flex flex-col gap-4">
            <h3 className="font-semibold m-0 text-(--mui-palette-text-primary) text-base">
                {INSTITUTION_HYMN_TITLE}
            </h3>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                {INSTITUTION_HYMN_VERSES.map((verse, verseIndex) => (
                    <div
                        className="border-l-2 border-(--mui-palette-primary-main) flex flex-col gap-1 pl-4"
                        key={verse[0]}
                    >
                        <span className="font-medium text-(--mui-palette-text-disabled) text-xs uppercase">
                            Verse {verseIndex + 1}
                        </span>
                        {verse.map((line) => (
                            <p
                                className="italic leading-relaxed m-0 text-(--mui-palette-text-secondary) text-sm"
                                key={line}
                            >
                                {line}
                            </p>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function VisionPanel() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-disabled) text-xs uppercase">
                    Vision
                </span>
                <p className="leading-relaxed m-0 text-(--mui-palette-text-secondary) text-sm">
                    {INSTITUTION_VISION}
                </p>
            </div>
            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-disabled) text-xs uppercase">
                    Mission
                </span>
                <p className="leading-relaxed m-0 text-(--mui-palette-text-secondary) text-sm">
                    {INSTITUTION_MISSION}
                </p>
            </div>
        </div>
    );
}

function ValuesPanel() {
    return (
        <div className="gap-3 grid grid-cols-2 md:grid-cols-3">
            {INSTITUTION_CORE_VALUES.map((value) => (
                <div
                    className="border border-(--mui-palette-divider) flex gap-2 items-center p-3 rounded-lg"
                    key={value}
                >
                    <SealCheckIcon
                        className="shrink-0 text-(--mui-palette-primary-main)"
                        size={18}
                        weight="fill"
                    />
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        {value}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function InstitutionalIdentityCard() {
    const [activeTab, setActiveTab] = useState<IdentityTab>('hymn');

    function handleTabChange(_event: SyntheticEvent, value: IdentityTab) {
        setActiveTab(value);
    }

    return (
        <CommonCard
            cardHeaderProps={{
                subheader: `${INSTITUTION_NAME} — ${INSTITUTION_CAMPUS}`,
                title: 'Our Identity'
            }}
            className="flex flex-col"
        >
            <div className="flex flex-col gap-4 p-4 pt-0">
                <CommonTabMenu
                    menuStyle="pill"
                    size="small"
                    tabs={IDENTITY_TABS}
                    value={activeTab}
                    onChange={handleTabChange}
                />
                {activeTab === 'hymn' && <HymnPanel />}
                {activeTab === 'vision' && <VisionPanel />}
                {activeTab === 'values' && <ValuesPanel />}
            </div>
        </CommonCard>
    );
}