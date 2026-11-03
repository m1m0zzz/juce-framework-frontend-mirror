# `@juce-framework/webview` への移行ガイド

[English](./migration.md)

`juce-framework-frontend-mirror` は **非推奨（deprecated）** になりました。

JUCE 9.0.1 から、`WebBrowserComponent` 用のフロントエンドライブラリが公式の TypeScript パッケージ [`@juce-framework/webview`](https://www.npmjs.com/package/@juce-framework/webview) として npm で配布されています。
このプロジェクトの目的は、JUCE 同梱の JavaScript を npm にミラーし、TypeScript の型を付けることでした。公式パッケージがその両方を提供するようになったため、今後このパッケージは更新しません。

## どのパッケージを使えばいいか

| JUCE のバージョン（C++ 側） | フロントエンドのパッケージ |
| --- | --- |
| 9.0.1 以降 | `@juce-framework/webview`（JUCE 9.0.1 〜 9.0.5 では 1.0.0） |
| 8.0.0 〜 9.0.0 | `juce-framework-frontend-mirror@8.0.10` |
| 7.x 以前 | 非対応（WebView 用のフロントエンドライブラリは JUCE 8.0.0 で追加） |

フロントエンドライブラリは JUCE 8.0.0 で追加され、9.0.0 まではほとんど変わっていません。C++ 側との通信の形式も同じままなので、最終版の `juce-framework-frontend-mirror@8.0.10` は JUCE 8.0.0 〜 9.0.0 のどのバージョンでも使えます。動作が変わったのは次のバグ修正だけです。

- JUCE 8.0.1: `SliderState.sliderDragStarted()` / `sliderDragEnded()` が C++ 側へイベントを送るようになった（8.0.0 では何もしなかった）
- JUCE 8.0.7: `window.__JUCE__.backend.removeEventListener` の不具合を修正。`WebBrowserComponent` 内では backend オブジェクトを C++ 側が注入するため、この修正が効くのは JUCE 8.0.7 以降だけです。

> [!NOTE]
> `juce-framework-frontend-mirror@7.0.7` 〜 `7.0.11` は JUCE 7 向けではありません。
> JUCE 内部の `package.json` の `version`（`7.0.7`）に合わせた番号で、中身は JUCE 8.0.1 〜 8.0.6 のコードです。

> [!NOTE]
> `@juce-framework/webview` のバージョン番号は JUCE 本体とは**別管理**です。
> C++ 側が期待するバージョンは、使用している JUCE の
> `modules/juce_gui_extra/native/typescript/webview-interop/package.json` の `version` です。

## 移行手順

### 1. JUCE（C++ 側）を更新する

JUCE を 9.0.1 以降に上げたあと、**対応するバージョンの Projucer でプロジェクトを保存し直すか、CMake を再実行**してください。
C++ 側では、パッケージの `package.json` から生成される `JUCE_WEBVIEW_INTEROP_LIBRARY_VERSION` 定義が必要になりました。これがないと次のエラーでビルドが止まります。

```
Missing JUCE_WEBVIEW_INTEROP_LIBRARY_VERSION definition. You should resave your build with the Projucer version that comes with this JUCE source file or regenerate it with CMake.
```

### 2. パッケージを入れ替える

```bash
npm uninstall juce-framework-frontend-mirror
npm install @juce-framework/webview
```

### 3. import を書き換える

```diff
- import * as Juce from "juce-framework-frontend-mirror";
+ import * as Juce from "@juce-framework/webview";
```

export されている API は同じです。
`getNativeFunction`、`getSliderState`、`getToggleState`、`getComboBoxState`、`getBackendResourceAddress`、`ControlParameterIndexUpdater`

このパッケージのグローバル型を明示的に参照していた場合は、その記述を削除してください。公式パッケージは import した時点で `window.__JUCE__` の型を宣言します。

```diff
- /// <reference types="juce-framework-frontend-mirror/global" />
```

### 4. `tsconfig.json` を確認する

- `lib` に `DOM` を含めてください。このパッケージは DOM なしの環境向けに空のスタブ型を同梱していましたが、公式パッケージは実際の DOM の型（`Window`、`Element`、`MouseEvent`）を必要とします。
- パッケージは **ESM 専用**です（`"type": "module"`、`exports` は `import` 条件のみ）。バンドラー（Vite、esbuild など）かネイティブ ES Modules で使ってください。`require()` には対応していません。

### 5. 型エラーを直す

公式の型は、このパッケージの型より厳密です。特に引っかかりやすい変更は次のとおりです。

#### `getNativeFunction` の戻り値が `Promise<unknown>` になった

以前は `Promise<any>` でした。結果を型ガードで絞り込むか、型アサーションしてください。

```ts
const sayHello = Juce.getNativeFunction("sayHello");

// 以前: const result: string = await sayHello("JUCE");
const result = (await sayHello("JUCE")) as string;
```

#### `getSliderState` / `getToggleState` / `getComboBoxState` は `undefined` を返さない

以前の戻り値の型は `XxxState | undefined` でした。今は `XxxState` で、実際の挙動（未知の名前でも新しい state オブジェクトを作って返す）と一致しています。`?.`、`!`、`undefined` チェックは削除できます。

#### State クラスの型が export されていない

`SliderState`、`ToggleState`、`ComboBoxState` は公式パッケージから export されていません。取得関数の戻り値から型を作ってください。

```ts
type SliderState = ReturnType<typeof Juce.getSliderState>;
type ToggleState = ReturnType<typeof Juce.getToggleState>;
type ComboBoxState = ReturnType<typeof Juce.getComboBoxState>;
```

#### `valueChangedEvent` / `propertiesChangedEvent` のリスナーは引数を受け取らない

リスナーの型は以前 `(args: any) => any` でしたが、今は `() => void` です。もともとリスナーは引数なしで呼ばれていました。現在の値は state オブジェクトから読んでください。

```ts
const slider = Juce.getSliderState("cutoff");

// 以前: slider.valueChangedEvent.addListener((v) => console.log(v));
slider.valueChangedEvent.addListener(() => {
  console.log(slider.getNormalisedValue());
});
```

#### `__JUCE__` ではなく `window.__JUCE__` を使う

このパッケージは `__JUCE__` をグローバル変数として宣言していました。公式パッケージは `interface Window` を拡張しているので、型が付くのは `window.__JUCE__` だけです。

```diff
- __JUCE__.backend.emitEvent("myEvent", payload);
+ window.__JUCE__.backend.emitEvent("myEvent", payload);
```

#### バックエンドからのイベントの payload が `unknown` になった

`window.__JUCE__.backend.addEventListener` のコールバックに渡される payload は、`any` ではなく `unknown` になりました。

```ts
window.__JUCE__.backend.addEventListener("myEvent", (payload) => {
  const { value } = payload as { value: number };
  console.log(value);
});
```

#### `initialisationData` の形が固定になった

`window.__JUCE__.initialisationData` は以前 `{ [key: string]: any }` でしたが、今は JUCE 内部のキーだけを持つクラスです。`WebBrowserComponent::Options::withInitialisationData` で追加した独自データを読むときはキャストしてください。

```ts
const initData = window.__JUCE__.initialisationData as unknown as Record<string, unknown>;
const myData = initData["myData"];
```

#### その他

- `ControlParameterIndexUpdater.lastControlParameterIndex` は `number` になりました（以前は `string | -1 | null`）。
- `window.__JUCE__.postMessage` は `(message: string) => void` になりました。

### 6. 実行時のバージョンチェックを確認する

公式パッケージは起動時に、フロントエンドと C++ 側のバージョンが一致しているかを確認します。
一致しない場合、C++ 側ではデバッグビルドで `jassert` が発火し、ブラウザのコンソールには次の警告が出ます。

```
The backend expected a @juce-framework/webview version of X, but got Y. You should use matching backend and frontend versions.
```

JUCE を更新したら、`@juce-framework/webview` もその JUCE の `package.json` にあるバージョンに合わせてください。
常に一致させたい場合は、JUCE のソース内にあるパッケージを直接依存に指定する方法もあります。

```json
{
  "dependencies": {
    "@juce-framework/webview": "file:<JUCE へのパス>/modules/juce_gui_extra/native/typescript/webview-interop"
  }
}
```

## 参考

- [npm の `@juce-framework/webview`](https://www.npmjs.com/package/@juce-framework/webview)
- [JUCE リポジトリ内のソース](https://github.com/juce-framework/JUCE/tree/master/modules/juce_gui_extra/native/typescript/webview-interop)
- [JUCE の `BREAKING_CHANGES.md`](https://github.com/juce-framework/JUCE/blob/master/BREAKING_CHANGES.md)
- [WebViewPluginDemo（TypeScript 版）](https://github.com/juce-framework/JUCE/tree/master/examples/Plugins/WebViewPluginDemoGUI)
