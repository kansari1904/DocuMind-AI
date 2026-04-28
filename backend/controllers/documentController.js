import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';

// @desc    Upload PDF document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
    try {
       if (!req.file) {
            return res.status(400).json({
                success : false,
                error: 'No file uploaded',
                statusCode: 400
            }); 
    }

    const { title } = req.body;

    if (!title) {
        // delete uploaded file if no title provided
        await fs.unlink(req.file.path)
        return res.status(400).json({
            success : false,
            error: 'Title is required',
            statusCode: 400
        });
    }  
    // construct the url for the uploaded file
    const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    // create document record
    const document = await Document.create({
        userId: req.user._id,
        title,
        fileName: req.file.originalname,
        filePath: fileUrl,
        fileSize: req.file.size,
        status: 'processing'
    });

    // process pdf in background (in production, use a queue like Bull)

    processPDF(document._id, req.file.path).catch(err => {
        console.error('PDF processing error', err);
    });

    res.status(201).json({
        success: true,
        data: document,
        message: 'Documnet uploaded successfully, Processing in progress...'
    });
} catch (error) {
        // cleanup file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        next(error);
    }
};

// helper function to process 
const processPDF = async (documentId, filePath) => {
    try{
        const {text} = await extractTextFromPDF(filePath);

        //create chunks
        const chunks = chunkText(text, 500, 50);

        // update document
        await Document.findByIdAndUpdate(documentId,{
            extractedText: text,
            chunks: chunks,
            status: 'ready'
        });
        console.log(`Document ${documentId} processed successfully`);
    } catch(error){
        console.error(`Error processing document ${documentId}:`, error);

        await Document.findByIdAndUpdate(documentId,{
            status: 'failed'
        });
    }
};

// @desc    Get all documents for the user
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
     try {
         const documents = await Document.aggregate([
             { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
             {
                 $lookup: {
                     from: 'flashcards',
                     localField: '_id',
                     foreignField: 'documentId',
                     as: 'flashcards'
                 }
             },
             {
                 $lookup: {
                     from: 'quizzes',
                     localField: '_id',
                     foreignField: 'documentId',
                     as: 'quizzes'
                 }
             },
             {
                 $addFields: {
                     flashcardCount: { $size: '$flashcards' },
                     quizCount: { $size: '$quizzes' }
                 }
             },
             {
                 $project: {
                     extractedText: 0,
                     chunks: 0,
                     flashcards: 0,
                     quizzes: 0
                 }
             },
             { $sort: { createdAt: -1 } }
         ]);
        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });
     } catch (error) {
        next(error);
     }

}

// @desc    Get a single document with chunks
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        }); 

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }

        // get count of associated flashcards and quizzes
        const flashcardCount = await Flashcard.countDocuments({ documentId: document._id, userId: req.user._id});
        const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user._id });
        
        // update last accessed
        document.lastAccessed = Date.now();
        await document.save();

        // combine document data with counts
        const documentData = document.toObject();
        documentData.flashcardCount = flashcardCount;
        documentData.quizCount = quizCount;
        res.status(200).json({
            success: true,
            data: documentData
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
export const deletedocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }

        // delete file from filesystem  
        await fs.unlink(document.filePath).catch(() => {});

        // delete document
        await document.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};


