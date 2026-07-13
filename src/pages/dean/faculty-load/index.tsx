import CommonSelect from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { ChalkboardTeacherIcon, WarningIcon } from '@phosphor-icons/react';
import { useFacultyLoadTableConfig } from '@pages/dean/faculty-load/hooks/useFacultyLoadTableConfig';
import { useTermOptions } from '@pages/dean/faculty-load/hooks/useTermOptions';
import ScheduleConflictsPanel from '@pages/dean/faculty-load/ScheduleConflictsPanel';
import { listFacultyLoad } from '@services/faculty-load.service';
import { ChangeEventInputTextarea } from '@type/common.type';
import { FacultyLoadRow } from '@type/faculty-load.type';
import { SortStringDto } from '@type/http.type';
import { SyntheticEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type FacultyLoadTab = 'load' | 'conflicts';

export default function FacultyLoadManagement() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<FacultyLoadTab>('load');
    const [termId, setTermId] = useState('');

    const { termOptions } = useTermOptions();
    const { columnDefs } = useFacultyLoadTableConfig();

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as FacultyLoadTab);
    }

    function handleTermChange(event: ChangeEventInputTextarea) {
        setTermId(event.target.value);
    }

    async function fetchFacultyLoad(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listFacultyLoad(page, size, search, sort, { term_id: termId });
    }

    function handleRowClick(facultyId: string) {
        navigate(`/dean/faculty-load/${facultyId}${termId
            ? `?termId=${termId}`
            : ''}`);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Faculty Load
                    </h1>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Teaching load per faculty member and any schedule conflicts across sections.
                    </p>
                </div>
                <div className="flex flex-col gap-1 max-w-xs">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Term
                    </span>
                    <CommonSelect
                        fullWidth
                        options={termOptions}
                        size="small"
                        value={termId}
                        variant="outlined"
                        onChange={handleTermChange}
                    />
                </div>
                <CommonTabMenu
                    menuStyle="outline"
                    tabs={[
                        {
                            icon: <ChalkboardTeacherIcon />,
                            label: 'Load',
                            value: 'load'
                        },
                        {
                            icon: <WarningIcon />,
                            label: 'Conflicts',
                            value: 'conflicts'
                        }
                    ]}
                    value={activeTab}
                    onChange={handleTabChange}
                />
            </div>

            <div className="flex-1 min-h-0">
                {activeTab === 'load' && (
                    <CommonTableCard<FacultyLoadRow>
                        cardHeaderProps={{
                            subheader: 'Select a faculty member to see their sections and meeting times.',
                            title: 'Teaching Load'
                        }}
                        dependencies={[termId]}
                        tableProps={{
                            leadingColumnDefs: columnDefs
                        }}
                        uniqueIdKey="id"
                        onFetch={fetchFacultyLoad}
                        onRowClick={handleRowClick}
                    />
                )}

                {activeTab === 'conflicts' && (
                    <ScheduleConflictsPanel termId={termId} />
                )}
            </div>
        </div>
    );
}