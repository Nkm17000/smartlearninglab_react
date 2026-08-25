# Category mapping update

The student Courses and Quizzes screens now read taxonomy from the MongoDB/API `categories` array.

Examples supported:
- `categories: ["Banking", "Finance"]`
- `categories: [{"name":"Banking"}]`

The first category is used as the primary badge/label. Filtering and category counts use every value in the array, so a course/quiz can belong to multiple categories.

The legacy singular `category` field is used only as a backward-compatible fallback when `categories` is absent or empty.

Backend changes are not required for this FE update.
