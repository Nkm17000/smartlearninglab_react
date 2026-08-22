# Smart Learning Lab - Final Content Update

This version restores and keeps the Study Library, adds admin bulk content, and fixes certificate preview/download.

## Frontend
Install dependencies:
npm install

The package.json now includes `babel-preset-expo` for Expo SDK 54 and `expo-document-picker` for uploads.

Start:
npx expo start --web -c

## Backend
Install:
pip install -r requirements.txt

Run:
uvicorn app.main:app --reload

Optional:
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile

## Admin
- Resource Library: upload PDFs, documents, videos, audio, images and links.
- Bulk Content: paste bulk quiz JSON or upload a PDF to generate a draft course.
- Course resources and lesson resources remain available.

## Student
- Study Library is available in the left menu.
- Library resources can be opened and downloaded.
- Certificates show an in-app visual preview.
- Preview PDF opens the certificate in the browser.
- Download PDF opens a download response.

## Bulk Quiz JSON
{
  "title": "Java Basics Quiz",
  "category": "Computer",
  "passing_percentage": 60,
  "questions": [
    {
      "question": "Which keyword is used to inherit a class?",
      "options": ["implements", "extends", "inherits", "super"],
      "correct_answer": 1,
      "explanation": "extends is used for class inheritance."
    }
  ]
}

## PDF -> Course
Admin uploads a text-based PDF and chooses category, level and language.
If GROQ_API_KEY is configured, the backend asks Groq to structure the content into modules and lessons.
Without Groq, a deterministic heading/content fallback creates a draft.
Generated courses are NEVER automatically published.
