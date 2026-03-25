export interface McConfig {
  key: number;
  languageId: string;
  files: string[];
}

export function buildJson(languageId: string, files: string[]): string {
  if (files.length === 0) {
    return `{\n  "language_id": "${languageId}",\n  "path": ".",\n  "scripts": []\n}`;
  }
  const scripts = files.map(f => `    "${f}"`).join(',\n');
  return `{\n  "language_id": "${languageId}",\n  "path": ".",\n  "scripts": [\n${scripts}\n  ]\n}`;
}
