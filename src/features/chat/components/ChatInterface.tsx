import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { generateMetaCallReply } from '@/features/chat/support';

type ChatMessage = {
  id: string;
  role: 'agent' | 'user';
  text: string;
  time: string;
};

const CHAT_STORAGE_KEY = 'metacall_launchpad_chat';

function seedConversation(): ChatMessage[] {
  return [
    {
      id: 'm-1',
      role: 'agent',
      text: 'Welcome to MetaCall Support! How can we help you today?',
      time: timeLabel(),
    },
  ];
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadConversation(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) return seedConversation();
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return seedConversation();

    const valid = parsed.filter(
      (item): item is ChatMessage =>
        Boolean(item) &&
        typeof item === 'object' &&
        'id' in item &&
        'role' in item &&
        'text' in item &&
        'time' in item &&
        (item.role === 'agent' || item.role === 'user') &&
        typeof item.id === 'string' &&
        typeof item.text === 'string' &&
        typeof item.time === 'string',
    );
    return valid.length ? valid : seedConversation();
  } catch {
    return seedConversation();
  }
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadConversation);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typingPreview = useMemo(
    () =>
      isTyping
        ? {
            id: 'typing',
            role: 'agent' as const,
            text: 'Typing…',
            time: timeLabel(),
          }
        : null,
    [isTyping],
  );

  useEffect(() => {
    if (!scrollerRef.current) return;
    if (typeof scrollerRef.current.scrollTo === 'function') {
      scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(
    () => () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    },
    [],
  );

  const pushAgentReply = (userText: string) => {
    setIsTyping(true);
    const reply = generateMetaCallReply(userText);

    replyTimerRef.current = setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: reply,
          time: timeLabel(),
        },
      ]);
      setIsTyping(false);
      replyTimerRef.current = null;
    }, 800);
  };

  const handleSend = () => {
    const clean = input.trim();
    if (!clean) return;

    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: clean, time: timeLabel() },
    ]);
    setInput('');
    pushAgentReply(clean);
  };

  const handleReset = () => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    setIsTyping(false);
    setInput('');
    setMessages(seedConversation());
  };

  return (
    <div className="flex h-full flex-col bg-slate-100/15 text-slate-900">
      <div className="flex justify-end border-b border-slate-100 bg-white px-3 py-1">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Reset chat"
        >
          <Trash2 size={14} />
          Reset
        </button>
      </div>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 pb-4 pt-3 flex flex-col gap-4 scroll-smooth"
      >
        {[...messages, typingPreview].filter(Boolean).map(msg =>
          msg ? (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              {msg.role === 'agent' && (
                <img
                  src="/logo.svg"
                  alt="MetaCall Support"
                  className="w-10 h-10 border p-1 border-slate-200 rounded-full object-contain"
                />
              )}
              <div className="flex flex-col max-w-[85%]">
                <div
                  className={`p-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white  rounded-br-none rounded-[10px] shadow-blue-300/40 shadow-md'
                      : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                  } ${msg.id === 'typing' ? 'animate-pulse text-slate-500' : ''}`}
                >
                  {msg.id === 'typing' ? (
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400/70 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400/70 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400/70 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </span>
                  ) : (
                    msg.text
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1  group-hover:opacity-100 transition-opacity">
                  {msg.time}
                </span>
              </div>
            </div>
          ) : null,
        )}
      </div>
      {/* // Input area */}
      <div className="px-1 pb-1 pt-1 bg-white border-t border-slate-100 shadow-[0_-6px_18px_-12px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-5xl px-3 py-2 ">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={handleSend}
            className="inline-flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-5xl px-3 py-2 shadow-md transition-transform active:scale-95"
            aria-label="Send"
          >
            <Send size={18} className="-mr-0.4" />
          </button>
        </div>
      </div>
    </div>
  );
}
