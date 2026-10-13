import { Copy, X } from 'lucide-react';
import { LiteLLMModelInfo, ModelInfoResponse } from '@/api/ai';
import { cn } from '@/lib/utils';

interface ModelInfoPanelProps {
  info: ModelInfoResponse;
  onDismiss: () => void;
}

type CapabilityDef = {
  label: string;
  explicitKey: string;
  // When the explicit field is null/undefined, look for any of these
  // names in model_info.supported_openai_params to infer support.
  paramKeys: string[];
};

// explicitKey maps to the corresponding field on LiteLLMModelInfo['model_info'].
// paramKeys are the supported_openai_params entries that imply the capability.
const CAPABILITY_DEFS: CapabilityDef[] = [
  { label: 'Vision', explicitKey: 'supports_vision', paramKeys: [] },
  {
    label: 'Function calling',
    explicitKey: 'supports_function_calling',
    paramKeys: ['tools', 'function_call', 'functions', 'parallel_tool_calls'],
  },
  {
    label: 'Tool choice',
    explicitKey: 'supports_tool_choice',
    paramKeys: ['tool_choice'],
  },
  {
    label: 'Reasoning',
    explicitKey: 'supports_reasoning',
    paramKeys: ['reasoning_effort'],
  },
  {
    label: 'Streaming',
    explicitKey: 'supports_native_streaming',
    paramKeys: ['stream', 'stream_options'],
  },
  {
    label: 'Prompt caching',
    explicitKey: 'supports_prompt_caching',
    paramKeys: ['prompt_cache_key', 'prompt_cache_retention'],
  },
  {
    label: 'System messages',
    explicitKey: 'supports_system_messages',
    paramKeys: [],
  },
];

function resolveCapability(
  meta: LiteLLMModelInfo['model_info'] | undefined,
  def: CapabilityDef,
): 'yes' | 'no' | 'unknown' {
  const explicit = meta?.[def.explicitKey as keyof typeof meta];
  if (explicit === true) return 'yes';
  if (explicit === false) return 'no';

  const params = meta?.supported_openai_params;
  if (params && def.paramKeys.length > 0) {
    return def.paramKeys.some((k) => params.includes(k)) ? 'yes' : 'unknown';
  }
  return 'unknown';
}

export function ModelInfoPanel({ info, onDismiss }: ModelInfoPanelProps) {
  const model = info.data?.[0];
  const meta = model?.model_info;
  const params = model?.litellm_params;

  const modelName = model?.model_name ?? 'Unknown model';
  const provider = meta?.litellm_provider;
  const apiBase = params?.api_base;
  const supportedParams = meta?.supported_openai_params;

  const limits: string[] = [];
  if (meta?.max_input_tokens) limits.push(`${meta.max_input_tokens.toLocaleString()} input`);
  if (meta?.max_output_tokens) limits.push(`${meta.max_output_tokens.toLocaleString()} output`);
  if (meta?.max_tokens) limits.push(`${meta.max_tokens.toLocaleString()} max`);

  return (
    <details open className="mb-4 bg-neutral-100 rounded-lg">
      <summary className="p-3 cursor-pointer list-none flex items-center justify-between rounded-lg hover:bg-neutral-200 transition-colors">
        <h3 className="text-sm font-semibold m-0">Model Info</h3>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(info, null, 2))}
            className="p-1 hover:bg-neutral-300 rounded transition-colors"
            title="Copy raw JSON"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-neutral-300 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </summary>

      <div className="px-3 pb-3">
        <div className="mb-3">
          <div className="font-medium text-sm">{modelName}</div>
          {(provider || apiBase) && (
            <div className="text-xs text-neutral-500">
              {provider && <>Provider: {provider}</>}
              {provider && apiBase && <> &middot; </>}
              {apiBase && <>API: {apiBase}</>}
            </div>
          )}
        </div>

        {meta && (
          <div className="mb-3">
            <div className="text-xs font-medium text-neutral-600 mb-1">Capabilities</div>
            <div className="flex flex-wrap gap-1">
              {CAPABILITY_DEFS.map((def) => {
                const status = resolveCapability(meta, def);
                return (
                  <span
                    key={def.explicitKey}
                    className={cn(
                      'px-2 py-0.5 text-xs rounded border',
                      status === 'yes' && 'bg-green-50 border-green-300 text-green-700',
                      status === 'no' && 'bg-red-50 border-red-200 text-red-600',
                      status === 'unknown' && 'bg-neutral-50 border-neutral-200 text-neutral-400',
                    )}
                    title={
                      status === 'yes'
                        ? 'Supported'
                        : status === 'no'
                        ? 'Not supported'
                        : 'Not reported by server'
                    }
                  >
                    {status === 'yes' ? '✓' : status === 'no' ? '✗' : '?'} {def.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-xs text-neutral-600 space-y-0.5">
          <div>Limits: {limits.length > 0 ? limits.join(', ') : 'not specified'}</div>
          <div>
            Supported parameters:{' '}
            {supportedParams ? supportedParams.length : 'unknown'}
          </div>
        </div>

        <details className="mt-3">
          <summary className="text-xs font-medium text-neutral-600 cursor-pointer hover:text-neutral-800">
            Show raw JSON
          </summary>
          <pre className="mt-2 text-xs whitespace-pre-wrap break-all bg-white border border-neutral-300 rounded p-2 max-h-60 overflow-auto">
            {JSON.stringify(info, null, 2)}
          </pre>
        </details>
      </div>
    </details>
  );
}
