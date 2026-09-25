import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllExpenseData } from './api';

export function useWebSocketSync() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);

  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // If running through Vite proxy or standard web server:
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          backoffRef.current = 1000;
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'expense_changed') {
              await invalidateAllExpenseData(qc);
            }
          } catch {
            // non-json or ping
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!unmounted) {
            reconnectTimeoutRef.current = setTimeout(() => {
              backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
              connect();
            }, backoffRef.current);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!unmounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [qc]);
}
