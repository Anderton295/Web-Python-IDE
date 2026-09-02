import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { ProjectFile } from '../types';

/**
 * Default Save Option: Save file as Plain Text (.txt)
 */
export function saveFileAsTxt(file: ProjectFile): void {
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Save file as Python script (.py)
 */
export function saveFileAsPy(file: ProjectFile): void {
  const blob = new Blob([file.content], { type: 'text/x-python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name}.py`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export to Docs: Generates a polished, Google Docs and Microsoft Word compatible .docx file
 */
export async function exportFileToDocx(file: ProjectFile): Promise<void> {
  const lines = file.content.split('\n');
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `${file.name}.${file.extension}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Exported from Python Studio on ${dateStr} • ${lines.length} lines`,
                italics: true,
                color: '666666',
                size: 18,
              }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '--- Source Code ---',
                bold: true,
                color: '333333',
                size: 20,
              }),
            ],
            spacing: { after: 160 },
          }),
          ...lines.map((line, index) => {
            const lineNumStr = String(index + 1).padStart(3, ' ') + '  ';
            return new Paragraph({
              children: [
                new TextRun({
                  text: lineNumStr,
                  color: '888888',
                  font: 'Consolas',
                  size: 19,
                }),
                new TextRun({
                  text: line || ' ',
                  font: 'Consolas',
                  size: 19,
                  color: '111111',
                }),
              ],
              spacing: { line: 240 },
            });
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export to Google Docs: Copies content to clipboard and opens Google Docs (docs.new)
 */
export async function exportToGoogleDocs(file: ProjectFile): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(file.content);
    window.open('https://docs.new', '_blank');
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard for Google Docs:', err);
    return false;
  }
}
