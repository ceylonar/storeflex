
import { Bot } from 'lucide-react';
import { ChatInterface } from '@/components/ai-assistant/chat-interface';

export default function AiAssistantPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
       <div className="flex items-center gap-4 mb-4">
        <Bot className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">
            Ask me anything about your inventory, sales, or how to use the app.
          </p>
        </div>
      </div>
      <ChatInterface />
    </div>
  );
}
