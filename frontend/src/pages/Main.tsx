import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { fetchPosts, Post } from "@/lib/api";
import { 
  Home, 
  Search, 
  Compass, 
  MessageCircle,
  Bell,
  Settings,
  Loader2,
  Sparkles
} from "lucide-react";
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";
import CreatePost from "@/components/posts/CreatePost";
import PostCard from "@/components/posts/PostCard";
import FlavorsSection from "@/components/flavors/FlavorsSection";

const navItems = [
  { icon: Home, label: "Home", path: "/main" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Bell, label: "Notifications", path: null },
  { icon: Settings, label: "Settings", path: null },
];

const Main = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPosts = async () => {
    try {
      const data = await fetchPosts();
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
    } else {
      loadPosts();
    }
  }, [navigate]);

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
                {/* Active Background */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent to-accent/80 shadow-lg shadow-accent/25" />
                )}
                
                <item.icon className={`relative z-10 h-5 w-5 transition-transform duration-300 ${isActive ? "" : "group-hover:scale-110"}`} />
                <span className="relative z-10">{item.label}</span>
                
                {/* Hover Indicator */}
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
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex gap-8">
            {/* Posts Section */}
            <div className="flex-1 max-w-2xl">
              {/* Create Post */}
              <div className="mb-8">
                <CreatePost onPostCreated={loadPosts} />
              </div>

              {/* Section Header */}
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest Posts</span>
                <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
              </div>

              {/* Posts */}
              <div className="space-y-5">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 animate-spin text-accent" />
                      <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">Loading posts...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 backdrop-blur-sm p-12 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium">No posts yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Be the first to share something!</p>
                  </div>
                ) : (
                  posts.map((post) => <PostCard key={post.id} post={post} onDeleted={loadPosts} />)
                )}
              </div>
            </div>

            {/* Flavors Section - Right Sidebar */}
            <aside className="w-72 hidden lg:block sticky top-24 h-fit">
              <FlavorsSection />
            </aside>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default Main;
