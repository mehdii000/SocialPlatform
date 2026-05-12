import { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/utils/format';
import type { Message, Conversation } from '@/types';
import styles from './Messages.module.css';

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  myUsername: string;
  onSend: (content: string) => void;
  typingUsers?: string[];
}

export function MessageThread({ conversation, messages, myUsername, onSend, typingUsers = [] }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const val = inputRef.current?.value.trim();
    if (val) {
      onSend(val);
      inputRef.current!.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.thread}>
      <div className={styles.threadHeader}>
        <Avatar src={conversation.avatar} username={conversation.from} size="sm" />
        <span className={styles.threadName}>{conversation.from}</span>
      </div>

      <div className={styles.messages}>
        {messages.map((m, i) => {
          const isMine = m.from === myUsername;
          const showDate = i === 0 || m.timestamp !== messages[i - 1].timestamp;
          return (
            <div key={m.id}>
              {showDate && <div className={styles.dateSep}>{formatDate(m.timestamp)}</div>}
              <div className={clsx(styles.msgRow, isMine && styles.msgMine)}>
                <div className={clsx(styles.msgBubble, isMine && styles.msgBubbleMine)}>
                  <span className={styles.msgSender}>{m.from}</span>
                  <p className={styles.msgContent}>{m.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <p className={styles.typing}>{typingUsers.join(', ')} typing...</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={styles.msgInput}
          placeholder="Type a message..."
          onKeyDown={handleKeyDown}
        />
        <button className={styles.sendBtn} onClick={handleSend}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
