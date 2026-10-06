/** Join a path under Vite `base` (e.g. `/exit-rush/` on GitHub Pages). */
export function publicUrl(rel: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${rel.replace(/^\//, '')}`;
}
