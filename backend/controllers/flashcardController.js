import mongoose from "mongoose";
import Flashcard from "../models/Flashcard.js";

// @desc    Get all flashcards for a document
// @route   GET /api/flashcards
// @access  Private
export const getAllFlashcardSets = async (req, res, next) => {
    try {
        const flashcardSets = await Flashcard.find({
            userId: req.user._id,
        })
            .populate('documentId', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: flashcardSets.length,
            data: flashcardSets
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get flashcard sets for a user
// @route   GET /api/flashcards
// @access  Private
export const getFlashcards = async (req, res, next) => {
    try {
        const { documentId } = req.params;

        const flashcards = await Flashcard.find({
            userId: req.user._id,
            documentId: new mongoose.Types.ObjectId(documentId)
        })
            .populate('documentId', 'title fileName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: flashcards.length,
            data: flashcards
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Mark flashcards as Review
// @route   POST /api/flashcards/:cardId/review
// @access  Private
export const reviewFlashcards = async (req, res, next) => {
    try {
        const flashcardSets = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        });
        if (!flashcardSets) {
            return res.status(404).json({
                success: false,
                message: 'Flashcard not found',
                statuCode: 404
            });
        }
        const cardIndex = flashcardSets.cards.findIndex(card => card._id.toString() === req.params.cardId);
        if (cardIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'card not found in set',
                statuCode: 404
            });
        }

        // update review info
        flashcardSets.cards[cardIndex].lastReviewed = new Date();
        flashcardSets.cards[cardIndex].reviewCount += 1;

        await flashcardSets.save();

        res.status(200).json({
            success: true,
            data: flashcardSets,
            message: 'Flashcard reviewed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle star flashcard
// @route   PUT /api/flashcards/:cardId/star
// @access  Private
export const toggleStarFlashcard = async (req, res, next) => {
    try {
        const flashcardSets = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user._id
        });
        if (!flashcardSets) {
            return res.status(404).json({
                success: false,
                message: 'Flashcard not found',
                statuCode: 404
            });
        }
        const cardIndex = flashcardSets.cards.findIndex(card => card._id.toString() === req.params.cardId);
        if (cardIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'card not found in set',
                statuCode: 404
            });
        }

        // toggle star
        flashcardSets.cards[cardIndex].isStarred= !flashcardSets.cards[cardIndex].isStarred;

        await flashcardSets.save();

        res.status(200).json({
            success: true,
            data: flashcardSets,
            message: `Flashcard ${flashcardSets.cards[cardIndex].isStarred ? 'starred' : 'unstarred'} successfully`
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Delete flashcard set
// @route   DELETE /api/flashcards/:Id
// @access  Private
export const deleteFlashcardSet = async (req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOneAndDelete({
            _id: req.params.Id,
            userId: req.user._id
        });

        if (!flashcardSet) {
            return res.status(404).json({
                success: false,
                error: 'Flashcard set not found',
                statusCode: 404
            });
        }

        res.status(200).json({
            success: true,
            message: 'Flashcard set deleted successfully'
        });

    } catch (error) {
        next(error);
    } 
}; 


