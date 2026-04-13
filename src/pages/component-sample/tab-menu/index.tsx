import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { House } from '@phosphor-icons/react';
import { TabItemData } from '@type/tab-menu.type';
import { useState } from 'react';

const SAMPLE_TABS: TabItemData[] = [
    { label: 'Tab Item', value: 'tab-1', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-2', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-3', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-4', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-5', icon: <House size={24} weight="fill" /> }
]; // 5-tab sample data

const SAMPLE_TABS_3: TabItemData[] = [
    { label: 'Tab Item', value: 'tab-1', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-2', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-3', icon: <House size={24} weight="fill" /> }
]; // 3-tab sample data

const SAMPLE_TABS_SMALL: TabItemData[] = [
    { label: 'Tab Item', value: 'tab-1', icon: <House size={20} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-2', icon: <House size={20} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-3', icon: <House size={20} weight="fill" /> }
]; // Small size sample data

const SAMPLE_TABS_WITH_BADGE: TabItemData[] = [
    { label: 'Tab Item', value: 'tab-1', icon: <House size={24} weight="fill" />, badge: 3 },
    { label: 'Tab Item', value: 'tab-2', icon: <House size={24} weight="fill" /> },
    { label: 'Tab Item', value: 'tab-3', icon: <House size={24} weight="fill" />, hasArrow: true }
]; // Sample data with badge and arrow

/**
 * CommonTabMenuSample
 *
 * A demonstration page showcasing all CommonTabMenu variants,
 * sizes, and optional features (badges, arrows).
 */
export default function CommonTabMenuSample() {
    const [outlineTab, setOutlineTab] = useState('tab-1'); // Active outline tab
    const [pillTab, setPillTab] = useState('tab-1'); // Active pill tab
    const [verticalTab, setVerticalTab] = useState('tab-1'); // Active vertical tab
    const [smallOutlineTab, setSmallOutlineTab] = useState('tab-1'); // Active small outline tab
    const [smallPillTab, setSmallPillTab] = useState('tab-1'); // Active small pill tab
    const [badgeTab, setBadgeTab] = useState('tab-1'); // Active badge sample tab

    return (
        <div className="flex flex-col gap-10 p-5">
            <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[var(--mui-tokens-color-neutral-900)] text-[var(--mui-tokens-fontSize-lg)]">Outline (Default)</h3>
                <CommonTabMenu
                    tabs={SAMPLE_TABS}
                    value={outlineTab}
                    variant="outline"
                    onChange={setOutlineTab}
                />
            </div>
            <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[var(--mui-tokens-color-neutral-900)] text-[var(--mui-tokens-fontSize-lg)]">Pill</h3>
                <CommonTabMenu
                    tabs={SAMPLE_TABS_3}
                    value={pillTab}
                    variant="pill"
                    onChange={setPillTab}
                />
            </div>
            <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[var(--mui-tokens-color-neutral-900)] text-[var(--mui-tokens-fontSize-lg)]">Vertical</h3>
                <CommonTabMenu
                    tabs={SAMPLE_TABS}
                    value={verticalTab}
                    variant="vertical"
                    onChange={setVerticalTab}
                />
            </div>
            <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[var(--mui-tokens-color-neutral-900)] text-[var(--mui-tokens-fontSize-lg)]">Outline - Small</h3>
                <CommonTabMenu
                    size="small"
                    tabs={SAMPLE_TABS_SMALL}
                    value={smallOutlineTab}
                    variant="outline"
                    onChange={setSmallOutlineTab}
                />
            </div>
            <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[var(--mui-tokens-color-neutral-900)] text-[var(--mui-tokens-fontSize-lg)]">Pill - Small</h3>
                <CommonTabMenu
                    size="small"
                    tabs={SAMPLE_TABS_SMALL}
                    value={smallPillTab}
                    variant="pill"
                    onChange={setSmallPillTab}
                />
            </div>
            <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[var(--mui-tokens-color-neutral-900)] text-[var(--mui-tokens-fontSize-lg)]">With Badge & Arrow</h3>
                <CommonTabMenu
                    tabs={SAMPLE_TABS_WITH_BADGE}
                    value={badgeTab}
                    variant="outline"
                    onChange={setBadgeTab}
                />
            </div>
        </div>
    );
}