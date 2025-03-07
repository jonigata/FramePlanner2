import "./app.postcss";
import App from "./App.svelte";
import { initializeApp } from "./firebase";
import { initPaperJs } from "./lib/layeredCanvas/tools/draw/bubbleGraphic"

window.name = "frameplanner";

initPaperJs();

function getDomainFromCurrentUrl(): string {
  const currentUrl = window.location.href;
  const urlObj = new URL(currentUrl);
  return urlObj.host;
}
initializeApp(getDomainFromCurrentUrl())

const app = new App({
  target: document.getElementById("app")!,
});

export default app;

// console.tagという関数を定義
// console.tag("commit", page.revision, [...page.history], page.historyIndex)　とすると
// console.log("%ccommit", "color:white; background-color:cyan; padding:2px 4px; border-radius:4px;", page.revision, [...page.history], page.historyIndex)
// のように展開される

declare global {
  export interface Console {
    tag(tag: string, ...args: any[]): void;
    snapshot(obj: any): void;
  }
}

console.tag = function(tag, color, ...args) {
  console.log(`%c${tag}`, `color:white; background-color:${color}; padding:2px 4px; border-radius:4px;`, ...args);
  // console.trace();
}

console.snapshot = function(obj) {
  // chromeのデバッガではその後に値を変更されてもコンソール出力に反映されてしまうので、
  // JSON.parse(JSON.stringify(obj)) でコピーを作成している
  const s = JSON.parse(JSON.stringify(obj, null, 2));
  console.tag("snapshot", "#778899", s);
}

function loadFont(family: string, filename: string, weight: string) { 
  const url = `/fonts/${filename}.woff2`;
  console.log(`loading font: ${family} ${weight} ${url}`);
  const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });
  document.fonts.add(font);
}
loadFont('源暎アンチック', 'GenEiAntiqueNv5-M', '400');
loadFont('源暎エムゴ', 'GenEiMGothic2-Black', '700');

import { register } from 'swiper/element/bundle';
register();

import { assurePreferences } from "./preferences";
assurePreferences();
