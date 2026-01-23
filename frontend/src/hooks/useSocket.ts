import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getTokens } from "@/lib/auth";
import { HOST_URL } from "@/lib/api";

export interface SocketMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  isMine: boolean;
}

interface UseSocketOptions {
  onNewMessage?: (message: SocketMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useSocket = (options?: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);

  useEffect(() => { optionsRef.current = options; }, [options]);

  useEffect(() => {
    const { jwtToken } = getTokens();
    if (!jwtToken) return;

    socketRef.current = io(HOST_URL, {
      extraHeaders: { Authorization: `Bearer ${jwtToken}` },
      reconnection: true,
    });

    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => setIsConnected(false));

    // Handle Incoming Message
    socketRef.current.on("new_msg", (data: { from: string; to: string; msg: string; timestamp: string }) => {
      const newMessage: SocketMessage = {
        id: `msg-${Date.now()}`,
        from: data.from,
        to: data.to,
        content: data.msg,
        timestamp: new Date(data.timestamp), // Use database timestamp
        isMine: false
      };
      optionsRef.current?.onNewMessage?.(newMessage);
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);

  const sendMessage = useCallback((recipientId: string, message: string): SocketMessage | null => {
    if (!socketRef.current?.connected) return null;

    socketRef.current.emit("private_message", {
      to: recipientId,
      message: message.trim()
    });

    return {
      id: `sent-${Date.now()}`,
      from: "You",
      to: recipientId,
      content: message.trim(),
      timestamp: new Date(),
      isMine: true
    };
  }, []);

  return { isConnected, sendMessage, socket: socketRef.current };
};
