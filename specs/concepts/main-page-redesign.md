# Main Page Redesign — Multi-Tab AI Harness

Status: early-stage idea, not implemented.

## Current state

- [src/renderer/app/App.tsx](src/renderer/app/App.tsx) is a single-page chat UI.
- All session state hoisted into root: `messages`, `prompt`, `isLoading`, `selectedConfig`, `modelInfoCache`.
- One chat per app instance. Settings replaces the whole canvas when open.

## Goals

- Multiple concurrent chat/AI sessions, switched via tabs.
- Left sidebar: hierarchical action tree (sessions, tools, agents, prompts, history).
- Right sidebar: auto-hide properties panel for the focused element.
- Position the app as an **AI agent harness**, not a single chat.

## Target layout

```text
┌──────────────────────────────────────────────────────────┐
│ [Tab A] [Tab B] [Tab C] [+]                  · · ·     │ ← tab bar
├──────────┬──────────────────────────────┬────────────────┤
│          │                              │                │
│  Left    │   Active tab content        │  Right panel   │
│  rail    │   (chat / agent run /       │  (auto-hide)   │
│          │    code review / etc.)       │                │
│  ▸ Sess. │                              │  Properties    │
│    Rec.  │                              │  of focused    │
│    Save. │                              │  item          │
│  ▸ Tools │                              │                │
│  ▸ Agnt. │                              │                │
│  ▸ Prmpt │                              │                │
│  ▸ Hist. │                              │                │
│          │                              │                │
└──────────┴──────────────────────────────┴────────────────┘
```

### Center: tabbed content

- Each tab = one session (chat, agent run, code review, future: image gen, etc.).
- Tab state: messages, prompt input, scroll position, isLoading, session metadata, model selection.
- Tabs stay mounted when switching (preserve scroll/input) — virtualize only if count is large.
- A tab type may eventually differ from chat (e.g. agent run shows tool calls inline).

### Left rail: action tree

Hierarchical because future tools/agents can nest. Initial categories:

- **Sessions** — Recent, Saved (with nested folders later)
- **Tools** — Code search, File ops, Web fetch (future)
- **Agents** — Custom agent definitions (future)
- **Prompts** — Saved prompt templates (future)
- **History** — Closed sessions, searchable

Tree, not flat list, because once we have a few custom agents, agents with sub-agents, the hierarchy pays off.

### Right panel: auto-hide properties

- Slides in on focus / hover / selection of an element.
- Hides when focus leaves (with a small delay so the cursor can reach it).
- Initial content:
  - Hover a chat message → metadata (timestamp, model, token count, raw reasoning).
  - Hover a model chip → model info (replaces the current ModelInfoPanel).
  - Select a session in the left rail → session metadata (created, message count, tokens, config used).
  - Select a tool → tool config + last run.
- Width is configurable; auto-hide animation lives in the shell, not each panel.

## State architecture

The biggest blocker is state. Current `App.tsx` owns *everything*. Once tabs exist, that breaks.

### State split

| Scope | Holds | Lives in |
| --- | --- | --- |
| Global | app settings, config list, current selected config, theme, sidebar widths | shell store (zustand/context) |
| Per-tab | messages, prompt, scroll, isLoading, session metadata, model info cache for this session | tab-scoped store keyed by tab id |
| Ephemeral UI | active selection, hover state, panel visibility | component-local state |

### Persistence

- Open tab **ids** survive restart (the rest reloads from session store on demand).
- Per-tab state survives restart *if* the session is saved; otherwise it's discarded on app close.
- Active config selection is global, but a tab may override (e.g. "use this model for this run").

### What changes in `App.tsx`

Practically everything:

- Remove `messages`, `prompt`, `selectedConfig`, `modelInfoCache`, `fetchedModels` from root.
- Add a tab store + a current-tab-id selector.
- Render the active tab's view inside the center pane.
- The top dropdown menu (Query Models / Refresh Model Info / Delete Chat / Settings) becomes either a per-tab menu or a shell menu — TBD.

## Open questions

- Should the chat input live in the tab or in the shell? (If per-tab, switching tabs while typing preserves the draft. If shell, simpler but loses drafts.)
- Per-tab vs global "active config"? Global with per-tab override is my lean.
- Max open tabs? Lazy-mount when count gets large?
- Does the left rail act on the active tab, or open its own sub-view (overriding the tab)?
- How does the properties panel trigger — hover, click, keyboard?

## Migration path

1. Lift chat state out of `App.tsx` root into a session-store abstraction (one session, in-memory). Settings stops unmounting the chat.
2. Wrap the chat view in a "tab" abstraction (id + state). Still one tab.
3. Add a tab bar with a `[+]` button that creates a new tab. State per tab.
4. Add the left rail skeleton (Sessions only, listing open tabs).
6. Add the right properties panel skeleton (model info on hover only, to start).
7. Refactor settings into a tabbed page (see [settings-page-design.md](settings-page-design.md)).
8. Flesh out remaining left-rail categories.

## Notes / non-goals (for now)

- No drag-and-drop tab reordering yet.
- No split views (two tabs side by side).
- No tab persistence across restarts until the persistence story is clearer.
- No new agent/tool runtime work — only the shell that will host it.