export function sanitizeDocumentHtml(html: string): string {
  return html
    .replace(/@font-face\s*{[^}]*file:\/\/\/[^}]*}/gi, '')
    .replace(/url\(["']?file:\/\/\/[^)"']+["']?\)/gi, 'none');
}
