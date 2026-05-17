import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiAPI, ChatMessage, ContextSize } from '../api/ai';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextSize, setContextSize] = useState<ContextSize>({ chars: 0, tokens: 0 });
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
      <div key={index} style={{ marginBottom: '16px', padding: '8px', borderRadius: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {msg.role === 'user' ? 'You' : 'Assistant'}:
        </div>
        {msg.role === 'user' ? (
          <div>{msg.content}</div>
        ) : (
          <div>
            {reasoning && (
              <details style={{ marginBottom: '8px' }}>
                <summary style={{ cursor: 'pointer', color: '#666' }}>Thinking</summary>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#888', fontSize: '0.9em' }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>AI Chat</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '0.9em' }}>
            {contextSize.chars.toLocaleString()} chars / ~{contextSize.tokens.toLocaleString()} tokens
          </span>
          <button onClick={handleClear} style={{ padding: '8px 16px' }}>
            Clear
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ccc', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        {messages.map((msg, i) => renderMessage(msg, i))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt... (Enter to send, Shift+Enter for new line)"
          style={{ flex: 1, resize: 'none' }}
          rows={3}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !prompt.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default App;