import { writable, get } from "svelte/store";

export const developmentFlag = writable(false);
export const saveProhibitFlag = writable(false);

// localhostか127.0.0.1だったら
developmentFlag.set(location.hostname === "localhost" || location.hostname === "127.0.0.1");
console.log("================ developmentFlag", get(developmentFlag));
