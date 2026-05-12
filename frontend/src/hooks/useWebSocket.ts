import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '@/api/client';
import type { WSMessage } from '@/types';

interface UseWebSocketOptions {
  onMessage?: (msg: WSMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    function connect() {
      const token = getAccessToken();
      if (!token) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/api/messages/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        optionsRef.current?.onConnectionChange?.(true);
      };

      ws.onclose = () => {
        setIsConnected(false);
        optionsRef.current?.onConnectionChange?.(false);
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          optionsRef.current?.onMessage?.(msg);
        } catch {}
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, sendMessage };
}
