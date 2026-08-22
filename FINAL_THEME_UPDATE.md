# Final UI Theme Update

- Updated the global font stack to `Poppins, Inter, Arial, sans-serif` so the application follows the rounded/geometric typography of the supplied reference design wherever Poppins is available.
- Updated the primary purple, navy, text, muted and background colors to match the supplied course/quiz reference more closely.
- Because all shared UI components and screens consume `colors.fontFamily` and the shared palette, the change applies across student/admin pages without changing application logic.
- Removed **Learning Plan** from the student left sidebar. **My Learning** remains available in the top navigation and continues to open the learning-plan page.
- No backend changes are required for this UI-only update.
