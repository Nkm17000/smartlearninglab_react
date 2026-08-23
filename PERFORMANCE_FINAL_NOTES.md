# SmartLearningLab Frontend Performance Final

## Student navigation changes
- Home uses one `/home` request.
- Course screen uses one `/courses/{course_id}/overview` request; response contains progress, completed lessons, reviews and bookmark state.
- Lesson screen uses one `/lessons/{lesson_id}` request; response contains lesson content, resources, progress, note and navigation.
- Quiz screen uses one `/quizzes/{quiz_id}/bundle` request; response contains quiz metadata, questions and attempt availability.
- My Learning uses one `/learning/summary` request.
- Analytics uses one `/analytics/summary` request.
- API GET cache and request de-duplication remain enabled.

## UX fixes
- Maximum quiz attempts are detected before showing the Start Quiz action.
- Lesson navigation is sorted by topic order and lesson order.
- Course overview response is user-specific where progress/bookmark state is involved.
