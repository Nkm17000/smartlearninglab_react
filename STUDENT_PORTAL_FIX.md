# Student Portal Fix — 25 Aug 2026

## Root cause found from the recording
The deployed student home screen called `api.studentHome()`, but the FE API facade did not export `studentHome`. The browser therefore failed before making the `/home` request and displayed:

`c.api.studentHome is not a function`

## Fixes
- Added `api.studentHome()` -> GET `/home`.
- Added backward-compatible home fallback to `/dashboard`, `/catalog/categories`, `/catalog/featured`, and `/quizzes`.
- Added missing student APIs used by existing screens:
  - `learningSummary`
  - `analyticsSummary`
  - `quizBundle`
  - `certificateAccess`
  - `lessonView`
  - flashcard delete/review helpers
  - gamification start/answer/finish
  - Study Assistance and Study Search
- Added missing student navigation routes:
  - Study Assistance
  - Mock Test
  - Study Mistakes
  - Gamification
- Preserved the existing admin Publish All implementation.
- Preserved existing course/quiz/admin APIs.
- Improved bulk file API compatibility for browser uploads.

## Verification
- All FE JS files pass `node --check`.
- All relative FE imports resolve.
- Every `api.*` reference used by FE screens has a corresponding API facade method.
- Backend Python source compiles successfully with `python -m compileall`.
- Backend endpoints required by the fixed student portal are present, including `/home`, `/study-assistance`, `/study-assistance/search`, `/dashboard`, `/courses`, `/quizzes`, `/quizzes/{quiz_id}/bundle`, `/learning/summary`, `/analytics/summary`, `/bookmarks`, and certificate access.

A full Expo web build could not be executed in this environment because the npm registry dependency installation timed out / was not fully cached. No JS syntax/import/API-reference errors remain in the delivered source.
