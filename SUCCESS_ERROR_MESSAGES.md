# Success / Error feedback

The frontend now has a centralized in-app toast system.

- Every POST/PUT/PATCH/DELETE request shows a success message when it succeeds.
- Every API/network failure shows an error message.
- GET requests show errors but intentionally do not show success toasts, because a success toast for every page-load request would be noisy and harm UX.
- Important operations have specific messages (registration, login, forgot password, reset password, course enrollment, lesson completion, quiz submission, mock test, certificate, notes, flashcards, admin publish/save/delete, AI operations, PDF course generation, etc.).
- PDF upload uses the same success/error notification system even though it uses multipart FormData instead of the JSON request helper.
- Secrets and tokens are never included in the toast messages.
