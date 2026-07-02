import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiAPI, ChatMessage, ContextSize } from '@/api/ai';
import { ConfigSelector } from './ConfigSelector';
import { SettingsPage } from './SettingsPage';
import { Settings, Trash2 } from 'lucide-react';
import { DEFAULT_CONFIG_NAME } from '@/config';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextSize, setContextSize] = useState<ContextSize>({ chars: 0, tokens: 0 });
  const [selectedConfig, setSelectedConfig] = useState(DEFAULT_CONFIG_NAME);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const msgs = await aiAPI.getMessages();
    const size = await aiAPI.getContextSize();
    setMessages(msgs);
    setContextSize(size);
  };

  const refreshContextSize = async () => {
    const size = await aiAPI.getContextSize();
    setContextSize(size);
  };

  // Sync selected config to main process whenever it changes
  useEffect(() => {
    aiAPI.setCurrentConfig(selectedConfig);
  }, [selectedConfig]);

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setIsLoading(true);

    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);

    try {
      const response = await aiAPI.chat(userMessage);
      const newMessages = await aiAPI.getMessages();
      setMessages(newMessages);
      await refreshContextSize();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    await aiAPI.clear();
    const msgs = await aiAPI.getMessages();
    setMessages(msgs);
    await refreshContextSize();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const parseContent = (content: string) => {
    const reasoningMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';
    const text = content.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();
    return { reasoning, text };
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    if (msg.role === 'system') return null;

    const { reasoning, text } = parseContent(msg.content);

    return (
      <div key={index} className="mb-4 p-2 rounded-lg">
        <div className="font-bold mb-1">
          {msg.role === 'user' ? 'You' : 'Assistant'}:
        </div>
        {msg.role === 'user' ? (
          <div>{msg.content}</div>
        ) : (
          <div>
            {reasoning && (
              <details className="mb-2">
                <summary className="cursor-pointer text-neutral-500">Thinking</summary>
                <pre className="whitespace-pre-wrap text-neutral-400 text-sm mt-1">
                  {reasoning}
                </pre>
              </details>
            )}
            <div className="response-content">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showSettings) {
    return (
      <div className="flex flex-col h-screen p-4">
        <SettingsPage onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="m-0">AI Chat</h1>
        <div className="flex items-center gap-4">
          <span className="text-neutral-500 text-sm">
            {contextSize.chars.toLocaleString()} chars / ~{contextSize.tokens.toLocaleString()} tokens
          </span>
          <ConfigSelector
            selectedConfig={selectedConfig}
            onSelect={setSelectedConfig}
          />
          <button
            onClick={handleClear}
            className="p-2 bg-neutral-200 hover:bg-neutral-300 rounded-md transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-neutral-200 hover:bg-neutral-300 rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border border-neutral-300 rounded-lg p-4 mb-4">
        {messages.map((msg, i) => renderMessage(msg, i))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt... (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !prompt.trim()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

    </div>
  );
}

export default App;
