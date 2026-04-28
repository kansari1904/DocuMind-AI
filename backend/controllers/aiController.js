import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import ChatHistory from '../models/ChatHistory.js';
import * as geminiService from '../utils/geminiService.js';
import { chunkText } from '../utils/textChunker.js';

// @desc    Generate flashcards from a document
// @route   POST /api/ai/generate-flashcards
// @access  Private
export const generateFlashcards = async (req, res, next) => {
    try {
        const { documentId, count = 10 } = req.body;

        if (!documentId) {
            return res.status(400).json({ 
                success: false,
                error: 'Please provide a document ID',
                statusCode: 400
             });
        }

        const document = await Document.findOne({
             _id: documentId,
             userId: req.user._id,
             status: 'ready'
            });

        if (!document) {
            return res.status(404).json({ 
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
             });
        }

        // Generate flashcards using Gemini
        const cards = await geminiService.generateFlashcards(document.extractedText, parseInt(count));

        // save to database
        const flashcardSet = await Flashcard.create({
            userId: req.user._id,
            documentId: document._id,
            cards: cards.map(card => ({
                question: card.question,
                answer: card.answer,
                difficulty: card.difficulty,
                reviewCount: 0,
                isStarred: false
            }))
         });
        res.status(200).json({
            success: true,
            data: flashcardSet,
            message: 'Flashcards generated successfully',
        });
    } catch (error) {
        next(error);  
    }
};

// @desc    Generate quiz questions from a document
// @route   POST /api/ai/generate-quiz
// @access  Private
export const generateQuiz = async (req, res, next) => {
    try {
        const { documentId, numQuestions = 5, title } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a document ID',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Generate quiz questions
        const questions = await geminiService.generateQuiz(
            document.extractedText,
            parseInt(numQuestions)
        );

       
        const quiz = await Quiz.create({
            userId: req.user._id,
            documentId: document._id,
            title: title || `Quiz for ${document.title}`,
            questions: questions, 
            totalQuestions: questions.length,
            userAnswers: [],
            score: 0,
        });

        res.status(201).json({
            success: true,
            data: quiz,
            message: 'Quiz generated successfully',
        });

    } catch (error) {
        next(error);
    }
};

// @desc    generate document summary
// @route   POST /api/ai/generate-summary
// @access  Private
export const generateSummary = async (req, res, next) => {
    try {
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a document ID',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Generate summary using Gemini
        const summary = await geminiService.generateSummary(document.extractedText);

        res.status(200).json({
            success: true,
            data: {
                documentId: document._id,
                title: document.title,
                summary
            },
            message: 'Summary generated successfully',
        });
    } catch (error) {
        next(error)
    }
};


// @desc    Handle chat messages
// @route   POST /api/ai/chat
// @access  Private
export const chat = async (req, res, next) => {
    try {
        const { documentId, question } = req.body;

        if (!documentId || !question) {
            return res.status(400).json({
                success: false,
                error: 'Please provide both document ID and question',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // ✅ STEP 1: Normalize chunks (CRITICAL FIX)
        const normalizedChunks = (document.chunks || []).map((chunk, index) => {

            // if chunk is string
            if (typeof chunk === "string") {
                return {
                    content: chunk,
                    chunkIndex: index
                };
            }

            return {
                content: chunk?.content || chunk?.text || "",
                chunkIndex: chunk?.chunkIndex ?? index
            };
        });

        // ✅ STEP 2: Keyword extraction (better)
        const stopWords = ["what", "is", "the", "a", "an", "of", "in"];
        const keywords = question
            .toLowerCase()
            .split(" ")
            .filter(word => !stopWords.includes(word));

        // ✅ STEP 3: Find relevant chunks
        let relevantChunks = normalizedChunks
            .map(chunk => {
                let score = 0;

                for (const word of keywords) {
                    if (chunk.content.toLowerCase().includes(word)) {
                        score++;
                    }
                }

                return { ...chunk, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        // ✅ fallback if no useful match
        if (
            relevantChunks.length === 0 ||
            relevantChunks.every(c => c.score === 0)
        ) {
            relevantChunks = normalizedChunks.slice(0, 3);
        }

        const chunksIndices = relevantChunks.map(c => c.chunkIndex ?? 0);

        // ✅ STEP 4: Chat history
        let chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: document._id
        });

        if (!chatHistory) {
            chatHistory = await ChatHistory.create({
                userId: req.user._id,
                documentId: document._id,
                messages: []
            });
        }

        // ✅ STEP 5: Call Gemini
        const answer = await geminiService.chat(question, relevantChunks);

        // ✅ STEP 6: Save messages
        chatHistory.messages.push(
            {
                role: 'user',
                content: question,
                timestamp: new Date(),
                relevantChunks: chunksIndices
            },
            {
                role: 'assistant',
                content: answer,
                timestamp: new Date(),
                relevantChunks: chunksIndices
            }
        );

        await chatHistory.save();

        // ✅ RESPONSE
        res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                relevantChunks: chunksIndices,
                chatHistoryId: chatHistory._id
            },
            message: 'Chat response generated successfully',
        });

    } catch (error) {
        next(error);
    }
};

// @desc explain concept from document
// @route POST /api/ai/explain-concept
// @access Private  
export const explainConcept = async (req, res, next) => {
    try {
        const { documentId, concept } = req.body;

        if (!documentId || !concept) {
            return res.status(400).json({
                success: false,
                error: 'Document ID and concept are required',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // ✅ STEP 1: Normalize chunks
        const normalizedChunks = (document.chunks || []).map((chunk, index) => {
            if (typeof chunk === "string") {
                return {
                    content: chunk,
                    chunkIndex: index
                };
            }

            return {
                content: chunk?.content || chunk?.text || "",
                chunkIndex: chunk?.chunkIndex ?? index
            };
        });

        // ✅ STEP 2: Find relevant chunks (NO chunkText here ❌)
        const keywords = concept.toLowerCase().split(" ");

        let relevantChunks = normalizedChunks
            .map(chunk => {
                let score = 0;

                for (const word of keywords) {
                    if (chunk.content.toLowerCase().includes(word)) {
                        score++;
                    }
                }

                return { ...chunk, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        // ✅ fallback
        if (
            relevantChunks.length === 0 ||
            relevantChunks.every(c => c.score === 0)
        ) {
            relevantChunks = normalizedChunks.slice(0, 3);
        }

        // ✅ STEP 3: Call Gemini (PASS CHUNKS, NOT STRING)
        const explanation = await geminiService.explainConcept(
            concept,
            relevantChunks
        );

        res.status(200).json({
            success: true,
            data: {
                concept,
                explanation,
                relevantChunks: relevantChunks.map(c => c.chunkIndex ?? 0)
            },
            message: 'Concept explained successfully',
        });

    } catch (error) {
        next(error);
    }
};

// @desc get chat history for a document
// @route GET /api/ai/chat-history/:documentId
// @access Private  
export const generateChatHistory = async (req, res, next) => {
    try {
        const { documentId } = req.params;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Document ID is required',
                statusCode: 400
            });
        }

        const chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: documentId
        }).select('messages') // only return messages field

        if (!chatHistory) {
            return res.status(200).json({
                success: true,
                data : [],
                message: 'No chat history found for this document',
             });
        }
        res.status(200).json({
            success: true,
            data: chatHistory.messages,
            message: 'Chat history retrieved successfully',
        });
    } catch (error) {
        next(error);
    }
};