import { useState } from 'react';
import { Send, Bot, BotMessageSquare } from 'lucide-react';

export function ChatInterface() {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    {
      role: 'ai',
      text: 'Hello! I am the MetaCall assistant. How can I help you with your deployments today?',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');

    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: 'I am a simulated assistant. This feature is currently under development.',
        },
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 border border-blue-200 shadow-sm">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`p-3 rounded-lg text-sm max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                  : 'bg-gray-100 text-slate-800 rounded-bl-none border border-gray-200 shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white mt-auto">
        <div className="flex items-center w-full">
          <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-5 py-2.5 bg-white">
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-700 font-medium"
            />
          </div>
          <button
            onClick={handleSend}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ paddingLeft: '2px' }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <div className="grow flex flex-col items-center justify-start p-4 bg-white animate-in fade-in duration-500">
      <div className="w-full max-w-4xl mt-4 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shadow-sm">
            <BotMessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Support Chat</h2>
            <p className="text-xs text-gray-500 font-medium">
              Talk to our AI assistant or support team
            </p>
          </div>
        </div>

        <div className="flex-1 border border-gray-200 shadow-sm rounded-lg overflow-hidden bg-white flex flex-col">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
