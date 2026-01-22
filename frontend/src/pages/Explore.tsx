import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { fetchPosts, HOST_URL } from "@/lib/api";
import { Post } from "@/components/posts/PostCard";
import { 
  Home, 
  Compass, 
  MessageCircle,
  Bell,
  Settings,
  Search, 
  Loader2, 
  Play,
  Sparkles,
  ImageIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { setVideoTimestamp } from "@/lib/videoTimestamps";
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";

const navItems = [
  { icon: Home, label: "Home", path: "/main" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Bell, label: "Notifications", path: null },
  { icon: Settings, label: "Settings", path: null },
];

const Explore = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    const loadPosts = async () => {
      try {
        const data = await fetchPosts();
        // Filter to only show posts with media (images or videos)
        const mediaPosts = data.filter(post => post.media_url);
        setPosts(mediaPosts);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [navigate]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(
      post =>
        post.content.toLowerCase().includes(query) ||
        post.username.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  // Assign random sizes for masonry effect
  const getItemSize = (index: number): "small" | "medium" | "large" => {
    const pattern = [
      "medium", "small", "large", "small", "medium",
      "small", "large", "medium", "small", "small"
    ];
    return pattern[index % pattern.length] as "small" | "medium" | "large";
  };

  const handlePostClick = (post: Post) => {
    if (post.media_type !== 1) {
      setVideoTimestamp(post.id, 0);
    }
    navigate(`/posts/${post.id}`);
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
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Search Bar */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
              <input
                type="text"
                placeholder="Search media posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm py-4 pl-14 pr-6 text-sm placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>

          {/* Section Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" />
              Media Gallery
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Loading media...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No media posts found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "Be the first to share something!"}
              </p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
              {filteredPosts.map((post, index) => (
                <MasonryItem
                  key={post.id}
                  post={post}
                  size={getItemSize(index)}
                  onClick={() => handlePostClick(post)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

interface MasonryItemProps {
  post: Post;
  size: "small" | "medium" | "large";
  onClick: () => void;
  index: number;
}

const MasonryItem = ({ post, size, onClick, index }: MasonryItemProps) => {
  const heightClass = {
    small: "h-48",
    medium: "h-64",
    large: "h-80",
  }[size];

  const isVideo = post.media_type !== 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      onClick={onClick}
      className={`group relative break-inside-avoid mb-4 cursor-pointer overflow-hidden rounded-2xl bg-secondary/30 ${heightClass}`}
    >
      {/* Media */}
      {isVideo && post.media_url ? (
        <div className="relative h-full w-full">
          <video
            src={`${HOST_URL}/api/media/posts/` + post.media_url}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            muted
            loop
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
          <div className="absolute top-3 right-3 flex items-center justify-center h-8 w-8 rounded-full bg-black/60 backdrop-blur-sm">
            <Play className="h-4 w-4 text-white fill-white" />
          </div>
        </div>
      ) : post.media_url ? (
        <img
          src={`${HOST_URL}/api/media/posts/` + post.media_url}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-white/30 bg-accent/60 flex items-center justify-center">
              <span className="text-xs font-bold text-white uppercase">
                {post.username[0]}
              </span>
            </div>
            <span className="text-sm font-medium text-white truncate">
              @{post.username}
            </span>
          </div>
          {post.content && (
            <p className="text-xs text-white/80 line-clamp-2">{post.content}</p>
          )}
        </div>
      </div>

      {/* Border glow on hover */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 group-hover:ring-accent/40 transition-all duration-300 pointer-events-none" />
    </motion.div>
  );
};

export default Explore;
