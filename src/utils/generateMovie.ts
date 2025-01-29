import { get } from 'svelte/store';
import { fileSystem } from '../filemanager/fileManagerStore';
import type { ImageToVideoRequest } from '$protocolTypes/imagingTypes';
import { Film, FilmStack } from '../lib/layeredCanvas/dataModels/film';
import { ImageMedia, VideoMedia } from '../lib/layeredCanvas/dataModels/media';
import { waitDialog } from '../utils/waitDialog';
import { image2Video } from '../supabase';
import { saveRequest } from '../filemanager/warehouse';
import { loading } from './loadingStore';

export async function generateMovie(filmStack: FilmStack, film: Film) {
  if (!(film.media instanceof ImageMedia)) { return; }

  const request = await waitDialog<ImageToVideoRequest>('videoGenerator', { media: film.media });
  console.log("modalFrameVideo", request);

  if (!request) { return; }

  loading.set(true);
  const { request_id } = await image2Video(request);
  await saveRequest(get(fileSystem)!, "video", "kling", request_id);

  const newMedia = new VideoMedia({ mediaType: "video", mode: "kling", requestId: request_id });
  const newFilm = new Film(newMedia);

  const index = filmStack.films.indexOf(film);
  filmStack.films.splice(index + 1, 0, newFilm);
  loading.set(false);
}