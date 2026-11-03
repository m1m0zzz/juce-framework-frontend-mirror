# Migrating to `@juce-framework/webview`

[日本語版はこちら](./migration-ja.md)

`juce-framework-frontend-mirror` is **deprecated**.

Starting with JUCE 9.0.1, the JUCE team ships the `WebBrowserComponent` frontend library as an official TypeScript package on npm: [`@juce-framework/webview`](https://www.npmjs.com/package/@juce-framework/webview).
This project existed to mirror that JavaScript code to npm and add TypeScript types. The official package now does both, so this package will not be updated anymore.

## Which package should I use?

| JUCE version (C++ backend) | Frontend package |
| --- | --- |
| 9.0.1 or later | `@juce-framework/webview` (1.0.0 for JUCE 9.0.1 – 9.0.5) |
| 8.0.0 – 9.0.0 | `juce-framework-frontend-mirror@8.0.10` |
| 7.x or earlier | Not supported (JUCE has no WebView frontend library before 8.0.0) |

The frontend library was added in JUCE 8.0.0 and changed very little up to 9.0.0. The communication protocol with the backend stayed the same, so `juce-framework-frontend-mirror@8.0.10` (the last version) works with every JUCE version from 8.0.0 to 9.0.0. The only behaviour changes were bug fixes:

- JUCE 8.0.1: `SliderState.sliderDragStarted()` / `sliderDragEnded()` now send events to the backend (they did nothing in 8.0.0).
- JUCE 8.0.7: fixed `window.__JUCE__.backend.removeEventListener`. Inside a `WebBrowserComponent`, the backend object is injected by the C++ side, so this fix only takes effect with JUCE 8.0.7 or later.

> [!NOTE]
> `juce-framework-frontend-mirror@7.0.7` – `7.0.11` do not correspond to JUCE 7.
> They were numbered after the `version` field (`7.0.7`) of JUCE's internal `package.json`, and contain the code of JUCE 8.0.1 – 8.0.6.

> [!NOTE]
> `@juce-framework/webview` has its **own version number**, not the JUCE version.
> The version expected by the backend is the `version` field in
> `modules/juce_gui_extra/native/typescript/webview-interop/package.json` of your JUCE checkout.

## Migration steps

### 1. Update JUCE (C++ side)

Upgrade JUCE to 9.0.1 or later, then **resave the project with the matching Projucer or re-run CMake**.
The backend now needs the `JUCE_WEBVIEW_INTEROP_LIBRARY_VERSION` definition, which is generated from the package's `package.json`. If it is missing, the build fails with:

```
Missing JUCE_WEBVIEW_INTEROP_LIBRARY_VERSION definition. You should resave your build with the Projucer version that comes with this JUCE source file or regenerate it with CMake.
```

### 2. Replace the package

```bash
npm uninstall juce-framework-frontend-mirror
npm install @juce-framework/webview
```

### 3. Update imports

```diff
- import * as Juce from "juce-framework-frontend-mirror";
+ import * as Juce from "@juce-framework/webview";
```

The exported API is the same:
`getNativeFunction`, `getSliderState`, `getToggleState`, `getComboBoxState`, `getBackendResourceAddress`, `ControlParameterIndexUpdater`.

If you referenced this package's global types explicitly, remove that reference. The official package declares `window.__JUCE__` by itself as soon as it is imported.

```diff
- /// <reference types="juce-framework-frontend-mirror/global" />
```

### 4. Check `tsconfig.json`

- Include the `DOM` library in `lib`. This package shipped empty stub interfaces for projects without DOM. The official package needs the real DOM types (`Window`, `Element`, `MouseEvent`).
- The package is **ESM only** (`"type": "module"`, only an `import` condition in `exports`). Use a bundler (Vite, esbuild, etc.) or native ES modules. `require()` is not supported.

### 5. Fix type errors

The official types are stricter than the ones in this package. These are the changes you are most likely to hit.

#### `getNativeFunction` returns `Promise<unknown>`

It returned `Promise<any>` before. Narrow or assert the result.

```ts
const sayHello = Juce.getNativeFunction("sayHello");

// Before: const result: string = await sayHello("JUCE");
const result = (await sayHello("JUCE")) as string;
```

#### `getSliderState` / `getToggleState` / `getComboBoxState` never return `undefined`

The return types were `XxxState | undefined` before. They are now `XxxState`, which matches the actual behaviour: a new state object is created when the name is unknown. You can remove `?.`, `!` and `undefined` checks.

#### State class types are not exported

`SliderState`, `ToggleState` and `ComboBoxState` are not exported from the official package. Derive them from the getter functions:

```ts
type SliderState = ReturnType<typeof Juce.getSliderState>;
type ToggleState = ReturnType<typeof Juce.getToggleState>;
type ComboBoxState = ReturnType<typeof Juce.getComboBoxState>;
```

#### `valueChangedEvent` / `propertiesChangedEvent` listeners take no arguments

The listener type was `(args: any) => any`. It is now `() => void`, because listeners have always been called without a payload. Read the current value from the state object instead.

```ts
const slider = Juce.getSliderState("cutoff");

// Before: slider.valueChangedEvent.addListener((v) => console.log(v));
slider.valueChangedEvent.addListener(() => {
  console.log(slider.getNormalisedValue());
});
```

#### Use `window.__JUCE__`, not bare `__JUCE__`

This package declared `__JUCE__` as a global variable. The official package augments `interface Window` instead, so only `window.__JUCE__` is typed.

```diff
- __JUCE__.backend.emitEvent("myEvent", payload);
+ window.__JUCE__.backend.emitEvent("myEvent", payload);
```

#### Backend event payloads are `unknown`

The payload passed to `window.__JUCE__.backend.addEventListener` callbacks is now `unknown`, not `any`.

```ts
window.__JUCE__.backend.addEventListener("myEvent", (payload) => {
  const { value } = payload as { value: number };
  console.log(value);
});
```

#### `initialisationData` has a fixed shape

`window.__JUCE__.initialisationData` was `{ [key: string]: any }`. It is now a class with only JUCE's internal keys. To read your own data added with `WebBrowserComponent::Options::withInitialisationData`, cast it:

```ts
const initData = window.__JUCE__.initialisationData as unknown as Record<string, unknown>;
const myData = initData["myData"];
```

#### Other changes

- `ControlParameterIndexUpdater.lastControlParameterIndex` is now `number` (was `string | -1 | null`).
- `window.__JUCE__.postMessage` is now `(message: string) => void`.

### 6. Check the version at runtime

The official package checks at startup that the frontend and backend versions match.
On a mismatch, the C++ side hits a `jassert` in debug builds, and the browser console shows:

```
The backend expected a @juce-framework/webview version of X, but got Y. You should use matching backend and frontend versions.
```

When you upgrade JUCE, upgrade `@juce-framework/webview` to the version in that JUCE's `package.json`.
To make sure they always match, you can also depend on the package inside your JUCE checkout:

```json
{
  "dependencies": {
    "@juce-framework/webview": "file:<path-to-JUCE>/modules/juce_gui_extra/native/typescript/webview-interop"
  }
}
```

## References

- [`@juce-framework/webview` on npm](https://www.npmjs.com/package/@juce-framework/webview)
- [Source in the JUCE repository](https://github.com/juce-framework/JUCE/tree/master/modules/juce_gui_extra/native/typescript/webview-interop)
- [JUCE `BREAKING_CHANGES.md`](https://github.com/juce-framework/JUCE/blob/master/BREAKING_CHANGES.md)
- [WebViewPluginDemo (TypeScript)](https://github.com/juce-framework/JUCE/tree/master/examples/Plugins/WebViewPluginDemoGUI)
