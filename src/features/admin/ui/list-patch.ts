/**
 * Patch one list row — returns null when nothing changed (avoids setState loops
 * from MUI Select / controlled inputs re-firing the same value).
 */
export function patchItemAt<T extends object>(
  items: readonly T[],
  index: number,
  patch: Partial<T>,
): T[] | null {
  const current = items[index];
  if (!current) return null;

  let changed = false;
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (!Object.is(current[key], patch[key])) {
      changed = true;
      break;
    }
  }
  if (!changed) return null;

  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}
