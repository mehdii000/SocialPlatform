import { Heart, MessageSquare, Share2, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { likePost, deletePost } from "@/lib/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isDeleting, setIsDeleting] = useState(false);

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
    navigate(`/posts/${post.id}`);
  };

  return (
    <motion.article 
      layout
      onClick={handleCardClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/60 to-accent" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {post.username || `User #${post.user_id}`}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
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
          <DropdownMenuContent align="end">
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
        <div className="mb-4 overflow-hidden rounded-xl bg-muted">
          {post.media_type === 1 ? (
            <img src={post.media_url} alt="Post" className="w-full object-cover max-h-[400px]" />
          ) : (
            <video src={post.media_url} controls className="w-full" />
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
