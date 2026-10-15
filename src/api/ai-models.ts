/**
 * Shared types and providers for the agent harness.
 *
 * The flow is:
 *   1. A `Provider` is given a transcript and a list of tool schemas.
 *   2. It returns a `ProviderResponse` — either a piece of text or a tool call.
 *   3. The harness (`src/harness/agent.ts`) handles each kind of response,
 *      invoking tools as needed and feeding results back into the transcript.
 */

/** Convenience alias for a plain string-keyed map. */
export type StringDict = Record<string, string>;

/** The role of a message in a transcript. String-valued so it serializes cleanly. */
export enum Role {
  User = "user",
  Assistant = "assistant",
}

/** Discriminator for `ProviderResponse`. */
export type ProviderResponseKind = "text" | "tool_call";

/**
 * What a provider gives back from a `complete` call.
 *
 * - When `kind` is `"text"`, `text` holds the assistant's reply.
 * - When `kind` is `"tool_call"`, `toolName`, `toolArgs`, and `toolCallId`
 *   describe the tool the provider wants to invoke.
 */
export interface ProviderResponse {
  kind: ProviderResponseKind;
  text: string | null;
  toolName: string | null;
  toolArgs: Record<string, unknown> | null;
  toolCallId: string | null;
}

/** A callable tool. Takes any args, returns a string result. */
export type ToolFn = (...args: unknown[]) => string;

/** A map from tool name to its implementation. */
export type ToolMap = Record<string, ToolFn>;

/** A transcript entry that records a tool invocation by the assistant. */
export interface ToolUseContent {
  type: "tool_use";
  name: string;
  id: string | null;
  input: Record<string, unknown> | null;
}

/** A transcript entry that records the result of a tool invocation. */
export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string | null;
  content: string;
}

/** Anything that can appear inside a `TranscriptMessage.content` array. */
export type ContentBlock = ToolUseContent | ToolResultContent | string;

/** A single message in a conversation transcript. */
export interface TranscriptMessage {
  role: Role;
  content: ContentBlock[] | string;
}

/**
 * Anything that can produce a `ProviderResponse` given a transcript
 * and the available tool schemas.
 */
export interface Provider {
  complete(transcript: Record<string, unknown>[], tools: Record<string, unknown>[]): ProviderResponse;
}

/**
 * A scripted provider for teaching and testing.
 *
 * Walks through a fixed list of responses, one per call. Throws if asked
 * for more responses than it was given.
 */
export class MockProvider implements Provider {
  private readonly _responses: ProviderResponse[];
  private _index: number = 0;

  constructor(responses: ProviderResponse[]) {
    this._responses = [...responses];
  }

  complete(_transcript: Record<string, unknown>[], _tools: Record<string, unknown>[]): ProviderResponse {
    if (this._index >= this._responses.length) {
      throw new Error("mock ran out of responses");
    }
    const response = this._responses[this._index];
    this._index++;
    return response;
  }
}
