import { Badge, Divider, IconButton, Menu } from '@mui/material';
import { BellIcon } from '@phosphor-icons/react';
import { getUnreadNotificationCount, listMyNotifications, markMyNotificationsRead } from '@services/notification.service';
import { useAppStore } from '@stores/app.store';
import { NotificationRow } from '@type/notification.type';
import { formatDate } from '@utils/date.util';
import { resolveNotificationPath } from '@utils/notification.util';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL_MS = 60000;

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
                    return (
                        <button
                            className={
                                item.is_read
                                    ? 'flex flex-col gap-1 px-4 py-3 text-left w-full hover:bg-black/5'
                                    : 'flex flex-col gap-1 px-4 py-3 text-left w-full bg-(--mui-palette-primary-main)/5 hover:bg-black/5'
                            }
                            key={item.id}
                            type="button"
                            onClick={function() {
                                handleItemClick(item);
                            }}
                        >
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {item.title}
                            </span>
                            <span className="line-clamp-2 text-(--mui-palette-text-secondary) text-xs">
                                {item.message}
                            </span>
                            <span className="text-(--mui-palette-text-disabled) text-xs">
                                {formatDate(new Date(item.created_at))}
                            </span>
                        </button>
                    );
                })}
            </Menu>
        </>
    );
}