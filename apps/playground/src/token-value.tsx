export function TokenValue({ name }: { name: string }) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'unset';
  return <code>{value}</code>;
}
