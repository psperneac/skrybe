import { useState, useEffect, useCallback, useRef } from 'react';
import { aiAPI } from '@/api/ai';
import { configAPI } from '@/api/config';
import { AIConfig } from '@/config';
import { Settings, Plus, Trash2, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';
import { Combobox } from '@/renderer/components/ui/combobox';
import { cn } from '@/lib/utils';

interface SettingsPageProps {
  onClose: () => void;
}

const defaultNewConfig: Omit<AIConfig, keyof AIConfig> = {
  endpoint: '',
  apiKey: '',
  modelName: '',
  temperature: 0.7,
  maxTokens: 8000,
};

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export function SettingsPage({ onClose }: SettingsPageProps) {
  const [configs, setConfigs] = useState<Record<string, AIConfig>>({});
  const [currentConfigName, setCurrentConfigName] = useState<string>('');
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [formData, setFormData] = useState<AIConfig>(defaultNewConfig as AIConfig);
  const [endpointStatus, setEndpointStatus] = useState<ValidationStatus>('idle');
  const [endpointError, setEndpointError] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const validateEndpoint = useCallback(async (endpoint: string, apiKey: string) => {
    if (!endpoint.trim()) {
      setEndpointStatus('idle');
      setEndpointError('');
      setAvailableModels([]);
      return;
    }

    // Clean up previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Debounce validation
    validationTimeoutRef.current = setTimeout(async () => {
      setEndpointStatus('checking');
      setEndpointError('');
      
      try {
        const result = await aiAPI.fetchModels({ endpoint, apiKey });
        if (result.valid) {
          setEndpointStatus('valid');
          setAvailableModels(result.models);
        } else {
          setEndpointStatus('invalid');
          setEndpointError(result.error || 'Invalid endpoint');
          setAvailableModels([]);
        }
      } catch (err) {
        setEndpointStatus('invalid');
        setEndpointError(err instanceof Error ? err.message : 'Failed to connect');
        setAvailableModels([]);
      }
    }, 500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const loadConfigs = async () => {
    const cfg = await configAPI.getAllConfigs();
    const current = await configAPI.getCurrentConfig();
    setConfigs(cfg);
    setCurrentConfigName(current);
  };

  const handleSetCurrent = async (name: string) => {
    await configAPI.setCurrentConfig(name);
    setCurrentConfigName(name);
  };

  const handleSave = async () => {
    if (isCreating && !newConfigName.trim()) return;
    
    const name = isCreating ? newConfigName.trim() : editingConfig!;
    await configAPI.saveConfig(name, formData);
    await loadConfigs();
    setIsCreating(false);
    setEditingConfig(null);
    setNewConfigName('');
    setFormData(defaultNewConfig as AIConfig);
  };

  const handleDelete = async (name: string) => {
    await configAPI.deleteConfig(name);
    await loadConfigs();
    if (editingConfig === name) {
      setEditingConfig(null);
    }
  };

  const startEdit = (name: string) => {
    setEditingConfig(name);
    setIsCreating(false);
    setFormData(configs[name]);
    setNewConfigName(name);
    // Trigger validation for the existing endpoint
    validateEndpoint(configs[name].endpoint, configs[name].apiKey);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingConfig(null);
    setFormData(defaultNewConfig as AIConfig);
    setNewConfigName('');
    setEndpointStatus('idle');
    setEndpointError('');
    setAvailableModels([]);
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingConfig(null);
    setFormData(defaultNewConfig as AIConfig);
    setNewConfigName('');
  };

  const isEditing = isCreating || editingConfig !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Settings
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Current Config Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-neutral-500 mb-2">Active Configuration</h3>
          <Select value={currentConfigName} onValueChange={handleSetCurrent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a config" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(configs).map((name) => (
                <SelectItem key={name} value={name}>
                  {name} {name === currentConfigName && '(active)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Config List */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-neutral-500">Configurations</h3>
            <button
              onClick={startCreate}
              disabled={isEditing}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Config List */}
          {!isEditing && (
            <div className="space-y-2">
              {Object.entries(configs).map(([name, config]) => (
                <div
                  key={name}
                  className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => startEdit(name)}>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-neutral-500 truncate">
                      {config.modelName || 'No model set'} @ {config.endpoint || 'No endpoint'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(name)}
                    disabled={name === 'default'}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Edit/Create Form */}
          {isEditing && (
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <h4 className="font-medium mb-4">
                {isCreating ? 'Create New Configuration' : `Edit: ${editingConfig}`}
              </h4>
              
              <div className="space-y-4">
                {isCreating && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={newConfigName}
                      onChange={(e) => setNewConfigName(e.target.value)}
                      placeholder="my-config"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Endpoint</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.endpoint}
                      onChange={(e) => {
                        setFormData({ ...formData, endpoint: e.target.value });
                        validateEndpoint(e.target.value, formData.apiKey);
                      }}
                      placeholder="http://localhost:8000/v1"
                      className="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {endpointStatus === 'checking' && (
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      )}
                      {endpointStatus === 'valid' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {endpointStatus === 'invalid' && (
                        <XCircle 
                          className="w-4 h-4 text-red-500" 
                          title={endpointError}
                        />
                      )}
                    </div>
                  </div>
                  {endpointStatus === 'invalid' && endpointError && (
                    <p className="mt-1 text-xs text-red-500">{endpointError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => {
                      setFormData({ ...formData, apiKey: e.target.value });
                      validateEndpoint(formData.endpoint, e.target.value);
                    }}
                    placeholder="not-needed or your-key"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Model Name</label>
                  {availableModels.length > 0 ? (
                    <Combobox
                      value={formData.modelName}
                      onValueChange={(value) => setFormData({ ...formData, modelName: value })}
                      options={availableModels}
                      placeholder="Select a model..."
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.modelName}
                      onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                      placeholder="Qwen/Qwen3.5-72B"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {availableModels.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available. Type to filter or enter a custom name.
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Temperature ({formData.temperature})</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Max Tokens</label>
                    <input
                      type="number"
                      value={formData.maxTokens}
                      onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 8000 })}
                      min="1"
                      max="200000"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isCreating && !newConfigName.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Create' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
