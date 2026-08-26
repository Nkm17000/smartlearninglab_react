# Bulk Bilingual Quiz Compatibility Fix

The source quiz JSON uses the bilingual format:

- `question: {"english": "...", "hindi": "..."}`
- `options: {"english": [...4], "hindi": [...4]}`
- `explanation: {"english": "...", "hindi": "..."}`

Before each `/api/v1/admin/bulk/quiz-batch` request, the frontend now normalizes each question to the backend-safe shape:

- `question` = English string
- `question_hindi` = Hindi string
- `options` = English array of 4
- `options_hindi` = Hindi array of 4
- `explanation` = English string
- `explanation_hindi` = Hindi string

This is backward compatible with older deployed backend builds while remaining compatible with the current bilingual backend.
