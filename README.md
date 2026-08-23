# Smart Learning Lab — New Design Final FE

This build keeps the latest Smart Learning Lab dashboard visual system as the
source of truth for all screens and navigation.

## Included

- New dashboard-wide Poppins/Inter typography and purple/navy palette
- Courses, Quizzes, My Learning, AI Tutor, Flashcards
- Gamification and Mock Test
- Admin course/quiz/PDF/library features
- Student registration with email confirmation
- Resend confirmation email
- Forgot/reset password
- Global success/error notifications
- Robust API error handling
- Existing API endpoint surface retained

## Run

```powershell
npm install
npx expo start --web -c
```

## Environment

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

For Render, set the variable to your deployed FastAPI API URL.

## Render

Build:

```text
npm ci && npx expo export --platform web
```

Publish directory:

```text
dist
```
