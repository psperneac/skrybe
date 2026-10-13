import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiAPI, ChatMessage, ContextSize, FetchModelsResult, ModelInfoResponse } from '@/api/ai';
import { configAPI } from '@/api/config';
import { AIConfig, DEFAULT_CONFIG_NAME } from '@/config';
import { ConfigSelector } from './ConfigSelector';
import { SettingsPage } from './SettingsPage';
import { ModelInfoPanel } from './ModelInfoPanel';
import { Settings, Trash2, MoreHorizontal, List, Copy, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/renderer/components/ui/dropdown-menu';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextSize, setContextSize] = useState<ContextSize>({ chars: 0, tokens: 0 });
  const [selectedConfig, setSelectedConfig] = useState(DEFAULT_CONFIG_NAME);
  const [showSettings, setShowSettings] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isFetchingModelInfo, setIsFetchingModelInfo] = useState(false);
  const [configs, setConfigs] = useState<Record<string, AIConfig>>({});
  const [modelInfoCache, setModelInfoCache] = useState<Record<string, ModelInfoResponse>>({});
  const [dismissedModelInfo, setDismissedModelInfo] = useState<string | null>(null);
  const modelInfoCacheRef = useRef<Record<string, ModelInfoResponse>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const cacheKeyFor = (config: AIConfig) =>
    `${config.endpoint}::${config.modelName}`;

  const currentConfig = configs[selectedConfig];
  const currentCacheKey = currentConfig ? cacheKeyFor(currentConfig) : null;
  const currentModelInfo = currentCacheKey ? modelInfoCache[currentCacheKey] : null;
  const isCurrentInfoDismissed = currentCacheKey !== null && dismissedModelInfo === currentCacheKey;

  const fetchModelInfo = useCallback(async (config: AIConfig, force = false) => {
    if (!config.endpoint) return;
    const key = cacheKeyFor(config);
    if (!force && modelInfoCacheRef.current[key]) return;

    setIsFetchingModelInfo(true);
    try {
      const result = await aiAPI.fetchModelInfo(config);
      if (result.valid) {
        const next = { ...modelInfoCacheRef.current, [key]: result.info as ModelInfoResponse };
        modelInfoCacheRef.current = next;
        setModelInfoCache(next);
        setDismissedModelInfo(null);
      } else {
        console.warn('Model info unavailable:', result.error);
      }
    } catch (err) {
      console.error('Model info fetch failed:', err);
    } finally {
      setIsFetchingModelInfo(false);
    }
  }, []);

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

  // Sync selected config to main process whenever it changes, populate the
  // configs map, and fetch model info for the new config (cached per
  // endpoint+model — duplicate fetches are no-ops).
  useEffect(() => {
    configAPI.setCurrentConfig(selectedConfig);

    const updateInfo = async () => {
      const allConfigs = await configAPI.getAllConfigs();
      setConfigs(allConfigs);
      const config = allConfigs[selectedConfig];
      if (config) {
        fetchModelInfo(config);
      }
    };
    updateInfo();
  }, [selectedConfig, fetchModelInfo]);

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setIsLoading(true);

    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);

    try {
      await aiAPI.chat(userMessage);
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

  const handleQueryModels = async () => {
    setIsFetchingModels(true);
    try {
      const allConfigs = await configAPI.getAllConfigs();
      const currentConfig = allConfigs[selectedConfig];
      if (currentConfig) {
        const result: FetchModelsResult = await aiAPI.fetchModels(currentConfig);
        if (result.valid) {
          setFetchedModels(result.models);
        } else {
          setFetchedModels([]);
          console.error('Failed to fetch models:', result.error);
        }
      }
    } catch (err) {
      console.error('Error fetching models:', err);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleRefreshModelInfo = async () => {
    if (currentConfig) {
      await fetchModelInfo(currentConfig, true);
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 bg-neutral-200 hover:bg-neutral-300 rounded-md transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleQueryModels} disabled={isFetchingModels}>
                <List className="w-4 h-4 mr-2" />
                {isFetchingModels ? 'Querying Models...' : 'Query Models'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRefreshModelInfo} disabled={isFetchingModelInfo}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {isFetchingModelInfo ? 'Refreshing Model Info...' : 'Refresh Model Info'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {fetchedModels.length > 0 && (
        <div className="mb-4 p-3 bg-neutral-100 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Available Models:</h3>
          <div className="flex flex-wrap gap-2">
            {fetchedModels.map((model) => (
              <div
                key={model}
                className="group relative px-2 py-1 bg-white border border-neutral-300 rounded text-sm flex items-center gap-1"
              >
                <span>{model}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(model)}
                  className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-neutral-200 rounded transition-opacity"
                  title="Copy model name"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentModelInfo && !isCurrentInfoDismissed && (
        <ModelInfoPanel
          info={currentModelInfo}
          onDismiss={() => currentCacheKey && setDismissedModelInfo(currentCacheKey)}
        />
      )}

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
