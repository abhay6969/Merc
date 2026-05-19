export function parseCommand(command: string): { bin: string; args: string[] } {
  const trimmed = command.trim();
  if (trimmed.length === 0) {
    throw new Error("Command cannot be empty");
  }
  const parts = trimmed.split(/\s+/);
  const bin = parts[0];
  const args = parts.slice(1);
  return { bin, args };
}
