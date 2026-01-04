import { Heart, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { likePost } from "@/lib/api";
import { useState } from "react";

export interface Post {
  id: number;
  user_id: number;
  username: string;
  content: string;
  media_url: string | null;
  media_type: number | 0; // 0 = none, 1 = image, 2 = video
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean | false;
}

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  return (
    <article className="group rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
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
        <button className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-secondary group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {post.content && (
        <p className="mb-4 text-sm leading-relaxed text-foreground/90">{post.content}</p>
      )}

      {post.media_url && post.media_type === 1 && (
        <div className="mb-4 overflow-hidden rounded-xl">
          <img
            src={post.media_url}
            alt="Post media"
            className="w-full object-cover"
          />
        </div>
      )}

      {post.media_url && post.media_type === 2 && (
        <div className="mb-4 overflow-hidden rounded-xl">
          <video src={post.media_url} controls className="w-full" />
        </div>
      )}

      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-rose-500">
          <Heart className="h-4 w-4" onClick={
            () => {
              if (!liked) {
                setLiked(true);
                setLikesCount(likesCount + 1);
                likePost(post.id);
              } else {
                setLiked(false);
                setLikesCount(likesCount - 1);
                likePost(post.id);
              }
            
            }
          } 
          />
          <span className="text-xs">{likesCount}</span>
        </button>
        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs">{post.comments_count}</span>
        </button>
        <button className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-accent">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
};

export default PostCard;
