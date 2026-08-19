/**
 * Asks Supabase for an uploaded image at the size it is actually shown.
 *
 * MEASURED: the three event covers on the home page were being served at their
 * original 1920x2530 and displayed in a 320x427 card — thirty-six times the
 * pixels needed, 664kB each, taking eleven seconds to arrive on a phone on slow
 * 4G. At the width the card really uses they are 104kB. That is 1.7MB of the
 * client's page that nobody ever sees.
 *
 * She uploads straight from a phone or a camera roll, so the originals will
 * always be enormous; asking her to resize them first is asking her to do the
 * computer's job. Storage keeps the full-size original — the lightbox still
 * wants it — and the page requests a rendition.
 *
 * Anything that is not a Supabase storage URL comes back untouched, so a link
 * she pasted from elsewhere still works.
 */

/** Widths we ask for, in CSS pixels before device pixel ratio. */
export type ImageWidth = 320 | 640 | 800 | 1200 | 1600;

const STORAGE_OBJECT = '/storage/v1/object/public/';
const STORAGE_RENDER = '/storage/v1/render/image/public/';

/** Whether this is an image we host and can therefore resize. */
export const isStorageImage = (url: string): boolean =>
  typeof url === 'string' && url.includes(STORAGE_OBJECT);

/**
 * The same image, rendered at `width`.
 *
 * `quality` 70 is where webp stops being visibly better on photographs at these
 * sizes; the covers are dimmed to 50% brightness behind a gradient anyway.
 */
export function sizedImage(url: string, width: ImageWidth, quality = 70): string {
  if (!isStorageImage(url)) return url;
  const rendered = url.replace(STORAGE_OBJECT, STORAGE_RENDER);
  const join = rendered.includes('?') ? '&' : '?';
  // `resize=contain` is not optional. Supabase defaults to `cover`, and given a
  // width alone that returns 640x2530 from a 1920x2530 original — the full
  // original height, squashed into a third of the width. Verified by decoding
  // the bytes it actually returns, not by reading the docs. `contain` gives the
  // correct 640x843, and is smaller again: 65kB against 104kB.
  return `${rendered}${join}width=${width}&resize=contain&quality=${quality}`;
}

/**
 * A `srcset` so a retina phone gets twice the pixels and a cheap one does not.
 *
 * Returns an empty string for images we cannot resize, which is exactly what
 * the `srcSet` attribute wants in order to be ignored.
 */
export function sizedSrcSet(url: string, widths: ImageWidth[], quality = 70): string {
  if (!isStorageImage(url)) return '';
  return widths.map(w => `${sizedImage(url, w, quality)} ${w}w`).join(', ');
}
