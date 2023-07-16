import { writable } from "svelte/store";
import type { FileSystem } from "./lib/filesystem/fileSystem";
import { MockFileSystem } from "./lib/filesystem/mockFileSystem";
import { makeSample } from "./lib/filesystem/sampleFileSystem";

export const fileManagerOpen = writable(false);
export const fileSystem: FileSystem = null;
export const trashUpdateToken = writable(false);
