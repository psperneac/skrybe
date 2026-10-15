# Event-driven run loop

The current `run()` in [src/harness/agent.ts](../src/harness/agent.ts) is a
synchronous `for` loop lifted from the Python tutorial: it calls
`provider.complete()` once, branches on the response kind, mutates a single
transcript, and either returns the text or loops again.

That shape works because `MockProvider.complete` is synchronous and because
Python doesn't have a UI event loop to interleave with. In a Node/TypeScript
context — especially inside an Electron renderer that wants to stream tokens
and show a "stop" button — the loop wants to be event-driven instead.

## Why an event-driven loop fits Node/TypeScript better

1. **Real providers are async.** `MockProvider.complete` is sync; OpenAI,
   Anthropic, anything HTTP is not. A loop that returns `Promise<string>`
   works for both without splitting the code into two paths.
2. **The UI wants to observe each step.** Right now the only way for the UI
   to learn what the agent is doing is to wait for `run()` to return. An
   event stream lets the renderer render tool calls as they happen and
   stream text chunks as they arrive.
3. **`AbortSignal` for cancellation.** The only escape hatch today is
   `MAX_ITERATIONS`. An event loop can be cancelled by the user, a parent
   timeout, or a UI button — which matters for a chat-style "stop" control.
4. **Yielding with `setImmediate`.** Stepping with `setImmediate` between
   iterations gives the event loop a chance to drain. Long-running tool
   calls, real provider calls (once async), and UI updates interleave
   naturally.
5. **Errors as events, not just throws.** Throws are still control flow,
   but every error also fires an `on({ type: "error", ... })` event. The UI
   can show "tool X failed" without wrapping the whole `run()` in a
   try/catch.
6. **No transcript cast in the hot path.** The transcript stays
   `TranscriptMessage[]` throughout. The widening cast to
   `Record<string, unknown>[]` happens once where the provider needs it.

## Sketch

```typescript
type AgentEvent =
  | { type: "turn_start"; userMessage: string }
  | { type: "provider_request"; turn: number; transcript: TranscriptMessage[] }
  | { type: "tool_call"; name: string; args: Record<string, unknown>; callId: string | null }
  | { type: "tool_result"; name: string; callId: string | null; content: string }
  | { type: "text"; text: string; turn: number }
  | { type: "turn_end"; text: string; transcript: TranscriptMessage[]; turns: number }
  | { type: "error"; error: Error };

type Listener = (event: AgentEvent) => void;

export interface RunOptions {
  provider: Provider;
  tools: ToolMap;
  toolSchemas: Record<string, unknown>[];
  userMessage: string;
  on: (event: AgentEvent) => void;
  signal?: AbortSignal;
}

export function run(opts: RunOptions): Promise<string> {
  const { provider, tools, toolSchemas, userMessage, on, signal } = opts;
  const transcript: TranscriptMessage[] = [
    { role: Role.User, content: userMessage }
  ];

  on({ type: "turn_start", userMessage });

  return new Promise((resolve, reject) => {
    let turn = 0;

    const handleToolCall = (response: ProviderResponse) => {
      if (response.toolName === null) {
        throw new Error("tool_call response is missing tool_name");
      }
      if (!(response.toolName in tools)) {
        throw new Error(`unknown tool: ${response.toolName}`);
      }

      on({
        type: "tool_call",
        name: response.toolName,
        args: response.toolArgs ?? {},
        callId: response.toolCallId,
      });

      const toolFn = tools[response.toolName];
      const result = toolFn(...Object.values(response.toolArgs ?? {}));

      on({
        type: "tool_result",
        name: response.toolName,
        callId: response.toolCallId,
        content: result,
      });

      const toolUse: ToolUseContent = {
        type: "tool_use",
        name: response.toolName,
        id: response.toolCallId,
        input: response.toolArgs,
      };
      const toolResult: ToolResultContent = {
        type: "tool_result",
        tool_use_id: response.toolCallId,
        content: result,
      };
      transcript.push({ role: Role.Assistant, content: [toolUse] });
      transcript.push({ role: Role.User, content: [toolResult] });
    };

    const step = () => {
      if (signal?.aborted) {
        const err = new Error("aborted");
        on({ type: "error", error: err });
        reject(err);
        return;
      }
      if (turn >= MAX_ITERATIONS) {
        const err = new Error(`agent did not finish in ${MAX_ITERATIONS} iterations`);
        on({ type: "error", error: err });
        reject(err);
        return;
      }

      on({ type: "provider_request", turn, transcript });

      let response: ProviderResponse;
      try {
        response = provider.complete(
          transcript as unknown as Record<string, unknown>[],
          toolSchemas,
        );
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        on({ type: "error", error: err });
        reject(err);
        return;
      }

      if (response.kind === "text") {
        const text = response.text ?? "";
        transcript.push({ role: Role.Assistant, content: text });
        on({ type: "text", text, turn });
        on({ type: "turn_end", text, transcript, turns: turn + 1 });
        resolve(text);
        return;
      }

      if (response.kind === "tool_call") {
        try {
          handleToolCall(response);
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          on({ type: "error", error: err });
          reject(err);
          return;
        }
        turn++;
        // Yield to the event loop so subscribers see each step and so
        // long-running work (real provider calls, async tools) can interleave.
        setImmediate(step);
        return;
      }

      const err = new Error(`unexpected response kind: ${response.kind}`);
      on({ type: "error", error: err });
      reject(err);
    };

    step();
  });
}
```

## How a consumer would use it

```typescript
const text = await run({
  provider,
  tools,
  toolSchemas,
  userMessage,
  on: (event) => {
    switch (event.type) {
      case "text": ui.appendToken(event.text); break;
      case "tool_call": ui.showToolStart(event.name); break;
      case "tool_result": ui.showToolEnd(event.name, event.content); break;
      case "error": ui.showError(event.error); break;
    }
  },
  signal: abortController.signal,
});
```

The `on` callback is where a streaming UI in the renderer would hook in —
emit `text` chunks as they arrive from the provider, render tool calls as
they happen, and let the user cancel. None of that is possible with the
current synchronous `for` loop.
