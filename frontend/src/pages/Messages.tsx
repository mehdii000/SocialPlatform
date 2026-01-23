import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { 
  Home, 
  Compass, 
  MessageCircle,
  Bell,
  Settings,
  Sparkles
} from "lucide-react";
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";
import ConversationList, { Conversation } from "@/components/messages/ConversationList";
import ChatView, { Message } from "@/components/messages/ChatView";

const navItems = [
  { icon: Home, label: "Home", path: "/main" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Bell, label: "Notifications", path: null },
  { icon: Settings, label: "Settings", path: null },
];

// Demo data for the UI
const demoConversations: Conversation[] = [
  {
    id: "1",
    recipientId: "user1",
    recipientName: "Alex Chen",
    lastMessage: "Hey! Did you see the new update?",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 5),
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: "2",
    recipientId: "user2",
    recipientName: "Sarah Miller",
    lastMessage: "That sounds great, let's do it!",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "3",
    recipientId: "user3",
    recipientName: "Jordan Lee",
    lastMessage: "Thanks for the help yesterday 🙏",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unreadCount: 1,
    isOnline: false,
  },
  {
    id: "4",
    recipientId: "user4",
    recipientName: "Emma Wilson",
    lastMessage: "See you at the event!",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 48),
    unreadCount: 0,
    isOnline: false,
  },
];

const demoMessages: Record<string, Message[]> = {
  "1": [
    { id: "m1", content: "Hey there!", timestamp: new Date(Date.now() - 1000 * 60 * 60), isMine: false },
    { id: "m2", content: "Hi Alex! How are you?", timestamp: new Date(Date.now() - 1000 * 60 * 55), isMine: true },
    { id: "m3", content: "I'm doing great! Working on some cool stuff", timestamp: new Date(Date.now() - 1000 * 60 * 50), isMine: false },
    { id: "m4", content: "That's awesome! What are you building?", timestamp: new Date(Date.now() - 1000 * 60 * 45), isMine: true },
    { id: "m5", content: "Hey! Did you see the new update?", timestamp: new Date(Date.now() - 1000 * 60 * 5), isMine: false },
  ],
  "2": [
    { id: "m1", content: "Want to grab coffee tomorrow?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), isMine: true },
    { id: "m2", content: "That sounds great, let's do it!", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), isMine: false },
  ],
  "3": [
    { id: "m1", content: "Thanks for the help yesterday 🙏", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), isMine: false },
  ],
  "4": [
    { id: "m1", content: "Are you coming to the event?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50), isMine: true },
    { id: "m2", content: "See you at the event!", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), isMine: false },
  ],
};

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>(demoConversations);
  
  // Simulated connection status (will be replaced with real WebSocket)
  const isConnected = true;

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedConversation) {
      setMessages(demoMessages[selectedConversation.id] || []);
      // Mark as read
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id ? { ...conv, unreadCount: 0 } : conv
        )
      );
    }
  }, [selectedConversation]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: messageInput.trim(),
      timestamp: new Date(),
      isMine: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");

    // Update conversation's last message
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation.id
          ? { ...conv, lastMessage: newMessage.content, lastMessageTime: newMessage.timestamp }
          : conv
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Ambient Background Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl z-40">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
          <div className="relative">
            <img src="/logo/logo.png" alt="Meteor Logo" className="h-9 w-9 relative z-10" />
            <div className="absolute inset-0 bg-accent/30 blur-lg rounded-full" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Meteor
          </h2>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                disabled={!item.path}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? "text-accent-foreground" 
                    : item.path 
                      ? "text-muted-foreground hover:text-foreground hover:bg-secondary/50" 
                      : "text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/25" />
                )}
                
                <item.icon className={`relative z-10 h-5 w-5 transition-transform duration-300 ${isActive ? "" : "group-hover:scale-110"}`} />
                <span className="relative z-10">{item.label}</span>
                
                {!isActive && item.path && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-accent/0 transition-all duration-300 group-hover:bg-accent/50" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Decoration */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Meteor v1.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Header */}
      <Header onOpenProfile={() => setProfileOpen(true)} />

      {/* Main Content */}
      <main className="relative ml-64 flex-1 pt-16">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Conversation List */}
          <div className="w-80 flex-shrink-0">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id ?? null}
              onSelect={setSelectedConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Chat View */}
          <ChatView
            conversation={selectedConversation}
            messages={messages}
            messageInput={messageInput}
            onMessageInputChange={setMessageInput}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
          />
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Messages;
