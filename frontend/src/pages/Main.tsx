import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, clearTokens } from "@/lib/auth";
import { 
  Home, 
  Search, 
  Compass, 
  MessageCircle,
  Bell,
  Settings, 
  User, 
  LogOut 
} from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", active: true },
  { icon: Search, label: "Search" },
  { icon: Compass, label: "Explore" },
  { icon: MessageCircle, label: "Messages" },
  { icon: Bell, label: "Notifications" },
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
];

const Main = () => {
  const navigate = useNavigate();
  const [posts] = useState([
    { id: 1, author: "Alex Chen", content: "Just shipped a new feature! 🚀", time: "2m ago" },
    { id: 2, author: "Sarah Kim", content: "Beautiful sunset today", time: "15m ago" },
    { id: 3, author: "Mike Johnson", content: "Working on something exciting...", time: "1h ago" },
  ]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    clearTokens();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card p-6">
        <h1 className="mb-8 text-xl font-semibold text-foreground">App</h1>
        
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                item.active 
                  ? "bg-secondary text-foreground" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-lg font-medium text-foreground">Latest Posts</h2>
          
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-muted"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{post.author}</p>
                      <p className="text-xs text-muted-foreground">{post.time}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground/90">{post.content}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Main;
