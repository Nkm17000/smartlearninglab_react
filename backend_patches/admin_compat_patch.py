"""Smart Learning Lab compatibility patch.

Add this code to app/api/admin.py (same router) if these endpoints are not
already present in your current backend. It is intentionally additive and
uses the existing get_db(), clean(), find_by_id(), update_doc(), create_doc(),
now(), and admin_user helpers.
"""

# ---------------------------------------------------------------------------
# Taxonomy: categories -> subcategories (separate MongoDB collections)
# ---------------------------------------------------------------------------

@router.get("/taxonomy")
def admin_taxonomy(user=Depends(admin_user)):
    db = get_db()
    categories = list(db.categories.find({"is_active": {"$ne": False}}).sort("name", 1))
    result = []
    for category in categories:
        category_id = str(category["_id"])
        subs = list(
            db.subcategories.find({
                "category_id": category_id,
                "is_active": {"$ne": False},
            }).sort("name", 1)
        )
        item = clean(category)
        item["id"] = str(category["_id"])
        item["subcategories"] = [clean(x) | {"id": str(x["_id"])} for x in subs]
        result.append(item)
    return {"categories": result}


@router.get("/categories/{category_id}/subcategories")
def admin_subcategories(category_id: str, user=Depends(admin_user)):
    category = find_by_id("categories", category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    rows = get_db().subcategories.find({
        "category_id": str(category_id),
        "is_active": {"$ne": False},
    }).sort("name", 1)
    return [clean(x) for x in rows]


@router.post("/categories")
def create_admin_category(data: dict, user=Depends(admin_user)):
    name = str(data.get("name", "")).strip()
    if not name:
        raise HTTPException(422, "Category name is required")
    db = get_db()
    existing = db.categories.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        raise HTTPException(409, "Category already exists")
    return create_doc("categories", {
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "is_active": True,
    }, False)


@router.put("/categories/{category_id}")
def update_admin_category(category_id: str, data: dict, user=Depends(admin_user)):
    name = str(data.get("name", "")).strip()
    if not name:
        raise HTTPException(422, "Category name is required")
    return update_doc("categories", category_id, {
        "name": name,
        "slug": name.lower().replace(" ", "-"),
    })


@router.delete("/categories/{category_id}")
def delete_admin_category(category_id: str, user=Depends(admin_user)):
    category = find_by_id("categories", category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    get_db().categories.update_one(
        {"_id": category["_id"]},
        {"$set": {"is_active": False, "updated_at": now()}},
    )
    get_db().subcategories.update_many(
        {"category_id": str(category_id)},
        {"$set": {"is_active": False, "updated_at": now()}},
    )
    return {"message": "Category deactivated", "id": str(category["_id"])}


@router.post("/categories/{category_id}/subcategories")
def create_admin_subcategory(category_id: str, data: dict, user=Depends(admin_user)):
    category = find_by_id("categories", category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    name = str(data.get("name", "")).strip()
    if not name:
        raise HTTPException(422, "Subcategory name is required")
    db = get_db()
    existing = db.subcategories.find_one({
        "category_id": str(category_id),
        "name": {"$regex": f"^{name}$", "$options": "i"},
    })
    if existing:
        raise HTTPException(409, "Subcategory already exists under this category")
    return create_doc("subcategories", {
        "category_id": str(category_id),
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "is_active": True,
    }, False)


@router.put("/subcategories/{subcategory_id}")
def update_admin_subcategory(subcategory_id: str, data: dict, user=Depends(admin_user)):
    name = str(data.get("name", "")).strip()
    if not name:
        raise HTTPException(422, "Subcategory name is required")
    sub = find_by_id("subcategories", subcategory_id)
    if not sub:
        raise HTTPException(404, "Subcategory not found")
    return update_doc("subcategories", subcategory_id, {
        "name": name,
        "slug": name.lower().replace(" ", "-"),
    })


@router.delete("/subcategories/{subcategory_id}")
def delete_admin_subcategory(subcategory_id: str, user=Depends(admin_user)):
    sub = find_by_id("subcategories", subcategory_id)
    if not sub:
        raise HTTPException(404, "Subcategory not found")
    get_db().subcategories.update_one(
        {"_id": sub["_id"]},
        {"$set": {"is_active": False, "updated_at": now()}},
    )
    return {"message": "Subcategory deactivated", "id": str(sub["_id"])}


# ---------------------------------------------------------------------------
# Publish all quizzes. Only quizzes containing at least one existing question
# are published; invalid/empty drafts remain drafts and are reported.
# ---------------------------------------------------------------------------

@router.post("/quizzes/publish-all")
def publish_all_quizzes(user=Depends(admin_user)):
    db = get_db()
    drafts = list(db.quizzes.find({"is_published": {"$ne": True}}))
    published_count = 0
    skipped = []

    for quiz in drafts:
        question_ids = [str(x) for x in (quiz.get("question_ids") or [])]
        if not question_ids:
            skipped.append({"id": str(quiz["_id"]), "reason": "No questions"})
            continue

        existing = db.questions.count_documents({
            "_id": {"$in": question_ids},
        })
        # UUID string IDs are the normal Smart Learning Lab schema. If a
        # deployment uses ObjectId question IDs, fall back to string matching.
        if existing != len(question_ids):
            missing = [
                qid for qid in question_ids
                if find_by_id("questions", qid) is None
            ]
            if missing:
                skipped.append({
                    "id": str(quiz["_id"]),
                    "reason": "Missing questions",
                    "missing_question_ids": missing,
                })
                continue

        db.quizzes.update_one(
            {"_id": quiz["_id"]},
            {"$set": {"is_published": True, "published_at": now(), "updated_at": now()}},
        )
        published_count += 1

    return {
        "published": published_count,
        "skipped": len(skipped),
        "details": skipped,
    }


# ---------------------------------------------------------------------------
# Course / lesson resource URL APIs.
# File-upload endpoints should continue to use your existing R2/object-store
# implementation; these endpoints make URL resources work even when the
# optional resource router is absent.
# ---------------------------------------------------------------------------

@router.get("/courses/{course_id}/resources")
def course_resources(course_id: str, user=Depends(admin_user)):
    if not find_by_id("courses", course_id):
        raise HTTPException(404, "Course not found")
    return [clean(x) for x in get_db().course_resources.find({"course_id": str(course_id)}).sort("created_at", -1)]


@router.post("/courses/{course_id}/resources")
def add_course_resource(course_id: str, data: dict, user=Depends(admin_user)):
    if not find_by_id("courses", course_id):
        raise HTTPException(404, "Course not found")
    d = dict(data or {})
    if not d.get("url"):
        raise HTTPException(422, "Resource URL is required")
    d["course_id"] = str(course_id)
    d.setdefault("type", d.get("resource_type", "link"))
    d.setdefault("title", d["url"])
    d.setdefault("description", "")
    return create_doc("course_resources", d, False)


@router.delete("/courses/{course_id}/resources/{resource_id}")
def delete_course_resource(course_id: str, resource_id: str, user=Depends(admin_user)):
    row = find_by_id("course_resources", resource_id)
    if not row or str(row.get("course_id")) != str(course_id):
        raise HTTPException(404, "Course resource not found")
    return delete_doc("course_resources", resource_id)


@router.get("/lessons/{lesson_id}/resources")
def lesson_resources(lesson_id: str, user=Depends(admin_user)):
    if not find_by_id("lessons", lesson_id):
        raise HTTPException(404, "Lesson not found")
    return [clean(x) for x in get_db().lesson_resources.find({"lesson_id": str(lesson_id)}).sort("created_at", -1)]


@router.post("/lessons/{lesson_id}/resources")
def add_lesson_resource(lesson_id: str, data: dict, user=Depends(admin_user)):
    if not find_by_id("lessons", lesson_id):
        raise HTTPException(404, "Lesson not found")
    d = dict(data or {})
    if not d.get("url"):
        raise HTTPException(422, "Resource URL is required")
    d["lesson_id"] = str(lesson_id)
    d.setdefault("type", d.get("resource_type", "link"))
    d.setdefault("title", d["url"])
    d.setdefault("description", "")
    return create_doc("lesson_resources", d, False)


@router.delete("/lessons/{lesson_id}/resources/{resource_id}")
def delete_lesson_resource(lesson_id: str, resource_id: str, user=Depends(admin_user)):
    row = find_by_id("lesson_resources", resource_id)
    if not row or str(row.get("lesson_id")) != str(lesson_id):
        raise HTTPException(404, "Lesson resource not found")
    return delete_doc("lesson_resources", resource_id)
