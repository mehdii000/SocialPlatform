import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Compass, TrendingUp, Hash } from 'lucide-react';
import { fetchTopics, fetchTrendingTopics, fetchInterests } from '@/api/resonance';
import { TrendingTopics } from '@/components/features/topics/TrendingTopics';
import { TopicGraph } from '@/components/features/topics/TopicGraph';
import { TopicTag } from '@/components/ui/TopicTag';
import styles from './ExplorePage.module.css';

export default function ExplorePage() {
  const navigate = useNavigate();

  const { data: allTopics } = useQuery({
    queryKey: ['topics'],
    queryFn: fetchTopics,
    staleTime: 60_000,
  });

  const { data: trending } = useQuery({
    queryKey: ['trendingTopics'],
    queryFn: fetchTrendingTopics,
    staleTime: 30_000,
  });

  const { data: interests } = useQuery({
    queryKey: ['interests'],
    queryFn: fetchInterests,
    staleTime: 30_000,
  });

  const handleTopicClick = useCallback((slug: string) => {
    navigate(`/topics/${slug}`);
  }, [navigate]);

  const interestSlugs = new Set(interests?.data?.map(i => i.slug) ?? []);
  const recommendedTopics = (allTopics?.data ?? []).filter(t => !interestSlugs.has(t.slug)).slice(0, 6);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Compass size={36} className={styles.heroIcon} />
        <h1>Explore Topics</h1>
        <p>Discover content that matches your interests</p>
      </div>

      {trending?.data && trending.data.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <TrendingUp size={18} />
            <h2>Trending</h2>
          </div>
          <TrendingTopics topics={trending.data} onTopicClick={handleTopicClick} />
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <TrendingUp size={18} />
          <h2>Interest Graph</h2>
        </div>
        <TopicGraph />
      </section>

      {recommendedTopics.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Compass size={18} />
            <h2>Recommended for You</h2>
          </div>
          <div className={styles.topicGrid}>
            {recommendedTopics.map((t) => (
              <button key={t.slug} className={styles.topicCard} onClick={() => handleTopicClick(t.slug)}>
                <Hash size={16} />
                <div className={styles.topicInfo}>
                  <span className={styles.topicName}>{t.name}</span>
                  <span className={styles.topicCount}>{t.post_count} posts</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Hash size={18} />
          <h2>All Topics</h2>
        </div>
        <div className={styles.tagCloud}>
          {(allTopics?.data ?? []).map((t) => (
            <TopicTag key={t.slug} slug={t.slug} name={t.name} />
          ))}
        </div>
      </section>
    </div>
  );
}
