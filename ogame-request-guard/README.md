# OGame Request Guard — developer guide

Every tolerated tool that makes network requests sends them through the **OGame Request Guard**: one small JavaScript file, published by the ToolDev team, that your tool ships unchanged. The guard lets requests to the game's pages (everything under `/game/`) happen only when the player causes them: when a page loads, or when they click or press a key. It refuses them on a timer, in the background, or from any other trigger. Requests to the game's public API and to your own servers go through it too, to the paths and origins you declare.

This keeps the rule on background calls and polling (Forbidden Features, category 5) out of your way: if your requests go through the guard, they cannot break it by accident.

## What you get

| File | What it is |
|---|---|
| `ogame-request-guard.js` | The guard. **Do not modify it**, not even whitespace. Its SHA-256 is published, and a copy that does not match is a breach of toleration. |
| `ogame-request-guard.d.ts` | TypeScript types, optional. |
| `ogame-request-guard.releases.tsv` | Every released version with its SHA-256, and whether it is current, accepted until a date, or withdrawn. |

Published in the `ogame-request-guard/` folder of https://github.com/Rivenscryr/origin-tooldev-agents, beside this guide, with the current hash: `a35409950d9b8f515521de863ec84ca9864eb6b763c472cfa2c115173726f5ef`.

## Rules

1. **Every request your tool makes goes through the guard.** No `fetch`, `XMLHttpRequest`, `$.ajax`, `$.get`, `$.post`, `GM_xmlhttpRequest`, `WebSocket`, `EventSource` or `sendBeacon` anywhere else in your code, the background included.
2. **No requests of your own from the page's world.** Content scripts with `"world": "MAIN"`, and userscripts with `@grant none`, `@inject-into page` or `auto`, or `@sandbox raw`, run where the page and other scripts can tamper with the guard. Make your requests from a normal content script or a sandboxed userscript.
3. **No libraries that bring their own request code.** Full jQuery contains `$.ajax`. If you need jQuery, use its `slim` build.
4. **Declare every endpoint and every external origin**, each with a reason.
5. **Ship the guard byte-identical**, as its own file, never bundled or minified into your code.

These are fine and need no guard:

- **Reading your own packaged files**: `fetch(chrome.runtime.getURL('data.json'))`. It reaches only your extension's files. Only this form is exempt: read packaged files with `fetch`, not `XMLHttpRequest`.
- **Watching the game's own requests**, for example by hooking `XMLHttpRequest.prototype.open`, as long as the hook only reads and sends nothing of its own.
- **Calling the game's own functions**, such as fleet dispatch, from a handler for the player's click or key press.

**The guard only sees requests.** What your tool does without a request of its own, such as clicking game elements from code, submitting forms, reloading the page or redirecting it, is outside the guard. Keeping those within the rules is your responsibility (Forbidden Features, categories 3 to 5).

## Installing

### Browser extension (Chromium and Firefox)

Put `ogame-request-guard.js` into your extension unchanged and list it in each content script entry that makes requests:

```json
"content_scripts": [{
  "matches": ["https://*.ogame.gameforge.com/game/*"],
  "js": ["ogame-request-guard.js", "content.js"]
}]
```

**With WXT or another bundler**, keep the guard out of the bundle. Put it in `public/`, which is copied as is, and add it to the manifest after the build:

```ts
// wxt.config.ts
export default defineConfig({
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      for (const script of manifest.content_scripts ?? []) {
        script.js = ['ogame-request-guard.js', ...(script.js ?? [])];
      }
    },
  },
});
```

Check the built file: `sha256sum .output/*/ogame-request-guard.js` must print the published hash.

### Userscript

Load the guard with `@require` from its release tag, with the published hash after `#sha256=`, and run sandboxed, with a `@grant` other than `none`. The link to a release tag never changes, so your userscript keeps working until that version stops being accepted:

```js
// ==UserScript==
// @name         My Tool
// @match        https://*.ogame.gameforge.com/game/*
// @require      https://raw.githubusercontent.com/Rivenscryr/origin-tooldev-agents/guard-v1.0.0/ogame-request-guard/ogame-request-guard.js#sha256=a35409950d9b8f515521de863ec84ca9864eb6b763c472cfa2c115173726f5ef
// @grant        GM_info
// ==/UserScript==
```

## Starting up

**Browsers do not guarantee the order in which content scripts load**, so never read the guard directly. Queue your start-up instead. It runs as soon as both the guard and your code are there, whichever loaded first:

```js
(globalThis.OGameRequestGuardReady ??= []).push((G) => {
  const guard = G.create({
    tool: 'My Tool',
    game: [
      { path: '/api/serverData.xml', reason: 'universe settings, from the public API' },
      { page: 'ingame', component: 'galaxy', action: 'fetchSolarSystemData', method: 'POST', reason: 'notes per system, when the player navigates' },
      { page: 'componentOnly', component: 'externaldataexport', action: 'accountInfo', reason: 'account state, when the player clicks Refresh' },
    ],
    external: [{ origin: 'https://example.org', reason: 'alliance sync, with the player\'s consent' }],
  });

  // … the rest of your tool, using guard
});
```

Call `create()` once per tool in each place your code runs: once in your content script, and once in your background if it makes requests. Each declares what is requested from there. A game endpoint is declared either by `path` (such as `/api/serverData.xml`) or by `page`, `component` and `action` for `/game/index.php`. `method` defaults to `GET`. An external origin is `https://` with no path.

## Making requests

### On page load

```js
guard.fetch(G.PAGE_LOAD, '/game/index.php?page=componentOnly&component=externaldataexport&action=accountInfo&asJson=1', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

`G.PAGE_LOAD` is valid for **3 seconds** after the guard loaded, for **one request per endpoint**. Make your start-up requests right away. A later attempt is refused.

### When the player clicks or presses a key

Pass the event to the guard **inside its handler**:

```js
button.addEventListener('click', (event) => {
  guard.fetch(event, '/game/index.php?page=componentOnly&component=externaldataexport&action=accountInfo&asJson=1', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
});
```

The event must be one the player caused: `click`, `dblclick`, `auxclick`, `contextmenu`, mouse or pointer down and up, touch start and end, key down and up. Events your code dispatches, and events like `load`, `focus`, `input` or `submit`, do not count.

**Each event allows one request per endpoint.** Two different endpoints from one click are fine; the same endpoint twice is refused.

### When you await something first: tickets

**The event is only valid while the browser is handling it, and handling ends at your first `await`.** If you need to wait for something first, take a ticket before the first `await` and pass the ticket instead:

```js
button.addEventListener('click', async (event) => {
  const ticket = guard.ticket(event);          // before any await
  const settings = await loadSettings();
  const answer = await guard.fetch(ticket, urlA);
  await guard.fetch(ticket, urlB);             // another endpoint, same click
});
```

A ticket is valid for **10 seconds** and shares its click's budget: still one request per endpoint.

A ticket can also be kept from the player's last input and spent by the next request your tool makes within those 10 seconds.

### Batching features: series

Some batching features can be tolerated as an exception, such as queuing several shipyard orders with one click. **Each needs ToolDev's explicit approval.** Declare it with `series`, the number of requests one click may make to that endpoint. **Declare the largest number the feature can reach**, even if it usually needs fewer:

```js
{ page: 'ingame', component: '<component>', action: '<action>', method: 'POST', series: 10, reason: 'one click queues up to 10 shipyard orders' }
```

- Use a ticket: start the first request within its 10 seconds.
- Space the requests **at least 100 ms apart**, measured between your calls to `guard.fetch`.
- A refused request does not use up a request of the series.
- After that, the series may run past the ticket's 10 seconds. It ends when more than **10 seconds** pass between two requests; the rest of it is refused.
- Page load still allows one request per endpoint.
- The guard logs each request of a series to the console at debug level, with its number and the time since the previous one.

A `series` that was not approved is a breach of toleration, like an undeclared endpoint.

### From the game's public API

The XML files under `/api/` are public. Request them with `fetchApi`, with no trigger:

```js
guard.fetchApi('/api/serverData.xml');
guard.fetchApi('https://s1-en.ogame.gameforge.com/api/players.xml'); // from a background: the full URL
```

- Declare each path, as `GET` or `HEAD`. A query such as `?toJson=1` is fine.
- Only on a universe server (`s1-en.ogame.gameforge.com` and the like). Of the lobby, only `https://lobby.ogame.gameforge.com/api/servers`.
- The guard sends them **without cookies and without headers**. They need neither: do not pass any.
- This works from a content script and from your background.
- **Do not poll them.** The files update at fixed intervals, and repeated requests are unnecessary server load (Forbidden Features, category 5). The review lists every `fetchApi` with what calls it, timers included.

### From your background

Your background may request the public API (`fetchApi`) and your own servers (`fetchExternal`). **Everything under `/game/` is requested from your content script, in response to the player: never from the background, and never by the background asking a tab to make the request for it.**

### To your own servers

```js
guard.fetchExternal('https://example.org/api/sync', { method: 'POST', body: JSON.stringify(data) });
```

No trigger is needed. The origin must be declared. Sending the player's data off their machine needs their informed consent (Forbidden Features, category 8).

### Request bodies to the game

- A body is a string in form encoding (`a=1&b=2`), `URLSearchParams` or `FormData`. Other kinds are refused.
- Do not set a `Content-Type` yourself: the guard sets it. A string body may carry `application/x-www-form-urlencoded`, nothing else.
- `page`, `component` and `action` belong in the URL, written plainly and once, never in the body.
- Never send `cp`, in the URL or the body: it switches the player's active planet. The guard refuses it.
- At most 100 parameters in the URL, and 100 in the body.

What the guard sends is rebuilt from what it checked, so the request that reaches the server is exactly the one it allowed.

## When the guard refuses

Every refusal throws an `OGameRequestGuardError` before anything is sent. **Log every refusal while you develop**: a URL the game page supplies at run time may not match your declaration, and only a refusal shows it. The message says why:

| Message contains | Meaning | Fix |
|---|---|---|
| `not declared` | The URL, method or `action` is not in your declaration | Declare it with a reason, or correct the URL or method |
| `must be OGameRequestGuard.PAGE_LOAD, a ticket, or a real user-input event` | No trigger, a dispatched event, or an event that does not count | Request from a click or key handler, or on page load |
| `must be used while it is being handled` | The event was used after an `await` or later | Take `guard.ticket(event)` before the first `await` |
| `already requested for this event` / `on this page load` | That endpoint was already requested on this trigger | One request per endpoint per trigger, unless it is an approved series |
| `only valid for 3 s` / `ticket is older than 10 s` | Too late | Request sooner after the page load or the click |
| `never from a background` | Request under `/game/` from a background or worker | Make it from your content script, in response to the player |
| `goes through fetchApi()` | A path under `/api/` through `fetch` | Use `guard.fetchApi(url)` |
| `allows a series of` / `at least 100 ms apart` / `series lapsed` | Series rules | See *Batching features: series* |
| `never in the body` / `may only be sent as a form` / `let the guard set the Content-Type` | Body rules | See *Request bodies* |
| `cp changes the player's active planet` | `cp` in the URL or the body | Leave it out; read other planets' data from one `accountInfo` answer |

## What the review checks

Each version of a tolerated tool may be spot-checked. The check reads your package and never runs it:

- the guard file's hash, that it is loaded, and that a userscript runs sandboxed;
- any request code outside the guard;
- the manifest's permissions;
- every guarded request and the action that triggers it;
- every declared `series`.

A request on any click is allowed, but it is listed, so make each request belong to the action that causes it. That includes a ticket kept from the player's last input and spent by the next request within its 10 seconds.

## When the guard is updated

Each guard version is a release of the repository, tagged `guard-v<version>`, with its hash in the release notes. `ogame-request-guard.releases.tsv` in this folder lists every version and whether it is current, still accepted until a date, or withdrawn. When a new version is out, the previous one stays accepted for a stated period; update before it ends. Your changelog names the guard version you ship.
