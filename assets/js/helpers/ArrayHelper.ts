export function deleteItem(
  haystack: unknown[],
  needle: unknown
): unknown[] {
  return deleteByIndex(haystack, haystack.indexOf(needle));
}

export function deleteByIndex(
  haystack: unknown[],
  needle: number
): unknown[] {
  if (needle !== -1) {
    haystack.splice(needle, 1);
  }
  return haystack;
}

/**
 * Functions "arguments" object may be transformed to real array for extra manipulations.
 */
export function fromArguments(
  args: unknown[]
): unknown[] {
  return Array.prototype.slice.call(args);
}

export function shallowCopy(
  array: unknown[]
): unknown[] {
  return array.slice(0);
}

export function unique(
  array: unknown[]
): unknown[] {
  return array.filter((value, index: number) => {
    return array.indexOf(value) === index;
  });
}

export function findByIndex(array: any[], position: number) {
  return array[position >= 0 ? position : array.length + position];
}