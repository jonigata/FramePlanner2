import './app.postcss'
import ViewerApp from './ViewerApp.svelte'
import { initializeApp } from "./firebase";
import { initPaperJs } from "manga-renderer";

initPaperJs();

function getDomainFromCurrentUrl(): string {
  const currentUrl = window.location.href;
  const urlObj = new URL(currentUrl);
  return urlObj.host;
}
initializeApp(getDomainFromCurrentUrl())

const app = new ViewerApp({
  target: document.getElementById("app")!,
});

export default app

function loadFont(family: string, filename: string, weight: string) { 
  const url = new URL(`./assets/fonts/${filename}.woff2`, import.meta.url).href;
  const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });
  document.fonts.add(font);
}
loadFont('源暎アンチック', 'GenEiAntiqueNv5-M', '400');
loadFont('源暎エムゴ', 'GenEiMGothic2-Black', '700');


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

