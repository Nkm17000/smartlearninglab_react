# Frontend Bulk Quiz Compatibility

The frontend already sends the bulk quiz payload as JSON to `/admin/bulk/quiz` and sets `Content-Type: application/json` through the shared request helper. No frontend API contract change is required for the 422 fix.

The frontend validation and both single/multiple quiz formats remain unchanged.
