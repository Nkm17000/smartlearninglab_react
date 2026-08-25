# Final Quiz Admin Update (V4)

The uploaded V4 frontend has been updated in place.

Admin Test Series -> Quiz Management now contains:
- + Create Quiz Manually
- Publish All
- Refresh
- Existing individual Publish/Unpublish/Delete actions

Manual Quiz:
- title, subject, topic, description, duration, passing %, max attempts
- multiple category selection
- subcategories displayed only for selected categories
- multiple subcategory selection
- exactly 10 questions
- four options
- correct answer, difficulty, marks, negative marks, explanation

The bulk quiz/course flows were not removed.

Validation:
- api.js node --check: PASS
- UI source checked for button rendering and navigation route.
- Full Expo/Metro build not run because node_modules is not included in the uploaded V4 project.
