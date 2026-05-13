import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import styles from './TopicTag.module.css';

interface TopicTagProps {
  slug: string;
  name: string;
  removable?: boolean;
  onRemove?: (slug: string) => void;
}

export function TopicTag({ slug, name, removable, onRemove }: TopicTagProps) {
  const navigate = useNavigate();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/topics/${slug}`);
  }, [navigate, slug]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(slug);
  }, [onRemove, slug]);

  return (
    <span className={styles.tag} onClick={handleClick}>
      {name}
      {removable && (
        <button className={styles.remove} onClick={handleRemove} aria-label={`Remove ${name}`}>
          <X size={10} />
        </button>
      )}
    </span>
  );
}
