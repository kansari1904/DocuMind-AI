import Document  from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";

// @desc    Get user dashboard data
// @route   GET /api/progress/dashboard
// @access  Private

export const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // get total counts
        const totalDocuments = await Document.countDocuments({ userId });
        const totalFlashcards = await Flashcard.countDocuments({ userId });
        const totalQuizzes = await Quiz.countDocuments({ userId });
        const completedQuizzes = await Quiz.countDocuments({ userId, completedAt: { $ne: null } });

        // get flashcard statistics
        const flashcardSets = await Flashcard.find({ userId});

        const totalFlashcardSets = flashcardSets.length;
        
        let totalFlashcardCount =0;
        let reviewFlashcards =0;
        let starredFlashcards =0;

        flashcardSets.forEach(set => {
            totalFlashcardCount += set.cards.length;
            reviewFlashcards += set.cards.filter(c => c.reviewCount > 0).length;
            starredFlashcards += set.cards.filter(c => c.isStarred).length;
        });

        // get quiz statistics
        const quizzes = await Quiz.find({ userId, completedAt: { $ne: null } });
        const averageScore = quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length) : 0;


        // get recent activity
        const recentDocuments = await Document.find({ userId })
        .sort({ lastAccessed: -1 })
        .limit(5)
        .select("title fileName lastAccessed status");

        const recentQuizzes = await Quiz.find({ userId, completedAt: { $ne: null } })
        .sort({ completedAt: -1 })
        .limit(5)
        .select("title score totalQuestions completedAt");

        // study streaks (simplified - in production, track daily activity more robustly)
         
        const studyStreak = Math.floor(Math.random() * 7) + 1; // mock data

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalDocuments,
                    totalFlashcardSets,
                    totalFlashcards,
                    reviewFlashcards,
                    starredFlashcards,
                    completedQuizzes,
                    totalQuizzes,
                    averageScore,
                    studyStreak
                },
                recentActivity: {
                    documents: recentDocuments,
                    quizzes: recentQuizzes
                }
            }
        });
    } catch (error) {
        next(error);
    }
}



