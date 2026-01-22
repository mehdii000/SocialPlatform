import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { 
  Home, 
  Compass, 
  MessageCircle,
  Bell,
  Settings,
  Send,
  Circle,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { fetchProfile, UserProfile } from "@/lib/api";

const navItems = [
  { icon: Home, label: "Home", path: "/main" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Bell, label: "Notifications", path: null },
  { icon: Settings, label: "Settings", path: null },
];

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const { isConnected, messages, sendMessage } = useSocket();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
    fetchProfile()
      .then(setProfile)
      .catch(console.error);
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessage(
      messageInput.trim(),
      profile.username
    );
    setMessageInput("");
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000 * 60) return "Just now";
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m ago`;
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h ago`;
    return date.toLocaleDateString();
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

        {/* Connection Status */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className={cn("h-2 w-2 fill-current", isConnected ? "text-green-500" : "text-red-500")} />
              <span>{isConnected ? "Connected" : "Connecting..."}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Header */}
      <Header onOpenProfile={() => setProfileOpen(true)} />

      {/* Main Content */}
      <main className="relative ml-64 flex-1 pt-16">
        <div className="flex h-[calc(100vh-4rem)] flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Global Chat</h3>
                <p className="text-xs text-muted-foreground">Everyone can see these messages</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className={cn("h-2 w-2 fill-current", isConnected ? "text-green-500" : "text-red-500")} />
              <span>{isConnected ? "Live" : "Connecting..."}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <MessageCircle className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground">Be the first to say something!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn("flex", msg.isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5",
                      msg.isMine
                        ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-br-md"
                        : "bg-secondary/80 text-foreground rounded-bl-md"
                    )}
                  >
                    {!msg.isMine && (
                      <p className="text-xs font-medium text-muted-foreground mb-1">{msg.from}</p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      msg.isMine ? "text-accent-foreground/70" : "text-muted-foreground"
                    )}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Type a message to everyone..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="w-full rounded-xl border border-border/50 bg-secondary/50 py-3 px-4 text-sm placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || !isConnected}
                className="p-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Messages;
