// Use ESM build and bundle the worker via Vite using the mjs file
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function readPDF(file, password = "") {
  const arrayBuffer = await file.arrayBuffer();
  
  // Try to load PDF with password if provided
  let pdf;
  try {
    if (password) {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password: password }).promise;
    } else {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    }
  } catch (error) {
    if (error.message.includes("password") || error.message.includes("encrypted")) {
      throw new Error("Password required for this PDF");
    }
    throw error;
  }

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let pageText = content.items.map((s) => s.str).join(" ").trim();

      // If no text extracted, fallback to OCR for scanned pages
      if (!pageText) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = Object.assign(document.createElement("canvas"), {
          width: viewport.width,
          height: viewport.height,
        });
        const ctx = canvas.getContext("2d");
        const renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
        const { data: { text: ocrText } } = await Tesseract.recognize(canvas, "eng");
        pageText = (ocrText || "").trim();
      }

      text += pageText + "\n";
    } catch (e) {
      // Continue extracting even if one page fails
      console.warn("PDF extract error on page", i, e);
    }
  }
  return text;
}

export async function readTextFile(file) {
  return await file.text();
}

export async function readDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}
