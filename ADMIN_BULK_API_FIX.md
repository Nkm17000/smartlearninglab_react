# Admin Bulk Content API Fix

The source FE contains the required admin bulk APIs:
- POST /api/v1/admin/bulk/quiz
- POST /api/v1/admin/bulk/quiz-file
- POST /api/v1/admin/bulk/course-pdf

The previously packaged `dist` bundle was stale: it contained `bulkQuiz` and `bulkCoursePdf`, but did not contain `bulkQuizFile`, and its Bulk Content screen was an older implementation without the taxonomy picker. Therefore the source and the served web bundle were not the same version.

This package keeps the corrected source and configures the production Render API URL in `.env`. Render should rebuild the web bundle from source; do not deploy the old `dist` directory as-is.

The quiz-file action also falls back to the JSON bulk endpoint during a rolling backend deployment if `/admin/bulk/quiz-file` temporarily returns 404.

## 50-Quiz Batch Upload Update

The Bulk Content screen now uses `POST /api/v1/admin/bulk/quiz-batch` and automatically splits large JSON files into 50-quiz batches. The screen displays the status of every completed batch and keeps processing after per-quiz validation failures.
