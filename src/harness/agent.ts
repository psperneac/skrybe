import {
  Provider,
  ProviderResponse,
  Role,
  ToolFn,
  ToolMap,
  ToolUseContent,
  ToolResultContent,
  TranscriptMessage,
} from "../api/ai-models";

/**
 * Maximum number of model/tool round-trips before the harness gives up.
 * Prevents infinite loops when the provider keeps emitting tool calls.
 */
export const MAX_ITERATIONS = 20;

/**
 * Run a single agent turn against a provider.
 *
 * Starts a transcript with the user message, then loops up to
 * `MAX_ITERATIONS` times:
 *
 *   - On a `"text"` response, appends it to the transcript and returns it.
 *   - On a `"tool_call"` response, looks up the tool by name, invokes it
 *     with the response's args, and appends both the tool use and its
 *     result back into the transcript before looping again.
 *
 * @param provider    The model/provider to query.
 * @param tools       Map of tool name → callable. Called when the provider
 *                    asks for a tool the harness knows about.
 * @param toolSchemas Schemas describing available tools, passed to the
 *                    provider on every call so it knows what's available.
 * @param userMessage The initial user message to seed the transcript with.
 * @returns The final assistant text once the provider stops calling tools.
 * @throws  If the provider returns a malformed tool call, references an
 *          unknown tool, returns an unexpected `kind`, or fails to produce
 *          a text response within `MAX_ITERATIONS` rounds.
 */
export function run(
  provider: Provider,
  tools: ToolMap,
  toolSchemas: Record<string, unknown>[],
  userMessage: string
): string {
  const transcript: TranscriptMessage[] = [
    { role: Role.User, content: userMessage }
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response: ProviderResponse = provider.complete(
      transcript as unknown as Record<string, unknown>[],
      toolSchemas
    );

    if (response.kind === "text") {
      // finally got a text answer, return to user
      transcript.push({ role: Role.Assistant, content: response.text ?? "" });
      return response.text ?? "";
    }

    if (response.kind === "tool_call") {
      // model wants us to call a tool, so do it and append the result to the transcript
      if (response.toolName === null) {
        throw new Error("tool_call response is missing tool_name");
      }
      if (!(response.toolName in tools)) {
        throw new Error(`unknown tool: ${response.toolName}`);
      }

      const toolFn: ToolFn = tools[response.toolName];
      // tool call
      const result = toolFn(...(Object.values(response.toolArgs ?? {})));

      const toolUse: ToolUseContent = {
        type: "tool_use",
        name: response.toolName,
        id: response.toolCallId,
        input: response.toolArgs
      };
      const toolResult: ToolResultContent = {
        type: "tool_result",
        tool_use_id: response.toolCallId,
        content: result
      };

      // log the tool use and tool response in the transcript so the model can see it on the next round
      transcript.push({ role: Role.Assistant, content: [toolUse] });
      transcript.push({ role: Role.User, content: [toolResult] });
      continue;
    }

    // unexpected response kind
    // TODO: we could either ignore or add a hint for the model that we don't understand the response kind
    throw new Error(`unexpected response kind: ${response.kind}`);
  }

  // timeout: the model never returned a text response after MAX_ITERATIONS rounds
  throw new Error(`agent did not finish in ${MAX_ITERATIONS} iterations`);
}
