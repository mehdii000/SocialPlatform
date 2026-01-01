import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { 
  Home, 
  Search, 
  Compass, 
  MessageCircle,
  Bell,
  Settings,
  Heart,
  MessageSquare,
  Share2,
  MoreHorizontal
} from "lucide-react";
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";

const navItems = [
  { icon: Home, label: "Home", active: true },
  { icon: Search, label: "Search" },
  { icon: Compass, label: "Explore" },
  { icon: MessageCircle, label: "Messages" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Settings" },
];

const Main = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [posts] = useState([
    { 
      id: 1, 
      author: "Alex Chen", 
      handle: "@alexchen",
      avatar: null,
      content: "Just shipped a new feature! The team worked incredibly hard on this one. Can't wait to see what everyone thinks 🚀", 
      time: "2m ago",
      likes: 42,
      comments: 8,
    },
    { 
      id: 2, 
      author: "Sarah Kim", 
      handle: "@sarahkim",
      avatar: null,
      content: "Beautiful sunset today. Sometimes you just need to stop and appreciate the little things in life ✨", 
      time: "15m ago",
      likes: 128,
      comments: 23,
    },
    { 
      id: 3, 
      author: "Mike Johnson", 
      handle: "@mikej",
      avatar: null,
      content: "Working on something exciting... Stay tuned for the big reveal next week!", 
      time: "1h ago",
      likes: 67,
      comments: 12,
    },
  ]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <img src="/res/logo.png" alt="Meteor Logo" className="h-8 w-8" />
          <h2 className="text-xl font-bold text-foreground">Meteor</h2>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                item.active 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Header */}
      <Header onOpenProfile={() => setProfileOpen(true)} />

      {/* Main Content */}
      <main className="ml-64 flex-1 pt-16">
        <div className="mx-auto max-w-2xl p-6">
          {/* Create Post */}
          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/60 to-accent" />
              <input
                type="text"
                placeholder="What's on your mind?"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/60 to-accent" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{post.author}</p>
                      <p className="text-xs text-muted-foreground">{post.handle} · {post.time}</p>
                    </div>
                  </div>
                  <button className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                
                <p className="mb-4 text-sm leading-relaxed text-foreground/90">{post.content}</p>
                
                <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-rose-500">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-accent">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Main;
