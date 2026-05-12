import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = '4px' }: SkeletonProps) {
  return <div className={styles.skeleton} style={{ width, height, borderRadius: radius }} />;
}

export function PostSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Skeleton width={36} height={36} radius="50%" />
        <div className={styles.headerText}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={11} />
        </div>
      </div>
      <Skeleton width="100%" height={14} />
      <Skeleton width="70%" height={14} />
    </div>
  );
}
