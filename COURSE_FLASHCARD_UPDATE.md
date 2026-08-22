# Course + Flashcard UI Update

- Student Course page now follows the supplied course/quiz visual reference: purple course hero, progress CTA, course tabs, overview/stat cards, accordion curriculum, quiz cards and resources.
- Curriculum lessons are directly clickable and open the lesson with previous/next lesson IDs.
- Continue Learning opens the first incomplete lesson.
- Flashcards remain capped at three visible cards per page with previous/next arrows.
- Flashcard delete button has a larger hit target, high z-index/elevation and an explicit web confirmation so the small × is clickable on web and native platforms.
- Backend already includes `DELETE /api/v1/flashcards/{card_id}` and ownership validation.
