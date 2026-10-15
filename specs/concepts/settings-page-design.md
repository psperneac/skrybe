# Settings Page Design

Status: early-stage idea, not implemented.

## Current state

- [src/renderer/app/SettingsPage.tsx](src/renderer/app/SettingsPage.tsx) is a full-screen React view.
- [src/renderer/app/App.tsx](src/renderer/app/App.tsx) toggles `showSettings` and replaces the entire root view with `<SettingsPage />` when true.
- It already *behaves* like a modal (conditional mount, close X button, no route) but occupies the full canvas.
- Persists named AI configs via IPC to `~/.skrybe.json` (see [src/main/config.ts](src/main/config.ts)).

## Concern: modal vs page replacement

Three options considered:

| Option | Pros | Cons |
| --- | --- | --- |
| Full-canvas replace (today) | Simple, lots of space, no layering | Loses chat context, ambiguous semantics |
| True modal/dialog | Preserves chat underneath, `Esc` to dismiss, familiar pattern | Needs z-index/backdrop coordination, cramped for forms |
| Side drawer | Slides in, keeps vertical chat visible | Hides chat horizontally, narrow for form fields |

### Recommendation

Keep the full-canvas focus-mode pattern but **rename and treat it as a full-screen overlay**, not a navigation event. Rationale:

- Settings needs the space (endpoint field, model chip-list, range slider, error states).
- It's not a destination you navigate to — it's contextual configuration.
- Users will frequently flip back and forth; we want both views to stay alive (the chat should not unmount when settings opens).

The implementation win is moving chat state out of `App.tsx` root so both views can coexist without remounting. The rendering pattern stays roughly the same.

## Future design: tabbed settings

The settings view needs to grow beyond endpoints/models. Proposed layout:

```text
┌──────────────────────────────────────────────────────────┐
│ ⚙ Settings                                          [X] │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ ▸ Endpts │   Active tab content                          │
│   Models │   (form, list, etc.)                          │
│          │                                               │
│   Appear │                                               │
│          │                                               │
│   Behav. │                                               │
│          │                                               │
│   Keys   │                                               │
│          │                                               │
│   Priv.  │                                               │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

### Navigation choice: vertical tabs (left rail)

- Vertical tabs scale better as categories are introduced.
- Each row carries an icon + label, room for a future "modified" dot indicator.
- Horizontal tabs would cap us at ~5 categories before wrapping.

### Initial categories (not exhaustive)

- **Endpoints & Models** — the existing SettingsPage, refactored into a sub-view
- **Appearance** — theme, font size, density
- **Behavior** — auto-save, history, defaults
- **Shortcuts** — keybindings
- **Privacy** — data storage location, telemetry

### Open questions

- Do we want a search/filter across settings (Command-K style)?
- Should settings draft changes survive app restarts (separate from saved config)?
- How many categories before we need a tree instead of a flat list?
- Does the "Endpoints & Models" view itself deserve sub-tabs (Endpoints / Models / Templates)?

## Migration path

1. Lift chat state out of `App.tsx` root into a session store so settings and chat stay mounted together.
2. Reframe `showSettings` as an overlay (rename to `settingsOpen` or similar).
3. Add a left-rail nav skeleton with one entry: "Endpoints & Models".
4. Move the current form into the right pane of that skeleton.
5. Add remaining categories as stubs.
6. Persist the last-opened settings tab.