import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Compass, MessageCircle, Bell, Settings, Sparkles } from "lucide-react";

// API & Auth Imports
import { fetchProfile, UserProfile, HOST_URL } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

// Component Imports
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";
import ConversationList, { Conversation } from "@/components/messages/ConversationList";
import ChatView, { Message } from "@/components/messages/ChatView";

// Hook Imports
import { useSocket, SocketMessage } from "@/hooks/useSocket";

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
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // Ref to track the active conversation for the socket callback closure
  const selectedConvRef = useRef<Conversation | null>(null);
  useEffect(() => { selectedConvRef.current = selectedConversation; }, [selectedConversation]);

  // 1. INITIAL LOAD: Profile & Auth Check
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }


    const loadInitialData = async () => {
      try {
        const profile = await fetchProfile();
        setUserProfile(profile);
        
        // 1. Fetch real inbox
        const res = await fetch(`${HOST_URL}/api/messages/getconvo?username=${profile.username}`);
        let rawData = await res.json();
        
        // 2. Map real convos
        let mapped: Conversation[] = rawData.map((c: any) => ({
          id: String(c.id),
          recipientId: c.from,
          recipientName: c.from,
          recipientAvatar: c.avatar,
          lastMessage: c.msg || "No messages yet",
          lastMessageTime: c.timestamp ? new Date(c.timestamp) : new Date(),
          unreadCount: 0,
        }));

        // 3. CHECK FOR NEW CHAT REQUEST FROM NAVIGATION
        const navState = location.state as { newChat?: { username: string, avatar: string } };
        
        if (navState?.newChat) {
          const { username, avatar } = navState.newChat;
          
          // Check if we already have a conversation with this person
          const existing = mapped.find(c => c.recipientName === username);
          
          if (existing) {
            // If they exist, just select them
            setSelectedConversation(existing);
          } else {
            // If not, create a "Ghost" conversation at the top of the list
            const ghostConv: Conversation = {
              id: `new-${Date.now()}`, // Temporary ID
              recipientId: username,
              recipientName: username,
              recipientAvatar: avatar,
              lastMessage: "New message...",
              lastMessageTime: new Date(),
              unreadCount: 0,
            };
            mapped = [ghostConv, ...mapped];
            setSelectedConversation(ghostConv);
          }
          
          // Clean up the location state so it doesn't trigger again on refresh
          window.history.replaceState({}, document.title);
        }

        setConversations(mapped);
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };

    loadInitialData();
  }, [navigate]);

  // 2. LOAD HISTORY: When selecting a conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`${HOST_URL}/api/messages/history?conv_id=${selectedConversation.id}`);
        const data = await res.json();
        
        const history: Message[] = data.map((m: any) => ({
          id: String(m.id),
          content: m.content,
          timestamp: new Date(m.timestamp),
          isMine: m.from === userProfile?.username,
        }));
        
        setCurrentMessages(history);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };

    loadHistory();
  }, [selectedConversation, userProfile]);

  // 3. SOCKET CALLBACK: Handle incoming live messages
  const handleNewMessage = useCallback((socketMsg: SocketMessage) => {
    // Update Chat View if the sender is the currently selected user
    if (selectedConvRef.current && socketMsg.from === selectedConvRef.current.recipientName) {
      const newMessage: Message = {
        id: socketMsg.id,
        content: socketMsg.content,
        timestamp: socketMsg.timestamp,
        isMine: false,
      };
      setCurrentMessages((prev) => [...prev, newMessage]);
    }

    // Update Sidebar Preview & Order
    setConversations((prev) => {
      const existingIdx = prev.findIndex(c => c.recipientName === socketMsg.from);
      
      let updatedList = [...prev];
      if (existingIdx > -1) {
        const updatedConv = {
          ...updatedList[existingIdx],
          lastMessage: socketMsg.content,
          lastMessageTime: socketMsg.timestamp,
          unreadCount: selectedConvRef.current?.recipientName === socketMsg.from 
            ? 0 
            : updatedList[existingIdx].unreadCount + 1
        };
        updatedList.splice(existingIdx, 1);
        updatedList.unshift(updatedConv);
      } else {
        // New conversation if they aren't in the list yet
        const newConv: Conversation = {
          id: `temp-${Date.now()}`,
          recipientId: socketMsg.from,
          recipientName: socketMsg.from,
          lastMessage: socketMsg.content,
          lastMessageTime: socketMsg.timestamp,
          unreadCount: 1,
        };
        updatedList.unshift(newConv);
      }
      return updatedList;
    });
  }, []);

  const { isConnected, sendMessage } = useSocket({ onNewMessage: handleNewMessage });

  // 4. ACTION: Send Message
  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversation) return;

    const sentMessage = sendMessage(selectedConversation.recipientName, messageInput);
    
    if (sentMessage) {
      const newMessage: Message = {
        id: sentMessage.id,
        content: sentMessage.content,
        timestamp: sentMessage.timestamp,
        isMine: true,
      };

      setCurrentMessages(prev => [...prev, newMessage]);

      // Update sidebar for your own message
      setConversations(prev => {
        const filtered = prev.filter(c => c.id !== selectedConversation.id);
        const updated = {
          ...selectedConversation,
          lastMessage: newMessage.content,
          lastMessageTime: newMessage.timestamp
        };
        return [updated, ...filtered];
      });
    }

    setMessageInput("");
  }, [messageInput, selectedConversation, sendMessage]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Ambient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl z-40">
        <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
          <img src="/logo/logo.png" alt="Meteor Logo" className="h-9 w-9" />
          <h2 className="text-xl font-bold">Meteor</h2>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                location.pathname === item.path ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-10 left-6 right-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </aside>

      {/* Header */}
      <Header onOpenProfile={() => setProfileOpen(true)} />

      {/* Main Messaging Layout */}
      <main className="relative ml-64 flex-1 pt-16">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Conversation List Sidebar */}
          <div className="w-80 flex-shrink-0">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id ?? null}
              onSelect={setSelectedConversation}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Active Chat View */}
          <ChatView
            conversation={selectedConversation}
            messages={currentMessages}
            messageInput={messageInput}
            onMessageInputChange={setMessageInput}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
          />
        </div>
      </main>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Messages;
