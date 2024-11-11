import './app.postcss'
import ViewerApp from './ViewerApp.svelte'
import { initPaperJs } from "manga-renderer";

initPaperJs();

const app = new ViewerApp({
  target: document.getElementById("app")!,
});

export default app
