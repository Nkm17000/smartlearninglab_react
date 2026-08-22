# Smart Learning Lab - Bulk PDF Import + Student Certificates

These are drop-in updates based on the current Smart Learning Lab files.

## Backend files

Replace:
- `app/api/admin.py`
- `app/api/learning.py`

Add these packages to the existing `requirements.txt`:
- `pypdf>=5.0.0`
- `reportlab>=4.0.0`
- `python-multipart>=0.0.9`
- `groq>=0.11.0`

Set on Render/local backend:
- `GROQ_API_KEY=...`
- optional `GROQ_MODEL=llama-3.3-70b-versatile`

No new router registration is required because the existing admin and learning routers are extended in-place.

## Backend endpoints

Admin-only:
- `POST /api/v1/admin/bulk/course-pdf`
- `POST /api/v1/admin/bulk/quiz-pdf`

Student-only:
- `GET /api/v1/certificates`
- `POST /api/v1/certificates/course/{course_id}/issue`
- `GET /api/v1/certificates/{certificate_id}/pdf`

Bulk imports are created as drafts. Review them in the existing admin screens and publish manually.

## Frontend

Replace:
- `services/api.js`
- `navigation/AppNavigator.js`
- `screens/admin/AdminCourseBuilderScreen.js`

Add:
- `screens/admin/AdminBulkImportScreen.js`
- `screens/student/StudentCertificatesScreen.js`

Install Expo dependencies:

```bash
npx expo install expo-document-picker expo-file-system expo-sharing
```

The admin course builder gets a **Bulk PDF Import** button. Students see the existing Certificates route with a **Download Certificate PDF** button.

## PDF behavior

Course PDF -> AI generates a draft course with modules and lessons.
Quiz PDF -> AI generates a draft quiz with MCQs, answers and explanations.

Text-based PDFs are supported. Scanned/image-only PDFs require OCR before extraction.
