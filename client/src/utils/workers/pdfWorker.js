// Web Worker for PDF text extraction and token counting.
// Offloads heavy pdf.js parsing and tiktoken counting from the main thread.

import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';

self.addEventListener('message', async (e) => {
  console.log('[PdfWorker] Received message from main thread');
  try {
    const { fileBuffer, fileName } = e.data;
    if (!fileBuffer) {
      throw new Error('No file buffer provided.');
    }

    console.log(`[PdfWorker] Processing "${fileName}" (${fileBuffer.byteLength} bytes)`);

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
    const pdfDocument = await loadingTask.promise;
    console.log(`[PdfWorker] "${fileName}" loaded. Pages: ${pdfDocument.numPages}`);

    let fullText = '';
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    console.log(`[PdfWorker] "${fileName}" text extracted. Length: ${fullText.length}. Importing js-tiktoken...`);

    const { getEncoding } = await import('js-tiktoken');
    console.log('[PdfWorker] js-tiktoken imported, encoding text...');

    const enc = getEncoding('o200k_base');
    const tokens = enc.encode(fullText);
    const tokenCount = tokens.length;
    console.log(`[PdfWorker] Token count for "${fileName}": ${tokenCount}`);

    self.postMessage({ type: 'PdfWorker', success: true, fullText, tokenCount });
  } catch (error) {
    console.error('[PdfWorker] Error:', error);
    self.postMessage({
      type: 'PdfWorker',
      success: false,
      error: error.message || 'Unknown error during PDF processing',
    });
  }
});
