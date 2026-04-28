export const chunkText = (text, chunkSize = 500, overlap = 50) => {
    
    if (typeof text !== "string") {
        console.log("Invalid text input:", text);
        text = text?.text || text?.content || "";
    }

    if (!text || text.trim().length === 0) {
        return [];
    }

    const cleanedText = text
        .replace(/\r\n/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .trim();

    const paragraphs = cleanedText.split(/\n+/).filter(p => p.trim().length > 0);

    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
        const paragraphWords = paragraph.trim().split(/\s+/);
        const paragraphWordCount = paragraphWords.length;

        if (paragraphWordCount > chunkSize) {
            if (currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.join('\n\n'),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });
                currentChunk = [];
                currentWordCount = 0;
            }

            for (let i = 0; i < paragraphWords.length; i += (chunkSize - overlap)) {
                const chunkWords = paragraphWords.slice(i, i + chunkSize);
                chunks.push({
                    content: chunkWords.join(' '),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });
                if (i + chunkSize >= paragraphWords.length) break;
            }
            continue;
        }

        if (currentWordCount + paragraphWordCount > chunkSize && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n\n'),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });

            const prevChunkText = currentChunk.join(' ');
            const prevWords = prevChunkText.split(/\s+/);
            const overlapText = prevWords
                .slice(-Math.min(overlap, prevWords.length))
                .join(' ');

            currentChunk = [overlapText, paragraph.trim()];
            currentWordCount =
                overlapText.split(/\s+/).length + paragraphWordCount;
        } else {
            currentChunk.push(paragraph.trim());
            currentWordCount += paragraphWordCount;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n\n'),
            chunkIndex: chunkIndex++,
            pageNumber: 0
        });
    }

    if (chunks.length === 0 && cleanedText.length > 0) {
        const allWords = cleanedText.split(/\s+/);
        for (let i = 0; i < allWords.length; i += (chunkSize - overlap)) {
            const chunkWords = allWords.slice(i, i + chunkSize);
            chunks.push({
                content: chunkWords.join(' '),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });
            if (i + chunkSize >= allWords.length) break;
        }
    }

    return chunks;
};