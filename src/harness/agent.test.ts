import { describe, it, expect, vi } from "vitest";

import { MockProvider, ProviderResponse, ToolFn } from "../api/ai-models";
import { run } from "./agent";

const textResponse = (text: string): ProviderResponse => ({
  kind: "text",
  text,
  toolName: null,
  toolArgs: null,
  toolCallId: null,
});

const toolCallResponse = (
  name: string,
  args: Record<string, unknown>,
  id: string | null = "call_1"
): ProviderResponse => ({
  kind: "tool_call",
  text: null,
  toolName: name,
  toolArgs: args,
  toolCallId: id,
});

describe("run", () => {
  it("returns the assistant text on a single text response", () => {
    const provider = new MockProvider([textResponse("hello there")]);

    const result = run(provider, {}, [], "hi");

    expect(result).toBe("hello there");
  });

  it("invokes the tool with the provider's args and uses the result", () => {
    const echoSpy = vi.fn((msg: string): string => `echo:${msg}`);
    const echo: ToolFn = (msg) => echoSpy(String(msg));

    const provider = new MockProvider([
      toolCallResponse("echo", { msg: "ping" }),
      textResponse("done"),
    ]);

    const result = run(provider, { echo }, [], "start");

    // The tool was called with the args from the provider's response.
    expect(echoSpy).toHaveBeenCalledTimes(1);
    expect(echoSpy).toHaveBeenCalledWith("ping");

    // The harness loops and returns the final text once the provider stops
    // calling tools.
    expect(result).toBe("done");
  });

  it("throws when the provider references an unknown tool", () => {
    const provider = new MockProvider([
      toolCallResponse("does_not_exist", {}),
    ]);

    expect(() => run(provider, {}, [], "go")).toThrow(/unknown tool/);
  });

  it("throws when the mock provider runs out of responses", () => {
    const provider = new MockProvider([textResponse("only one")]);

    run(provider, {}, [], "first");

    expect(() => run(provider, {}, [], "second")).toThrow(/mock ran out/);
  });
});
