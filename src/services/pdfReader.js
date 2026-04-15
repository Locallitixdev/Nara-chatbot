import * as pdfjs from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use Vite's ?url import for reliable worker path resolution in both
// browser dev mode and Tauri webview (where protocol is tauri://)
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractPdfText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    await pdf.destroy();
    
    return fullText.trim();
  } catch (error) {
    console.error('Failed to extract PDF text:', error);
    throw error;
  }
}

/**
 * @param {File} file
 * @param {number} pageNumber
 * @returns {Promise<string>}
 */
export async function extractPdfPage(file, pageNumber) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
    
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ');
    
    await pdf.destroy();
    
    return pageText.trim();
  } catch (error) {
    console.error('Failed to extract PDF page:', error);
    throw error;
  }
}

/**
 * @param {File} file
 * @returns {Promise<{numPages: number}>}
 */
export async function getPdfInfo(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    
    const info = {
      numPages: pdf.numPages,
    };
    
    await pdf.destroy();
    
    return info;
  } catch (error) {
    console.error('Failed to get PDF info:', error);
    throw error;
  }
}

/**
 * @param {File} file
 * @param {number} maxPages
 * @returns {Promise<string>}
 */
export async function extractPdfPreview(file, maxPages = 3) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    
    const pagesToExtract = Math.min(maxPages, pdf.numPages);
    let previewText = '';
    
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');
      
      previewText += `--- Halaman ${i} ---\n${pageText}\n\n`;
    }
    
    if (pdf.numPages > maxPages) {
      previewText += `... dan ${pdf.numPages - maxPages} halaman lagi`;
    }
    
    await pdf.destroy();
    
    return previewText.trim();
  } catch (error) {
    console.error('Failed to extract PDF preview:', error);
    throw error;
  }
}
