import './app.postcss'
import FarmApp from './FarmApp.svelte'
import { initializeApp } from "./firebase";

function getDomainFromCurrentUrl(): string {
  const currentUrl = window.location.href;
  const urlObj = new URL(currentUrl);
  return urlObj.host;
}
initializeApp(getDomainFromCurrentUrl())

const app = new FarmApp({
  target: document.getElementById("app")!,
});

export default app

import { register } from 'swiper/element/bundle';
register();

function loadFont(family: string, filename: string, weight: string) { 
  const url = new URL(`./assets/fonts/${filename}.woff2`, import.meta.url).href;
  const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });
  document.fonts.add(font);
}
loadFont('源暎アンチック', 'GenEiAntiqueNv5-M', '400');
loadFont('源暎エムゴ', 'GenEiMGothic2-Black', '700');
