# Smart Learning Lab – Mobile / Session Update

## Included changes

1. Expired JWT sessions now clear local authentication and return the app to the login screen automatically.
2. The persisted JWT is validated once at application startup.
3. Student portal API success/error toasts are disabled; admin API feedback remains unchanged.
4. Mobile navigation moves all desktop top-menu items into the left drawer, with the original secondary menu below them.
5. Dashboard stat cards are clickable and route to the corresponding screens.
6. Dashboard shows only the first 5 courses and first 5 quizzes, with View all actions.
7. Common mobile spacing/header/card behavior was tightened through `UI.js`.
8. Student course/library grids use full-width cards on narrow screens.
9. Backend deployment example values point to the current Cloud Run + Cloudflare Pages production endpoints.

## Session behavior

The backend already returns HTTP 401 for invalid/expired JWTs. The frontend now treats that status as a session-expiry event.

## Validation performed

- `node --check` passed for the modified plain-JavaScript service files.
- Python compilation passed for all backend `.py` files.
- Static checks confirmed the 401 handler, session event, student notification suppression, mobile menu order, dashboard limits, and dashboard navigation.

A full Expo web production build could not be completed in this environment because dependency installation/build commands exceeded the execution time limit. The source was therefore not represented as "fully build-tested" beyond the validations above.
