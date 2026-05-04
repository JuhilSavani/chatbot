/**
 * pdfWorker.js
 *
 * Web Worker that extracts text from a PDF using unpdf.
 * Token counting is handled by a separate tokenWorker.js.
 *
 * Incoming messages from main thread:
 *   { status: 'PROCESS', buffer: ArrayBuffer, filename: string }
 *
 * Outgoing messages to main thread:
 *   { workerName: 'PdfWorker', status: 'PROGRESS', page: number, total: number }
 *   { workerName: 'PdfWorker', status: 'SUCCESS',  markdown: string, filename: string }
 *   { workerName: 'PdfWorker', status: 'ERROR',    reason: 'EMPTY_PDF' | 'EXTRACTION_FAILED', message: string }
 */

import { getDocumentProxy } from 'unpdf';

self.onmessage = async ({ data }) => {
  if (data.status !== 'PROCESS') return;

  const { buffer, filename } = data;

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const totalPages = pdf.numPages;
    let parsedPages = 0;
    const texts = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item) => item.str != null)
        .map((item) => item.str + (item.hasEOL ? '\n' : ''))
        .join('');

      texts.push(pageText);
      parsedPages++;

      self.postMessage({
        workerName: 'PdfWorker',
        status: 'PROGRESS',
        page: parsedPages,
        total: totalPages,
      });
    }

    const markdown = texts.join('\n\n');

    // Guard: empty extraction (likely a scanned / image-only PDF).
    const stripped = markdown.replace(/<!--\s*PAGE_BREAK\s*-->/g, '').trim();
    if (!stripped) {
      self.postMessage({
        workerName: 'PdfWorker',
        status: 'ERROR',
        reason: 'EMPTY_PDF',
        message:
          'No extractable text found. This PDF may be scanned or image-only. ' +
          'Try uploading a text-based PDF.',
      });
      return;
    }

    self.postMessage({ workerName: 'PdfWorker', status: 'SUCCESS', markdown, filename });
  } catch (err) {
    console.error('[pdfWorker] Extraction error:', err);
    self.postMessage({
      workerName: 'PdfWorker',
      status: 'ERROR',
      reason: 'EXTRACTION_FAILED',
      message: err?.message || String(err) || 'Unknown extraction error',
    });
  }
};
