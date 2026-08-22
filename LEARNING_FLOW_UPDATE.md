# Learning Flow Update

1. Student clicks **Start / Add to My Learning** on a course.
2. The course is enrolled and the screen automatically switches to the **Curriculum** tab.
3. Starting a lesson calculates the next published lesson in module/topic order.
4. Completing a lesson automatically opens the next lesson. This continues across topics/modules.
5. The final lesson shows course completion instead of navigating further.

No backend API changes were required; the existing enrollment and lesson-completion APIs are used.
