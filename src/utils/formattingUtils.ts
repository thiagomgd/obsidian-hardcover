export function toMarkdownBlockquote(text: string): string {
  // Split the text into lines
  const lines = text.split('\n');

  // Prepend '>' to each line and join them back
  const blockquoteLines = lines.map(line => `> ${line}`);

  // Join the lines with newlines to form the final blockquote string
  return blockquoteLines.join('\n');
}

export function toKebabCase(str: string): string {
  // Convert to lowercase, replace spaces and underscores with hyphens, and insert hyphens before uppercase letters
  return str.trim()
    .replace(/[()|']/g, '')
    .replace(/&/g, "and")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}