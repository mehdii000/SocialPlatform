import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, User } from "lucide-react";
import { HOST_URL, UserProfile, Post } from "@/lib/api";
import { setVideoTimestamp } from "@/lib/videoTimestamps";

interface SearchResultsProps {
  users: UserProfile[];
  posts: Post[];
  isLoading: boolean;
  searchQuery: string;
}

const SearchResults = ({ users, posts, isLoading, searchQuery }: SearchResultsProps) => {
  const navigate = useNavigate();

  const handlePostClick = (post: Post) => {
    if (post.media_type !== 1) {
      setVideoTimestamp(post.id, 0);
    }
    navigate(`/posts/${post.id}`);
  };

  const handleUserClick = (username: string) => {
    navigate(`/profiles/${username}`);
  };

  if (!searchQuery.trim()) {
    return null;
  }

  const hasResults = users.length > 0 || posts.length > 0;

  return (
    <div className="space-y-6">
      {/* Users Section */}
      {users.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              People
            </h3>
            <span className="text-xs text-muted-foreground/70">({users.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {users.map((user, index) => (
              <motion.button
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleUserClick(user.username)}
                className="group flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50 hover:border-accent/30 hover:bg-secondary/50 transition-all text-left"
              >
                {user.profile_picture_url ? (
                  <img
                    src={`${HOST_URL}/api/media/pfps/${user.profile_picture_url}`}
                    alt={user.username}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-border/50 group-hover:ring-accent/30 transition-all"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center ring-2 ring-border/50">
                    <span className="text-sm font-bold text-accent-foreground uppercase">
                      {user.username[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.bio}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Posts Section */}
      {posts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Play className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Posts
            </h3>
            <span className="text-xs text-muted-foreground/70">({posts.length})</span>
          </div>
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {posts.map((post, index) => (
              <MediaItem
                key={post.id}
                post={post}
                onClick={() => handlePostClick(post)}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !hasResults && searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      )}
    </div>
  );
};

interface MediaItemProps {
  post: Post;
  onClick: () => void;
  index: number;
}

const MediaItem = ({ post, onClick, index }: MediaItemProps) => {
  const isVideo = post.media_type !== 1;
  const heights = ["h-48", "h-56", "h-64", "h-72"];
  const heightClass = heights[index % heights.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      onClick={onClick}
      className={`group relative break-inside-avoid mb-4 cursor-pointer overflow-hidden rounded-2xl bg-secondary/30 ${heightClass}`}
    >
      {/* Media */}
      {post.media_url ? (
        isVideo ? (
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
        ) : (
          <img
            src={`${HOST_URL}/api/media/posts/` + post.media_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-secondary/50 p-4">
          <p className="text-sm text-muted-foreground line-clamp-4 text-center">
            {post.content}
          </p>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-full overflow-hidden ring-2 ring-white/30 bg-accent/60 flex items-center justify-center">
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

export default SearchResults;
