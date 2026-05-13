import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConversations, fetchMessageHistory, createConversation } from '@/api/messages';
import { fetchProfile } from '@/api/users';
import { ConversationList } from '@/components/features/messages/ConversationList';
import { MessageThread } from '@/components/features/messages/MessageThread';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Conversation, Message, WSMessage } from '@/types';
import styles from './MessagesPage.module.css';

export default function MessagesPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: fetchProfile,
  });

  const { data: conversations = [], refetch: refetchConvos } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: !!profile,
  });

  // Handle new chat from profile page
  useEffect(() => {
    const state = location.state as { newChatUsername?: string } | null;
    if (state?.newChatUsername && conversations.length > 0) {
      const found = conversations.find((c) => c.from === state.newChatUsername);
      if (found) {
        setSelectedConvo(found);
      } else {
        createConversation(state.newChatUsername).then(() => {
          refetchConvos();
        }).catch(() => {});
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations, refetchConvos]);

  const handleNewMessage = useCallback((msg: WSMessage) => {
    if (msg.type !== 'message') return;

    setMessages((prev) => [
      ...prev,
      {
        id: msg.id || crypto.randomUUID(),
        from: msg.from || msg.sender_id || '',
        content: msg.content || '',
        timestamp: msg.created_at || new Date().toISOString(),
      },
    ]);

    // Refresh conversation list for last message update
    refetchConvos();
  }, [refetchConvos]);

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleNewMessage,
  });

  const handleSelectConvo = useCallback(async (convo: Conversation) => {
    setSelectedConvo(convo);
    setMessages([]);
    setHasOlder(false);
    try {
      const history = await fetchMessageHistory(convo.id);
      setMessages(history);
      setHasOlder(history.length >= 50);
    } catch {}
  }, []);

  const handleLoadOlder = useCallback(async () => {
    if (!selectedConvo || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldestId = messages[0].id;
      const older = await fetchMessageHistory(selectedConvo.id, oldestId);
      setMessages((prev) => [...older, ...prev]);
      setHasOlder(older.length >= 50);
    } catch {}
    setLoadingOlder(false);
  }, [selectedConvo, messages]);

  const handleSend = useCallback((content: string) => {
    if (!selectedConvo) return;
    sendMessage({
      type: 'message',
      conversation_id: selectedConvo.id,
      content,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        from: profile?.username || 'me',
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [selectedConvo, sendMessage, profile]);

  return (
    <div className={styles.page}>
      <div className={styles.status}>
        <span className={isConnected ? styles.online : styles.offline} />
        {isConnected ? 'Connected' : 'Reconnecting...'}
      </div>
      <div className={styles.container}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedConvo?.id}
          onSelect={handleSelectConvo}
        />
        <div className={styles.threadArea}>
          {selectedConvo ? (
            <MessageThread
              conversation={selectedConvo}
              messages={messages}
              myUsername={profile?.username || 'me'}
              onSend={handleSend}
              hasOlder={hasOlder}
              loadingOlder={loadingOlder}
              onLoadOlder={handleLoadOlder}
            />
          ) : (
            <div className={styles.noConvo}>
              <p>Select a conversation to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
