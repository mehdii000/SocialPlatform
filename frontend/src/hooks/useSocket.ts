import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getTokens } from "@/lib/auth";
import { HOST_URL } from "@/lib/api";

export interface Message {
  id: string;
  from: string;
  content: string;
  timestamp: Date;
  isMine: boolean;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const { jwtToken } = getTokens();
    
    if (!jwtToken) return;

    // Connect to Socket.io server
    socketRef.current = io(HOST_URL, {
      extraHeaders: {
        Authorization: `Bearer ${jwtToken}`
      }
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    // Receiving a global message
    socketRef.current.on("new_msg", (data: { from: string; msg: string }) => {
      console.log("New global message: " + data.msg);
      
      const newMessage: Message = {
        id: `${Date.now()}-${Math.random()}`,
        from: data.from,
        content: data.msg,
        timestamp: new Date(),
        isMine: false
      };
      
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const sendMessage = useCallback((text: string, senderName: string) => {
    if (socketRef.current && isConnected) {
      // Emit 'message' event for global broadcast
      socketRef.current.emit("message", {
        message: text,
        sender: senderName
      });
      
      // Add sent message to local state
      const sentMessage: Message = {
        id: `${Date.now()}-sent`,
        from: "You",
        content: text,
        timestamp: new Date(),
        isMine: true
      };
      
      setMessages(prev => [...prev, sentMessage]);
    }
  }, [isConnected]);

  return {
    isConnected,
    messages,
    sendMessage
  };
};
