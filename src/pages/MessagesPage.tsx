import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { MessageCircle, Send, Search, Plus, Check, CheckCheck, X, Users, Paperclip, File, Download, ArrowLeft } from 'lucide-react';
import { OnNavigate } from '../types/navigation';
import { RealtimeChannel } from '@supabase/supabase-js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '11px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none' };

interface Conversation {
  id: string;
  title: string | null;
  is_group: boolean;
  last_message_at: string;
  last_message: string | null;
  unread_count: number;
  other_user: {
    id: string;
    handle: string;
    avatar_url: string | null;
  } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  attachment_name?: string | null;
  created_at: string;
  read_at: string | null;
  sender?: {
    handle: string;
    avatar_url: string | null;
  };
}

interface Follower {
  id: string;
  handle: string;
  avatar_url: string | null;
  car_make?: string;
  car_model?: string;
}

interface MessagesPageProps {
  onNavigate: OnNavigate;
  recipientId?: string;
}

export default function MessagesPage({ onNavigate, recipientId }: MessagesPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Follower[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [attachment, setAttachment] = useState<globalThis.File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async function loadConversations() {
    if (!user) return;

    try {
      const { data: userConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!userConversations || userConversations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = userConversations.map(c => c.conversation_id);
      const { data: conversationData } = await supabase
        .from('conversations')
        .select('id, title, is_group, last_message_at, created_by')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (!conversationData) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const enrichedConversations = await Promise.all(
        conversationData.map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id;

          let otherUser = null;
          if (otherUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, handle, avatar_url')
              .eq('id', otherUserId)
              .maybeSingle();
            otherUser = profile;
          }

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .gt('created_at', userConversations.find(uc => uc.conversation_id === conv.id)?.last_read_at || '1970-01-01');

          return {
            id: conv.id,
            title: conv.title,
            is_group: conv.is_group,
            last_message_at: conv.last_message_at,
            last_message: lastMsg?.content || null,
            unread_count: unreadMessages?.length || 0,
            other_user: otherUser
          };
        })
      );

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async function loadMessages(conversationId: string) {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, image_url, attachment_url, attachment_type, attachment_size, attachment_name, created_at, read_at')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (!data) {
        setMessages([]);
        return;
      }

      const enrichedMessages = await Promise.all(
        data.map(async (msg) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('handle, avatar_url')
            .eq('id', msg.sender_id)
            .maybeSingle();

          return {
            ...msg,
            sender: sender || undefined
          };
        })
      );

      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [user]);

  const markAsRead = useCallback(async function markAsRead(conversationId: string) {
    if (!user) return;

    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  const searchUsers = useCallback(async function searchUsers(query: string) {
    if (!user || !query.trim()) return;

    setSearchingUsers(true);
    try {
      const searchTerm = query.trim().replace(/^@/, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url')
        .neq('id', user.id)
        .ilike('handle', `%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, [user]);

  const createOrOpenConversation = useCallback(async function createOrOpenConversation(otherUserId: string) {
    if (!user || otherUserId === user.id) return;

    try {
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingParticipations) {
        for (const participation of existingParticipations) {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participation.conversation_id)
            .neq('user_id', user.id);

          if (otherParticipants?.length === 1 && otherParticipants[0].user_id === otherUserId) {
            setSelectedConversation(participation.conversation_id);
            setShowComposeModal(false);
            return;
          }
        }
      }

      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: false,
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: otherUserId }
        ]);

      setSelectedConversation(newConversation.id);
      setShowComposeModal(false);
      loadConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, [user, loadConversations]);

  function subscribeToMessages(conversationId: string) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: sender } = await supabase
            .from('profiles')
            .select('handle, avatar_url')
            .eq('id', newMsg.sender_id)
            .maybeSingle();

          setMessages(prev => [...prev, { ...newMsg, sender: sender || undefined }]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }

  useEffect(() => {
    if (user) {
      loadConversations();
      if (recipientId) {
        createOrOpenConversation(recipientId);
      }
    }
  }, [user, recipientId, loadConversations, createOrOpenConversation]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markAsRead(selectedConversation);
      subscribeToMessages(selectedConversation);
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedConversation, loadMessages, markAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (userSearchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(userSearchQuery);
      }, 300);
    } else {
      setUserSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [userSearchQuery, searchUsers]);

  async function loadFollowers() {
    if (!user) return;

    setLoadingFollowers(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (!data || data.length === 0) {
        setFollowers([]);
        return;
      }

      const followerIds = data.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url, car_make, car_model')
        .in('id', followerIds)
        .order('handle');

      setFollowers(profiles || []);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedConversation || (!newMessage.trim() && !attachment)) return;

    try {
      const { data: rateLimitCheck, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: user.id,
          p_action_type: 'message',
          p_max_actions: 10,
          p_window_minutes: 60
        });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      }

      if (rateLimitCheck === false) {
        alert('Rate limit exceeded. Please wait before sending more messages.');
        return;
      }

      let attachmentData = null;
      if (attachment) {
        attachmentData = await uploadAttachment(attachment);
        if (!attachmentData) return;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: newMessage.trim() || (attachmentData ? attachmentData.name : ''),
          attachment_url: attachmentData?.url || null,
          attachment_type: attachmentData?.type || null,
          attachment_size: attachmentData?.size || null,
          attachment_name: attachmentData?.name || null
        });

      if (error) throw error;

      await supabase.rpc('record_rate_limit_action', {
        p_user_id: user.id,
        p_action_type: 'message'
      });

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation);

      setNewMessage('');
      removeAttachment();
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      alert('Only images and PDFs are allowed');
      return;
    }

    setAttachment(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachmentPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  }

  function removeAttachment() {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function uploadAttachment(file: globalThis.File) {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      return {
        url: data.publicUrl,
        type: file.type,
        size: file.size,
        name: file.name
      };
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getConversationTitle(conv: Conversation): string {
    if (conv.title) return conv.title;
    if (conv.other_user) return conv.other_user.handle;
    return 'Unknown';
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  const filteredConversations = conversations.filter(conv =>
    getConversationTitle(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  if (loading) {
    return (
      <Layout currentPage="messages" onNavigate={onNavigate}>
        <LoadingSpinner size="lg" label="Loading messages..." className="h-96" />
      </Layout>
    );
  }

  return (
    <Layout currentPage="messages" onNavigate={onNavigate}>
      <div style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 0 }}>
        {/* Conversation list sidebar */}
        <div style={{ width: 320, flexShrink: 0, background: '#0a0e17', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Sticky header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '52px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0d14' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#eef4f8', margin: 0 }}>Messages</h2>
              <button
                onClick={() => {
                  setShowComposeModal(true);
                  loadFollowers();
                }}
                style={{ width: 32, height: 32, background: '#0a0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f97316' }}
                title="New Message"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0d1117', borderRadius: 8, margin: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Search style={{ width: 14, height: 14, color: '#5a6e7e', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#eef4f8', padding: 0 }}
            />
          </div>

          {/* Conversation rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#3a4e60' }}>No Messages Yet</span>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const title = getConversationTitle(conv);
                const initials = title.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Avatar */}
                    {conv.other_user?.avatar_url ? (
                      <img
                        src={conv.other_user.avatar_url}
                        alt={title}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1e2a38', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#7a8e9e' }}>
                        {initials}
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                        {title}
                      </div>
                      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.last_message || 'No messages yet'}
                      </div>
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#3a4e60', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(conv.last_message_at)}
                      </span>
                      {conv.unread_count > 0 && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message thread area */}
        <div style={{ flex: 1, background: '#080c14', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {selectedConversation && currentConversation ? (
            <>
              {/* Thread header */}
              <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: '#080c14' }}>
                <button
                  onClick={() => setSelectedConversation(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6e7e', display: 'flex', alignItems: 'center', padding: 4 }}
                >
                  <ArrowLeft size={18} />
                </button>
                {currentConversation.other_user?.avatar_url ? (
                  <img
                    src={currentConversation.other_user.avatar_url}
                    alt={getConversationTitle(currentConversation)}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <MessageCircle size={14} />
                  </div>
                )}
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#eef4f8' }}>
                  {getConversationTitle(currentConversation)}
                </span>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div style={{ textAlign: 'center', color: '#5a6e7e' }}>
                      <MessageCircle size={48} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13 }}>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);
                    const isRead = msg.read_at !== null;

                    return (
                      <div
                        key={msg.id}
                        style={{ display: 'flex', gap: 8, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
                      >
                        {!isOwn && (
                          <div style={{ width: 26, height: 26, flexShrink: 0, marginTop: 2 }}>
                            {showAvatar && msg.sender?.avatar_url ? (
                              <img
                                src={msg.sender.avatar_url}
                                alt={msg.sender.handle}
                                style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : showAvatar ? (
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                                {msg.sender?.handle[0].toUpperCase()}
                              </div>
                            ) : null}
                          </div>
                        )}
                        <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 3, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                          <div
                            style={{
                              padding: '10px 14px',
                              ...(isOwn
                                ? { background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '12px 12px 3px 12px' }
                                : { background: '#0e1320', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px 12px 12px 3px' }
                              ),
                              color: '#eef4f8'
                            }}
                          >
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="attachment"
                                style={{ marginBottom: 8, borderRadius: 8, maxWidth: '100%', display: 'block' }}
                              />
                            )}
                            {msg.attachment_url && msg.attachment_type?.startsWith('image/') && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={msg.attachment_url}
                                  alt="Attachment"
                                  style={{ marginBottom: 8, borderRadius: 8, maxWidth: 280, cursor: 'pointer', display: 'block' }}
                                />
                              </a>
                            )}
                            {msg.attachment_url && !msg.attachment_type?.startsWith('image/') && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: 10,
                                  borderRadius: 10,
                                  marginBottom: 8,
                                  background: isOwn ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                  border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                  textDecoration: 'none',
                                  color: 'inherit'
                                }}
                              >
                                <File style={{ width: 22, height: 22, flexShrink: 0, color: '#5a6e7e' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#eef4f8' }}>{msg.attachment_name || 'File'}</p>
                                  {msg.attachment_size && (
                                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', margin: '2px 0 0' }}>{formatFileSize(msg.attachment_size)}</p>
                                  )}
                                </div>
                                <Download style={{ width: 14, height: 14, flexShrink: 0, color: '#5a6e7e' }} />
                              </a>
                            )}
                            {msg.content && <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, margin: 0, lineHeight: 1.45, wordBreak: 'break-word' }}>{msg.content}</p>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2, paddingRight: 2 }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a6e7e' }}>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isOwn && (
                              <span style={{ display: 'flex', alignItems: 'center' }}>
                                {isRead ? (
                                  <CheckCheck size={12} style={{ color: '#22c55e' }} />
                                ) : (
                                  <Check size={12} style={{ color: '#5a6e7e' }} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOwn && <div style={{ width: 26 }} />}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Attachment preview */}
              {attachment && (
                <div style={{ padding: '10px 16px', background: 'rgba(14,19,32,0.7)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: '#0a0e17', borderRadius: 10 }}>
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="Preview" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 52, height: 52, background: '#0e1320', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <File style={{ width: 24, height: 24, color: '#5a6e7e' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#eef4f8' }}>{attachment.name}</p>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', margin: '3px 0 0' }}>{formatFileSize(attachment.size)}</p>
                    </div>
                    <button onClick={removeAttachment} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#5a6e7e' }}>
                      <X style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Message input bar */}
              <form onSubmit={sendMessage} style={{ position: 'sticky', bottom: 0, padding: '12px 16px', background: 'rgba(6,9,14,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !!attachment}
                    style={{ width: 36, height: 36, borderRadius: 10, background: '#0e1320', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading || attachment ? 'not-allowed' : 'pointer', opacity: uploading || attachment ? 0.4 : 1, color: '#5a6e7e', flexShrink: 0 }}
                  >
                    <Paperclip size={16} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={attachment ? "Add a message..." : "Type a message..."}
                    style={{ ...inputStyle, borderRadius: 20, padding: '9px 16px', fontSize: 13, flex: 1 }}
                    autoFocus
                    disabled={uploading}
                  />
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !attachment) || uploading}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: (newMessage.trim() || attachment) && !uploading ? '#f97316' : '#0e1320',
                      border: (newMessage.trim() || attachment) && !uploading ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (!newMessage.trim() && !attachment) || uploading ? 'not-allowed' : 'pointer',
                      color: '#fff',
                      flexShrink: 0,
                      transition: 'background 0.15s, border 0.15s'
                    }}
                  >
                    {uploading ? (
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center', maxWidth: 340, padding: '0 24px' }}>
                <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #f97316, #fb923c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <MessageCircle size={38} style={{ color: '#fff' }} />
                </div>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', margin: '0 0 8px' }}>Start a Conversation</h3>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Connect with fellow car enthusiasts. Share your passion, ask questions, or just chat about rides.
                </p>
                <button
                  onClick={() => {
                    setShowComposeModal(true);
                    loadFollowers();
                  }}
                  style={{ padding: '10px 22px', background: '#f97316', border: 'none', borderRadius: 10, fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus size={17} />
                  New Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {showComposeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#0a0e17', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, width: '100%', maxWidth: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', margin: 0 }}>New Message</h3>
                <button
                  onClick={() => {
                    setShowComposeModal(false);
                    setUserSearchQuery('');
                    setUserSearchResults([]);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#5a6e7e' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e' }} size={15} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{ ...inputStyle, borderRadius: 20, paddingLeft: 36, fontSize: 13 }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {userSearchQuery.trim() ? (
                searchingUsers ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ width: 28, height: 28, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Searching...</p>
                  </div>
                ) : userSearchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Users size={40} style={{ margin: '0 auto 12px', color: '#5a6e7e', opacity: 0.4, display: 'block' }} />
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', margin: '0 0 4px' }}>No users found</p>
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e' }}>Try a different search term</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>
                      Search Results
                    </p>
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => createOrOpenConversation(u.id)}
                        style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.handle}
                            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                            {u.handle[0].toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.handle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : loadingFollowers ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 28, height: 28, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e' }}>Loading followers...</p>
                </div>
              ) : followers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', color: '#5a6e7e', opacity: 0.4, display: 'block' }} />
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', margin: '0 0 4px' }}>Start by searching for someone</p>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e' }}>
                    Type a username above to find people to message
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>
                    Your Followers
                  </p>
                  {followers.map((follower) => (
                    <button
                      key={follower.id}
                      onClick={() => createOrOpenConversation(follower.id)}
                      style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {follower.avatar_url ? (
                        <img
                          src={follower.avatar_url}
                          alt={follower.handle}
                          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                          {follower.handle[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{follower.handle}</p>
                        {(follower.car_make || follower.car_model) && (
                          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {follower.car_make} {follower.car_model}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
