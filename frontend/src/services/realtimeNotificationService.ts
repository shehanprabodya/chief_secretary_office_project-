import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { api } from '../lib/axios';
import type { AppNotification } from '../types/notification';

type NotificationCreatedEvent = {
  notification: AppNotification;
  user_id: number;
};

let echoClient: Echo<'reverb'> | null = null;

function getEchoClient(): Echo<'reverb'> {
  if (echoClient) {
    return echoClient;
  }

  const key = import.meta.env.VITE_REVERB_APP_KEY;
  const host = import.meta.env.VITE_REVERB_HOST ?? window.location.hostname;
  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);
  const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER ?? 'mt1';

  if (!key) {
    throw new Error('Realtime notifications are not configured.');
  }

  echoClient = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const { data } = await api.post('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
          });

          callback(null, data);
        } catch (error) {
          callback(error as Error, null);
        }
      },
    }),
    client: new Pusher(key, {
      cluster,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
    }),
  });

  return echoClient;
}

export const realtimeNotificationService = {
  subscribe(userId: number, onCreated: (event: NotificationCreatedEvent) => void): () => void {
    const echo = getEchoClient();
    const channelName = `users.${userId}`;

    const channel = echo.private(channelName);
    channel.listen('.notification.created', onCreated);

    return () => {
      echo.leave(channelName);
    };
  },
};
