/**
 * Lightweight in-memory store for the user's main profile photo.
 * Used to instantly sync the tab bar icon when photos are reordered.
 */

type Listener = (photo: string | null) => void;

let mainPhoto: string | null = null;
const listeners: Set<Listener> = new Set();

/** Get the current main photo URL */
export function getMainPhoto(): string | null {
  return mainPhoto;
}

/** Set the main photo and notify all subscribers instantly */
export function setMainPhoto(photo: string | null): void {
  mainPhoto = photo;
  listeners.forEach((listener) => listener(photo));
}

/** Subscribe to main photo changes. Returns an unsubscribe function. */
export function subscribeMainPhoto(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

