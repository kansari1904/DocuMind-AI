import fs from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) });
        const pdf = await loadingTask.promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return {
            text: fullText,
            numPages: pdf.numPages,
            info: await pdf.getMetadata().catch(() => ({})),
        };
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
};