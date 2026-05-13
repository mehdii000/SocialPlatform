import { TrendingUp } from 'lucide-react';
import type { TrendingTopic } from '@/types';
import styles from './TrendingTopics.module.css';

interface TrendingTopicsProps {
  topics: TrendingTopic[];
  onTopicClick: (slug: string) => void;
}

export function TrendingTopics({ topics, onTopicClick }: TrendingTopicsProps) {
  return (
    <div className={styles.list}>
      {topics.slice(0, 8).map((t, i) => (
        <button key={t.slug} className={styles.item} onClick={() => onTopicClick(t.slug)}>
          <span className={styles.rank}>{i + 1}</span>
          <div className={styles.info}>
            <span className={styles.name}>{t.name}</span>
            <span className={styles.meta}>
              {t.post_velocity} recent posts
            </span>
          </div>
          <div className={styles.velocity}>
            <TrendingUp size={12} />
            <span>{Math.round(t.score)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
