import "./app.postcss";
import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app"),
});

export default app;

// console.tagという関数を定義
// console.tag("commit", page.revision, [...page.history], page.historyIndex)　とすると
// console.log("%ccommit", "color:white; background-color:cyan; padding:2px 4px; border-radius:4px;", page.revision, [...page.history], page.historyIndex)
// のように展開される

declare global {
  export interface Console {
    tag(tag: string, ...args: any[]): void;
  }
}

console.tag = function(tag, color, ...args) {
  console.log(`%c${tag}`, `color:white; background-color:${color}; padding:2px 4px; border-radius:4px;`, ...args);
  // console.trace();
}
