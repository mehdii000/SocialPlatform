import { Search, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HOST_URL } from "@/lib/api";

export interface Conversation {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: ConversationListProps) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000 * 60) return "Now";
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m`;
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col border-r border-border/50 bg-card/20">
      {/* Search */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-secondary/50 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Start a conversation from a user's profile
            </p>
          </div>
        ) : (
          filteredConversations.map((conv, index) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-all hover:bg-secondary/50",
                selectedId === conv.id && "bg-secondary/80"
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {conv.recipientAvatar ? (
                  <img
                    src={`${HOST_URL}/api/media/pfps/${conv.recipientAvatar}`}
                    alt={conv.recipientName}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-border/50"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center ring-2 ring-border/50">
                    <span className="text-sm font-bold text-accent-foreground uppercase">
                      {conv.recipientName[0]}
                    </span>
                  </div>
                )}
                {conv.isOnline && (
                  <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 text-green-500 stroke-background stroke-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground truncate">
                    {conv.recipientName}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatTime(conv.lastMessageTime)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {conv.lastMessage}
                </p>
              </div>

              {/* Unread Badge */}
              {conv.unreadCount > 0 && (
                <div className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-xs font-bold text-accent-foreground">
                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                  </span>
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
