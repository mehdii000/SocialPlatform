import { useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { relativeTime } from '@/utils/format';
import type { Conversation } from '@/types';
import styles from './Messages.module.css';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    c.from.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.sidebar}>
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={styles.list}>
        {filtered.map((c) => (
          <button
            key={c.id}
            className={styles.convoItem + (c.id === selectedId ? ' ' + styles.active : '')}
            onClick={() => onSelect(c)}
          >
            <Avatar src={c.avatar} username={c.from} size="md" />
            <div className={styles.convoInfo}>
              <div className={styles.convoTop}>
                <span className={styles.convoName}>{c.from}</span>
                {c.timestamp && <span className={styles.convoTime}>{relativeTime(c.timestamp)}</span>}
              </div>
              <p className={styles.convoMsg}>{c.msg || 'No messages yet'}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className={styles.emptyText}>No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
