import { BotMessageSquare } from 'lucide-react';
import { ChatInterface } from '@/features/chat/components/ChatInterface';

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
