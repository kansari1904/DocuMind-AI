import { title } from 'process';
import Quiz from '../models/Quiz.js';

// @desc    Get quizzes for a document
// @route   GET /api/quizzes/:documentId
// @access  Private

export const getQuizzes = async (req, res, next) => {
    try {
        const quizzes = await Quiz.find({ 
            userId : req.user._id,
            documentId: req.params.documentId 
        })
         .populate('documentId', 'title fileName')
         .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: quizzes.length,
            data: quizzes
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single quiz by ID
// @route   GET /api/quizzes/quiz/:id
// @access  Private

export const getQuizById = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });
        
        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404
            });
        }

        res.status(200).json({
            success: true,
            data: quiz
        });
    } catch (error) {
        next(error);
    }
};

// @desc    submit quiz answers
// @route   POST /api/quizzes/:id/submit
// @access  Private

export const submitQuiz = async (req, res, next) => {
    try {
         const { answers } = req.body;

         if(!Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                error: 'Answers must be an array',
                statusCode: 400
            });
         }

         const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
         });

            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found',
                    statusCode: 404
                });
            }

            if(quiz.completedAt) {
                return res.status(400).json({
                    success: false,
                    error: 'Quiz already completed',
                    statusCode: 400
                });
            }

            // process answers

            let correctCount = 0;
            const userAnswers = [];

        answers.forEach(({ questionIndex, selectedAnswer }) => {
            if (
                typeof questionIndex === "number" &&
                questionIndex < quiz.questions.length
            ) {
                const question = quiz.questions[questionIndex];
                const isCorrect = selectedAnswer === question.correctAnswer;

                if (isCorrect) correctCount++;

                userAnswers.push({
                    questionIndex,
                    selectedAnswer,
                    isCorrect,
                    answeredAt: new Date()
                });
            }
        });

            // calculate score
            const score = Math.round((correctCount / quiz.totalQuestions) * 100);

            // update quiz with results
            quiz.userAnswers = userAnswers;
            quiz.score = score;
            quiz.completedAt = new Date();

            await quiz.save();

            res.status(200).json({
                success: true,
                data: {
                    quizId: quiz._id,
                    score,
                    correctCount,
                    totalQuestions: quiz.totalQuestions,
                    percentage: score,
                    userAnswers
                },
                message: "Quiz submitted successfully"
            });
    } catch (error) {
        next(error);
    }
};

// @desc    Get quiz results
// @route   GET /api/quizzes/:id/results
// @access  Private

export const getQuizResults = async (req, res, next) => {
    try {
         const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
            }).populate('documentId', 'title');

            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    error: 'Quiz not found',
                    statusCode: 404
                });
            }

            if(!quiz.completedAt) {
                return res.status(400).json({
                    success: false,
                    error: 'Quiz not completed yet',
                    statusCode: 400
                });
            }

            // build results response

            const detailedResults = quiz.questions.map((question, index) => {
                const userAnswer = quiz.userAnswers.find(ans => ans.questionIndex === index);

                return {
                    questionIndex: index,
                    question: question.question,
                    options: question.options,
                    correctAnswer: question.correctAnswer,
                    selectedAnswer: userAnswer ?.selectedAnswer || null,
                    isCorrect: userAnswer ?.isCorrect || false,
                    explanation: question.explanation
                };
            });

            res.status(200).json({
                success: true,
                data: {
                    quiz: {
                        id: quiz._id,
                        title: quiz.title,
                        document: quiz.documentId,
                        score: quiz.score,
                        totalQuestions: quiz.totalQuestions,
                        completedAt: quiz.completedAt
                    },
                    results: detailedResults
                }
            });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private

export const deleteQuiz = async (req, res, next) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found',
                statusCode: 404
            });
        }

        await quiz.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
