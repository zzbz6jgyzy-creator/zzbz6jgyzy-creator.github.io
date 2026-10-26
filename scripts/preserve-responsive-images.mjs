// Keep image-pipeline <picture> wrappers when a saved-page renderer emits the
// exact same fallback <img>. Changed alt text, dimensions or sources render anew.
export function preserveResponsiveImages(previous, rendered) {
  const pictures = new Map();
  for (const match of previous.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/g)) {
    const images = match[0].match(/<img\b[^>]*>/g);
    if (images?.length === 1) pictures.set(images[0], match[0]);
  }
  return rendered.replace(/<img\b[^>]*>/g, (tag, offset) => {
    const before = rendered.slice(0, offset);
    if (before.lastIndexOf('<picture') > before.lastIndexOf('</picture>')) return tag;
    return pictures.get(tag) || tag;
  });
}
