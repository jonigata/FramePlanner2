import { getDatabase, ref, push, set, child } from "firebase/database";

export type Publication = {
  author: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  coverUrl: string;
  contentUrl: string;
}

export async function recordPublication(publication: Publication) {
  const db = getDatabase();
  const publicationRef = push(child(ref(db), 'publications'));
  const timestamp = Date.now();
  
  await set(publicationRef, {
    ...publication,
    favorite: 0,
    viewCount: 0,
  });
}
