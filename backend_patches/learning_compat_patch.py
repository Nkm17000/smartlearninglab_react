"""Optional compatibility endpoints for app/api/learning.py.

Add only if your current learning.py does not already expose these routes.
"""

@router.get("/home")
def home_compat(user=Depends(current_user)):
    db = get_db()
    featured_courses = [
        clean(x) for x in db.courses.find({"is_published": True}).sort([("featured", -1), ("created_at", -1)]).limit(8)
    ]
    featured_quizzes = [
        clean(x) for x in db.quizzes.find({"is_published": True}).sort([("featured", -1), ("created_at", -1)]).limit(8)
    ]
    return {"featured": {"courses": featured_courses, "quizzes": featured_quizzes}, "courses": featured_courses, "quizzes": featured_quizzes}


@router.get("/quizzes/{quiz_id}/bundle")
def quiz_bundle_compat(quiz_id: str, user=Depends(current_user)):
    qz = published("quizzes", quiz_id)
    if not quiz_visible(qz):
        raise HTTPException(404, "Content not published")
    ids = [str(x) for x in (qz.get("question_ids") or [])]
    rows = list(get_db().questions.find({"is_published": True}))
    by_id = {str(x["_id"]): x for x in rows}
    questions = [clean(by_id[qid], hide_answers=True) for qid in ids if qid in by_id]
    return {"quiz": clean(qz), "questions": questions}
