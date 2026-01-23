import { useRef, useEffect } from "react";
import { Send, Phone, Video, MoreVertical, Circle, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HOST_URL } from "@/lib/api";
import { Conversation } from "./ConversationList";

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isMine: boolean;
  status?: "sent" | "delivered" | "read";
}

interface ChatViewProps {
  conversation: Conversation | null;
  messages: Message[];
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  isConnected: boolean;
}

const ChatView = ({
  conversation,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  isConnected,
}: ChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages: { date: Date; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    const msgDate = new Date(msg.timestamp).toDateString();

    if (lastGroup && new Date(lastGroup.date).toDateString() === msgDate) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({
        date: new Date(msg.timestamp),
        messages: [msg],
      });
    }
  });

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
        <div className="h-24 w-24 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
          <MessageCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Select a conversation
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a conversation from the left to start messaging, or find someone
          new to chat with from the Explore page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {conversation.recipientAvatar ? (
            <img
              src={`${HOST_URL}/api/media/pfps/${conversation.recipientAvatar}`}
              alt={conversation.recipientName}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-border/50"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground uppercase">
                {conversation.recipientName[0]}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-medium text-foreground">
              {conversation.recipientName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Circle
                className={cn(
                  "h-2 w-2 fill-current",
                  conversation.isOnline ? "text-green-500" : "text-muted-foreground"
                )}
              />
              <span>{conversation.isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <Phone className="h-5 w-5" />
          </button>
          <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <Video className="h-5 w-5" />
          </button>
          <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Separator */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground px-2">
                {formatDateSeparator(group.date)}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {group.messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn("flex", msg.isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                      msg.isMine
                        ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-br-md"
                        : "bg-secondary/80 text-foreground rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.isMine ? "text-accent-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={`Message ${conversation.recipientName}...`}
              value={messageInput}
              onChange={(e) => onMessageInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSendMessage()}
              className="w-full rounded-xl border border-border/50 bg-secondary/50 py-3 px-4 text-sm placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={onSendMessage}
            disabled={!messageInput.trim() || !isConnected}
            className="p-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        {!isConnected && (
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5">
            <Circle className="h-2 w-2 fill-current" />
            Reconnecting...
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatView;
