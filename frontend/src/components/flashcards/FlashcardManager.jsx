import React, { usestate, useEffect } from 'react'
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ArrowLeft,
    Sparkles,
    Brain,
} from "lucide-react";
import toast from "react-hot-toast";
import moment from "moment";

import flashcardService from "../../services/flashcardService";
import aiService from "../../services/aiService";
import Spinner from "../common/Spinner";
import Modal from "../common/Modal";
import Flashcard from "./Flashcard";

const FlashcardManager = ({ documentId }) => {
    const [flashcardSets, setFlashcardSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [setToDelete, setSetToDelete] = useState(null);

    const fetchFlashcardSets = async () => {
        setLoading(true);
        try {
            const response = await flashcardService.getFlashcardsForDocument(documentId);
            setFlashcardSets(response.data);
        } catch (error) {
            toast.error("Failed to fetch flashcard sets.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (documentId) {
            fetchFlashcardSets();
        }
    }, [documentId]);

    const handleGenerateFlashcards = async () => {
        setGenerating(true);
        try {
            await aiService.generateFlashcards(documentId);
            toast.success("Flashcards generated successfully!");
            fetchFlashcardSets();
        } catch (error) {
            toast.error(error.message || "Failed to generate flashcards.");
        } finally {
            setGenerating(false);
        }
    };
    const handleNextCard = () => {
        if(selectedSet) {
            handleReview(currentCardIndex);
            setCurrentCardIndex(
                (prevIndex) => (prevIndex + 1) % selectedSet.cards.length);
        }
    };

    const handlePrevCard = () => {
        if(selectedSet) {
            handleReview(currentCardIndex);
            setCurrentCardIndex(
                (prevIndex) =>
                    (prevIndex - 1 + selectedSet.cards.length) % selectedSet.cards.length
            );
        }
    };
    const handleReview = async (index) => {
        const currentCard = selectedSet?.cards[currentCardIndex];
        if (!currentCard) return;
        try {
            await flashcardService.reviewFlashcard(currentCard._id, index);
            toast.success("Flashcard reviewed!");
        } catch (error) {
            toast.error("Failed to review flashcard.");
        }
    };
    const handleToggleStar = async(cardId) => {

    }

    const handleDeleteRequest = (e, set) => {
        e.stopPropagation();
        setSetToDelete(set);
        setIsDeleteModalOpen(true);
    };
    const handleConfirmDelete = async => () => {
    };
    const handleSelectSet = (set) => {
        setSelectedSet(set);
        setCurrentCardIndex(0);
    };
    const renderFlashcardViewer = () => {
        return "renderFlashcardViewer"
    };
    const renderSetList = () => {
        return "renderSetList"
    };


    return (
        <div>FlashcardManager</div>
    )
}
export default FlashcardManager