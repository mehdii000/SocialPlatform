import { Heart, MessageSquare, Share2, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { likePost, deletePost } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getVideoTimestamp, setVideoTimestamp } from "@/lib/videoTimestamps";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export interface Post {
  id: number;
  user_id: number;
  username: string;
  content: string;
  media_url: string | null;
  media_type: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
}

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
}

const PostCard = ({ post, onDeleted }: PostCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore video timestamp on mount
  useEffect(() => {
    if (videoRef.current && post.media_type !== 1) {
      const savedTime = getVideoTimestamp(post.id);
      if (savedTime > 0) {
        videoRef.current.currentTime = savedTime;
      }
    }
  }, [post.id, post.media_type]);

  // Save video timestamp periodically
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoTimestamp(post.id, videoRef.current.currentTime);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !liked;
    setLiked(newState);
    setLikesCount(prev => (newState ? prev + 1 : prev - 1));
    likePost(post.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      toast({ title: "Post deleted successfully" });
      onDeleted?.();
    } catch (error) {
      toast({ title: "Failed to delete post", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    // Save current video time before navigating
    if (videoRef.current) {
      setVideoTimestamp(post.id, videoRef.current.currentTime);
    }
    navigate(`/posts/${post.id}`);
  };

  return (
    <motion.article 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/80 p-5 shadow-lg shadow-black/5 transition-all hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5"
    >
      {/* Subtle decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/10" />
      
      <div className="relative mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-accent/80 to-primary/40 ring-2 ring-accent/20 ring-offset-2 ring-offset-card" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {post.username || `User #${post.user_id}`}
            </p>
            <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-card">
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {post.content && (
        <p className="mb-4 text-sm leading-relaxed text-foreground/90">{post.content}</p>
      )}

      {post.media_url && (
        <div className="mb-4 overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border">
          {post.media_type === 1 ? (
            <img 
              src={post.media_url} 
              alt="Post" 
              className="w-full object-cover max-h-[400px] transition-transform duration-300 group-hover:scale-[1.02]" 
            />
          ) : (
            <video 
              ref={videoRef}
              src={post.media_url} 
              controls 
              className="w-full"
              onTimeUpdate={handleVideoTimeUpdate}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
        <button 
          className={cn(
            "group/like relative flex items-center gap-2 transition-colors",
            liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
          )}
          onClick={handleLike}
        >
          <div className="relative flex items-center justify-center">
            {/* Particle Burst Effect */}
            <AnimatePresence>
              {liked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        x: [0, (i % 2 === 0 ? 1 : -1) * (Math.random() * 30 + 10)],
                        y: [0, (i < 3 ? 1 : -1) * (Math.random() * 30 + 10)],
                        opacity: [1, 1, 0]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute h-1.5 w-1.5 rounded-full bg-rose-500"
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Main Heart Icon */}
            <motion.div
              animate={liked ? {
                scale: [1, 1.5, 0.9, 1.1, 1],
                rotate: [0, 15, -15, 0],
              } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Heart 
                className={cn(
                  "h-5 w-5 transition-all",
                  liked ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                )} 
              />
            </motion.div>
          </div>

          {/* Animated Counter */}
          <motion.span 
            key={likesCount}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("text-xs font-medium", liked && "text-rose-600")}
          >
            {likesCount}
          </motion.span>
        </button>

        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs">{post.comments_count}</span>
        </button>
        
        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-accent">
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </motion.article>
  );
};

export default PostCard;
