export function toMarkdownBlockquote(text: string): string {
  // Split the text into lines
  const lines = text.split('\n');

  // Prepend '>' to each line and join them back
  const blockquoteLines = lines.map(line => `> ${line}`);

  // Join the lines with newlines to form the final blockquote string
  return blockquoteLines.join('\n');
}
