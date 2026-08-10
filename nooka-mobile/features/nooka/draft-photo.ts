import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CropState } from './photo-crop.ts';
import { requiresJpegNormalization } from './photo-format.ts';

export type DraftPhoto = {
  id: string;
  uri: string;
  width: number;
  height: number;
  contentType: string;
  fileName: string;
  livePhoto: boolean;
  crop: CropState;
};

export type IncomingDraftPhoto = Omit<DraftPhoto, 'id' | 'uri' | 'crop'> & {
  uri: string;
};

const DRAFT_DIRECTORY = new Directory(Paths.document, 'checkin-drafts');

export function persistDraftPhoto(photo: IncomingDraftPhoto): DraftPhoto {
  DRAFT_DIRECTORY.create({ intermediates: true, idempotent: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const extension = photo.fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const destination = new File(DRAFT_DIRECTORY, `${id}.${extension}`);
  new File(photo.uri).copy(destination);
  return {
    ...photo,
    id,
    uri: destination.uri,
    crop: { zoom: 1, offsetX: 0, offsetY: 0 },
  };
}

export async function prepareDraftPhoto(photo: IncomingDraftPhoto): Promise<DraftPhoto> {
  if (!requiresJpegNormalization(photo.contentType, photo.fileName)) {
    return persistDraftPhoto(photo);
  }

  const context = ImageManipulator.manipulate(photo.uri);
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  try {
    return persistDraftPhoto({
      ...photo,
      uri: result.uri,
      width: rendered.width,
      height: rendered.height,
      contentType: 'image/jpeg',
      fileName: `${photo.fileName.replace(/\.[^.]+$/u, '') || 'photo'}.jpg`,
    });
  } finally {
    const temporary = new File(result.uri);
    if (temporary.exists) temporary.delete();
  }
}

export function deleteDraftPhoto(photo: DraftPhoto): void {
  const file = new File(photo.uri);
  if (file.exists) file.delete();
}
