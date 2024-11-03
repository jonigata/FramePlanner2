import './app.postcss'
import FarmApp from './FarmApp.svelte'
import { initPaperJs } from "manga-renderer";

initPaperJs();

const app = new FarmApp({
  target: document.getElementById("app")!,
});

export default app
