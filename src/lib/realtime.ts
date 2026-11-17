'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, session } from './api';

let socket: Socket | null = null;

/** One shared Socket.IO connection to the API's /realtime namespace (push-only events). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${new URL(API_URL).origin}/realtime`, {
      auth: (cb) => cb({ token: session.access }),
      transports: ['websocket'],
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.close();
  socket = null;
}

/** Subscribe to a realtime event for the lifetime of a component. */
export function useRealtime<T = unknown>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    const fn = (p: T) => ref.current(p);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}
