export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function resetIds() {
  return;
}
