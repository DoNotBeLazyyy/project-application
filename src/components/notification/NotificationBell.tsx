import { resolveNotificationVisual } from '@constants/notification.constant';
import { Badge, Divider, IconButton, Menu } from '@mui/material';
import { BellIcon } from '@phosphor-icons/react';
import {
    getUnreadNotificationCount,
    listMyNotifications,
    markMyNotificationsRead,
    markMyNotificationsUnread
} from '@services/notification.service';
import { useAppStore } from '@stores/app.store';
import { NotificationRow } from '@type/notification.type';
import { formatDate } from '@utils/date.util';
import { resolveNotificationPath } from '@utils/notification.util';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL_MS = 60000;

const ROW_BASE_CLASS = 'border-l-4 flex gap-3 px-4 py-3 text-left transition-colors w-full';
const ICON_BASE_CLASS = 'flex h-9 items-center justify-center mt-0.5 rounded-full shrink-0 w-9';
const CATEGORY_LABEL_CLASS = 'font-semibold text-[11px] tracking-wide truncate uppercase';
const STATE_PILL_CLASS = 'font-semibold h-fit mt-1 px-2 py-0.5 rounded-full self-start shrink-0 text-[10px] tracking-wide transition-colors uppercase';

const UNREAD_ROW_CLASS = 'bg-(--mui-palette-primary-main)/10 border-(--mui-palette-primary-main) hover:bg-(--mui-palette-primary-main)/20';
const READ_ROW_CLASS = 'bg-transparent border-transparent hover:bg-black/8';

function resolveRowStateClass(isRead: boolean): string {
    return isRead
        ? READ_ROW_CLASS
        : UNREAD_ROW_CLASS;
}

export default function NotificationBell() {
    const navigate = useNavigate();
    const activeRole = useAppStore((state) => state.activeRole);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [count, setCount] = useState(0);
    const [items, setItems] = useState<NotificationRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isOpen = Boolean(anchorEl);

    async function refreshCount() {
        const result = await getUnreadNotificationCount();

        if (typeof result.data === 'number') {
            setCount(result.data);
        }
    }

    useEffect(function() {
        refreshCount();

        const timer = window.setInterval(refreshCount, POLL_INTERVAL_MS);

        return function() {
            window.clearInterval(timer);
        };
    }, []);

    async function loadItems() {
        setIsLoading(true);

        const result = await listMyNotifications(1, 8, false);

        if (result.data) {
            setItems(result.data.content);
        }

        setIsLoading(false);
    }

    function handleOpen(event: React.MouseEvent<HTMLElement>) {
        setAnchorEl(event.currentTarget);
        loadItems();
    }

    function handleClose() {
        setAnchorEl(null);
    }

    async function handleItemClick(item: NotificationRow) {
        if (!item.is_read) {
            await markMyNotificationsRead([item.id]);
            await refreshCount();
        }

        handleClose();

        const target = resolveNotificationPath(item.action_url, activeRole);

        if (target) {
            navigate(target);
        }
    }

    async function handleToggleRead(item: NotificationRow) {
        if (item.is_read) {
            await markMyNotificationsUnread([item.id]);
        }
        else {
            await markMyNotificationsRead([item.id]);
        }

        const nextReadAt = item.is_read
            ? null
            : new Date()
                .toISOString();

        setItems(function(current) {
            return current.map(function(row) {
                return row.id === item.id
                    ? { ...row, is_read: !item.is_read, read_at: nextReadAt }
                    : row;
            });
        });

        await refreshCount();
    }

    async function handleMarkAll() {
        await markMyNotificationsRead(null);
        await refreshCount();
        await loadItems();
    }

    return (
        <>
            <IconButton
                size="small"
                sx={{ color: 'var(--mui-tokens-color-common-white)' }}
                onClick={handleOpen}
            >
                <Badge badgeContent={count} color="error" max={99}>
                    <BellIcon size={20} weight="fill" />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                open={isOpen}
                slotProps={{ paper: { sx: { maxHeight: 420, width: 360 } } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                onClose={handleClose}
            >
                <div className="flex items-center justify-between px-4 py-2">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                        Notifications
                    </span>
                    {count > 0 && (
                        <button
                            className="text-(--mui-palette-primary-main) text-xs"
                            type="button"
                            onClick={handleMarkAll}
                        >
                            Mark all read
                        </button>
                    )}
                </div>
                <Divider />
                {isLoading && (
                    <p className="px-4 py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                        Loading...
                    </p>
                )}
                {!isLoading && items.length === 0 && (
                    <p className="px-4 py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                        You have no notifications.
                    </p>
                )}
                {!isLoading && items.map(function(item) {
                    const visual = resolveNotificationVisual(item.notification_type);
                    const VisualIcon = visual.icon;

                    return (
                        <div
                            className={`${ROW_BASE_CLASS} ${resolveRowStateClass(item.is_read)}`}
                            key={item.id}
                        >
                            <button
                                className="flex flex-1 gap-3 min-w-0 text-left"
                                type="button"
                                onClick={function() {
                                    handleItemClick(item);
                                }}
                            >
                                <span
                                    aria-hidden="true"
                                    className={
                                        item.is_read
                                            ? `${ICON_BASE_CLASS} bg-black/5 text-(--mui-palette-text-disabled)`
                                            : `${ICON_BASE_CLASS} ${visual.backgroundClass} ${visual.colorClass}`
                                    }
                                >
                                    <VisualIcon size={18} weight="fill" />
                                </span>
                                <span className="flex flex-1 flex-col gap-1 min-w-0">
                                    <span
                                        className={
                                            item.is_read
                                                ? `${CATEGORY_LABEL_CLASS} text-(--mui-palette-text-secondary)`
                                                : `${CATEGORY_LABEL_CLASS} ${visual.colorClass}`
                                        }
                                    >
                                        {visual.label}
                                    </span>
                                    <span
                                        className={
                                            item.is_read
                                                ? 'font-normal text-(--mui-palette-text-secondary) text-sm'
                                                : 'font-semibold text-(--mui-palette-text-primary) text-sm'
                                        }
                                    >
                                        {item.title}
                                    </span>
                                    <span
                                        className={
                                            item.is_read
                                                ? 'line-clamp-2 text-(--mui-palette-text-disabled) text-xs'
                                                : 'line-clamp-2 text-(--mui-palette-text-secondary) text-xs'
                                        }
                                    >
                                        {item.message}
                                    </span>
                                    <span className="text-(--mui-palette-text-disabled) text-xs">
                                        {formatDate(new Date(item.created_at))}
                                    </span>
                                </span>
                            </button>
                            <button
                                aria-label={
                                    item.is_read
                                        ? 'Mark as unread'
                                        : 'Mark as read'
                                }
                                className={
                                    item.is_read
                                        ? `${STATE_PILL_CLASS} bg-black/8 text-(--mui-palette-text-secondary) hover:bg-black/16`
                                        : `${STATE_PILL_CLASS} bg-(--mui-palette-primary-main) text-white hover:bg-(--mui-palette-primary-dark)`
                                }
                                title={
                                    item.is_read
                                        ? 'Mark as unread'
                                        : 'Mark as read'
                                }
                                type="button"
                                onClick={function() {
                                    handleToggleRead(item);
                                }}
                            >
                                {item.is_read
                                    ? 'Read'
                                    : 'Unread'}
                            </button>
                        </div>
                    );
                })}
            </Menu>
        </>
    );
}