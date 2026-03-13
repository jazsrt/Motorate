import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { MessageCircle, Send, Search, Plus, Check, CheckCheck, X, Users, Paperclip, File, Download } from 'lucide-react';
import { OnNavigate } from '../types/navigation';
import { RealtimeChannel } from '@supabase/supabase-js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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

  useEffect(() => {
    if (user) {
      loadConversations();
      if (recipientId) {
        createOrOpenConversation(recipientId);
      }
    }
  }, [user, recipientId]);

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
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversations() {
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
  }

  async function loadMessages(conversationId: string) {
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
  }

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
  }, [userSearchQuery]);

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

  async function searchUsers(query: string) {
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
  }

  async function createOrOpenConversation(otherUserId: string) {
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
  }

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

  async function markAsRead(conversationId: string) {
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
      <Layout currentPage="profile" onNavigate={onNavigate}>
        <LoadingSpinner size="lg" label="Loading messages..." className="h-96" />
      </Layout>
    );
  }

  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      <div className="h-[calc(100vh-120px)] flex gap-4" style={{ background: 'var(--black,#030508)' }}>

        {/* Left panel — conversation list */}
        <div
          className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            background: 'var(--carbon-1,#0a0d14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
          }}
        >
          {/* Panel header */}
          <div
            className="p-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                style={{
                  fontFamily: "'Rajdhani',sans-serif",
                  fontWeight: 700,
                  fontSize: '20px',
                  color: 'var(--white,#eef4f8)',
                }}
              >
                Messages
              </h2>
              <button
                onClick={() => {
                  setShowComposeModal(true);
                  loadFollowers();
                }}
                className="p-2 rounded-lg transition-colors active:scale-95"
                style={{ background: 'var(--accent,#F97316)', color: '#030508' }}
                title="New Message"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                size={16}
                style={{ color: 'var(--dim,#6a7486)' }}
              />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'var(--white,#eef4f8)',
                  fontFamily: "'Barlow',sans-serif",
                }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div
                className="p-6 text-center text-sm"
                style={{
                  fontFamily: "'Barlow',sans-serif",
                  color: 'var(--dim,#6a7486)',
                }}
              >
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </div>
            ) : (
              <div>
                {filteredConversations.map((conv) => {
                  const isActive = selectedConversation === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className="w-full p-4 transition-colors text-left"
                      style={{
                        background: isActive ? 'rgba(249,115,22,0.06)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {conv.other_user?.avatar_url ? (
                          <img
                            src={conv.other_user.avatar_url}
                            alt={getConversationTitle(conv)}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #fb923c)' }}>
                            <MessageCircle size={20} style={{ color: '#030508' }} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className="truncate"
                              style={{
                                fontFamily: "'Barlow',sans-serif",
                                fontWeight: 600,
                                fontSize: '14px',
                                color: 'var(--white,#eef4f8)',
                              }}
                            >
                              {getConversationTitle(conv)}
                            </span>
                            <span
                              className="flex-shrink-0"
                              style={{
                                fontFamily: "'Barlow Condensed',sans-serif",
                                fontWeight: 700,
                                fontSize: '9px',
                                textTransform: 'uppercase',
                                color: 'var(--dim,#6a7486)',
                              }}
                            >
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className="truncate"
                              style={{
                                fontFamily: "'Barlow',sans-serif",
                                fontSize: '12px',
                                color: 'var(--dim,#6a7486)',
                              }}
                            >
                              {conv.last_message || 'No messages yet'}
                            </p>
                            {conv.unread_count > 0 && (
                              <span
                                className="flex-shrink-0 min-w-[20px] text-center px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: 'var(--accent,#F97316)',
                                  color: '#030508',
                                  fontFamily: "'Barlow Condensed',sans-serif",
                                  fontWeight: 700,
                                  fontSize: '11px',
                                }}
                              >
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — chat area */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: 'var(--black,#030508)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
          }}
        >
          {selectedConversation && currentConversation ? (
            <>
              {/* Chat header */}
              <div
                className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                {currentConversation.other_user?.avatar_url ? (
                  <img
                    src={currentConversation.other_user.avatar_url}
                    alt={getConversationTitle(currentConversation)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #F97316, #fb923c)' }}
                  >
                    <MessageCircle size={20} style={{ color: '#030508' }} />
                  </div>
                )}
                <div>
                  <h3
                    style={{
                      fontFamily: "'Barlow',sans-serif",
                      fontWeight: 600,
                      fontSize: '15px',
                      color: 'var(--white,#eef4f8)',
                    }}
                  >
                    {getConversationTitle(currentConversation)}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      color: 'var(--dim,#6a7486)',
                      letterSpacing: '1px',
                    }}
                  >
                    Active now
                  </p>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle
                        size={48}
                        className="mx-auto mb-3 opacity-30"
                        style={{ color: 'var(--dim,#6a7486)' }}
                      />
                      <p
                        style={{
                          fontFamily: "'Barlow',sans-serif",
                          fontSize: '14px',
                          color: 'var(--dim,#6a7486)',
                        }}
                      >
                        No messages yet. Start the conversation!
                      </p>
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
                        className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          <div className="w-8 h-8 flex-shrink-0">
                            {showAvatar && msg.sender?.avatar_url ? (
                              <img
                                src={msg.sender.avatar_url}
                                alt={msg.sender.handle}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : showAvatar ? (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                                style={{
                                  background: 'linear-gradient(135deg, #F97316, #fb923c)',
                                  color: '#030508',
                                  fontFamily: "'Barlow Condensed',sans-serif",
                                  fontWeight: 700,
                                }}
                              >
                                {msg.sender?.handle[0].toUpperCase()}
                              </div>
                            ) : null}
                          </div>
                        )}
                        <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div
                            className="px-4 py-2"
                            style={{
                              background: isOwn ? 'var(--accent,#F97316)' : 'var(--carbon-2,#0e1320)',
                              color: isOwn ? '#030508' : 'var(--white,#eef4f8)',
                              borderRadius: isOwn ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                              fontFamily: "'Barlow',sans-serif",
                            }}
                          >
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="attachment"
                                className="mb-2 rounded-lg max-w-full"
                              />
                            )}
                            {msg.attachment_url && msg.attachment_type?.startsWith('image/') && (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={msg.attachment_url}
                                  alt="Attachment"
                                  className="mb-2 rounded-lg max-w-xs cursor-pointer hover:opacity-90"
                                />
                              </a>
                            )}
                            {msg.attachment_url && !msg.attachment_type?.startsWith('image/') && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl mb-2"
                                style={{
                                  background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.04)',
                                  border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.07)',
                                }}
                              >
                                <File className="w-6 h-6 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="truncate"
                                    style={{
                                      fontFamily: "'Barlow',sans-serif",
                                      fontWeight: 600,
                                      fontSize: '13px',
                                    }}
                                  >
                                    {msg.attachment_name || 'File'}
                                  </p>
                                  {msg.attachment_size && (
                                    <p
                                      style={{
                                        fontFamily: "'Barlow',sans-serif",
                                        fontSize: '11px',
                                        opacity: 0.7,
                                      }}
                                    >
                                      {formatFileSize(msg.attachment_size)}
                                    </p>
                                  )}
                                </div>
                                <Download className="w-4 h-4 flex-shrink-0" />
                              </a>
                            )}
                            {msg.content && (
                              <p
                                className="text-sm break-words"
                                style={{ fontFamily: "'Barlow',sans-serif" }}
                              >
                                {msg.content}
                              </p>
                            )}
                          </div>
                          <div
                            className={`flex items-center gap-1 px-1`}
                            style={{
                              fontFamily: "'Barlow Condensed',sans-serif",
                              fontSize: '9px',
                              color: 'var(--dim,#6a7486)',
                            }}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isOwn && (
                              <span>
                                {isRead ? (
                                  <CheckCheck size={14} style={{ color: 'var(--accent,#F97316)' }} />
                                ) : (
                                  <Check size={14} style={{ color: 'var(--dim,#6a7486)' }} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {isOwn && <div className="w-8"></div>}
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
                className="hidden"
              />

              {/* Attachment preview bar */}
              {attachment && (
                <div
                  className="px-4 py-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: 'var(--carbon-1,#0a0d14)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div
                        className="w-16 h-16 rounded flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <File className="w-8 h-8" style={{ color: 'var(--dim,#6a7486)' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: "'Barlow',sans-serif",
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--white,#eef4f8)',
                        }}
                      >
                        {attachment.name}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Barlow',sans-serif",
                          fontSize: '11px',
                          marginTop: '2px',
                          color: 'var(--dim,#6a7486)',
                        }}
                      >
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <button
                      onClick={removeAttachment}
                      className="p-2 rounded"
                      style={{ color: 'var(--dim,#6a7486)' }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Message input bar */}
              <form
                onSubmit={sendMessage}
                className="p-4 flex-shrink-0"
                style={{
                  background: 'var(--carbon-1,#0a0d14)',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !!attachment}
                    className="p-3 rounded-xl transition-colors disabled:opacity-50"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Paperclip size={18} style={{ color: 'var(--dim,#6a7486)' }} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={attachment ? "Add a message..." : "Type a message..."}
                    className="flex-1 px-4 py-3 rounded-xl focus:outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--white,#eef4f8)',
                      fontFamily: "'Barlow',sans-serif",
                      fontSize: '14px',
                    }}
                    autoFocus
                    disabled={uploading}
                  />
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !attachment) || uploading}
                    className="px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                    style={{
                      background: 'var(--accent,#F97316)',
                      color: '#030508',
                    }}
                  >
                    {uploading ? (
                      <div
                        className="w-5 h-5 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#030508' }}
                      />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Empty state */
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg, #F97316, #fb923c)' }}
                >
                  <MessageCircle size={48} style={{ color: '#030508' }} />
                </div>
                <h3
                  style={{
                    fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700,
                    fontSize: '24px',
                    color: 'var(--white,#eef4f8)',
                    marginBottom: '8px',
                  }}
                >
                  Start a Conversation
                </h3>
                <p
                  style={{
                    fontFamily: "'Barlow',sans-serif",
                    fontSize: '14px',
                    color: 'var(--dim,#6a7486)',
                    marginBottom: '24px',
                  }}
                >
                  Connect with fellow car enthusiasts. Share your passion, ask questions, or just chat about rides.
                </p>
                <button
                  onClick={() => {
                    setShowComposeModal(true);
                    loadFollowers();
                  }}
                  className="px-6 py-3 rounded-xl transition-colors active:scale-95 inline-flex items-center gap-2"
                  style={{
                    background: 'var(--accent,#F97316)',
                    color: '#030508',
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <Plus size={20} />
                  New Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose / new conversation modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md max-h-[80vh] flex flex-col"
            style={{
              background: 'var(--carbon-1,#0a0d14)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px',
            }}
          >
            <div
              className="p-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  style={{
                    fontFamily: "'Rajdhani',sans-serif",
                    fontWeight: 700,
                    fontSize: '18px',
                    color: 'var(--white,#eef4f8)',
                  }}
                >
                  New Message
                </h3>
                <button
                  onClick={() => {
                    setShowComposeModal(false);
                    setUserSearchQuery('');
                    setUserSearchResults([]);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--dim,#6a7486)' }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                  size={16}
                  style={{ color: 'var(--dim,#6a7486)' }}
                />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--white,#eef4f8)',
                    fontFamily: "'Barlow',sans-serif",
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {userSearchQuery.trim() ? (
                searchingUsers ? (
                  <div className="text-center py-12">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3"
                      style={{ borderColor: 'rgba(249,115,22,0.3)', borderBottomColor: 'var(--accent,#F97316)' }}
                    />
                    <p
                      style={{
                        fontFamily: "'Barlow',sans-serif",
                        fontSize: '13px',
                        color: 'var(--dim,#6a7486)',
                      }}
                    >
                      Searching...
                    </p>
                  </div>
                ) : userSearchResults.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--dim,#6a7486)' }} />
                    <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: 'var(--dim,#6a7486)' }}>
                      No users found
                    </p>
                    <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: 'var(--dim,#6a7486)', marginTop: '4px' }}>
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p
                      className="mb-3 uppercase tracking-wider"
                      style={{
                        fontFamily: "'Barlow Condensed',sans-serif",
                        fontWeight: 700,
                        fontSize: '10px',
                        color: 'var(--dim,#6a7486)',
                        letterSpacing: '2px',
                      }}
                    >
                      Search Results
                    </p>
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => createOrOpenConversation(u.id)}
                        className="w-full p-3 rounded-lg transition-colors text-left flex items-center gap-3"
                        style={{ color: 'var(--white,#eef4f8)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                      >
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.handle}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #F97316, #fb923c)',
                              color: '#030508',
                              fontFamily: "'Barlow Condensed',sans-serif",
                              fontWeight: 700,
                              fontSize: '14px',
                            }}
                          >
                            {u.handle[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className="truncate"
                            style={{
                              fontFamily: "'Barlow',sans-serif",
                              fontWeight: 600,
                              fontSize: '14px',
                              color: 'var(--white,#eef4f8)',
                            }}
                          >
                            @{u.handle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : loadingFollowers ? (
                <div className="text-center py-12">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3"
                    style={{ borderColor: 'rgba(249,115,22,0.3)', borderBottomColor: 'var(--accent,#F97316)' }}
                  />
                  <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: 'var(--dim,#6a7486)' }}>
                    Loading followers...
                  </p>
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--dim,#6a7486)' }} />
                  <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '13px', color: 'var(--dim,#6a7486)', marginBottom: '8px' }}>
                    Start by searching for someone
                  </p>
                  <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: '11px', color: 'var(--dim,#6a7486)' }}>
                    Type a username above to find people to message
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p
                    className="mb-3 uppercase tracking-wider"
                    style={{
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                      fontSize: '10px',
                      color: 'var(--dim,#6a7486)',
                      letterSpacing: '2px',
                    }}
                  >
                    Your Followers
                  </p>
                  {followers.map((follower) => (
                    <button
                      key={follower.id}
                      onClick={() => createOrOpenConversation(follower.id)}
                      className="w-full p-3 rounded-lg transition-colors text-left flex items-center gap-3"
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      {follower.avatar_url ? (
                        <img
                          src={follower.avatar_url}
                          alt={follower.handle}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #F97316, #fb923c)',
                            color: '#030508',
                            fontFamily: "'Barlow Condensed',sans-serif",
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {follower.handle[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: "'Barlow',sans-serif",
                            fontWeight: 600,
                            fontSize: '14px',
                            color: 'var(--white,#eef4f8)',
                          }}
                        >
                          @{follower.handle}
                        </p>
                        {(follower.car_make || follower.car_model) && (
                          <p
                            className="truncate"
                            style={{
                              fontFamily: "'Barlow',sans-serif",
                              fontSize: '12px',
                              color: 'var(--dim,#6a7486)',
                              marginTop: '2px',
                            }}
                          >
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
