# Large Quiz JSON Upload Fix

## What changed

The admin bulk quiz screen no longer puts the complete selected JSON file into a React Native Web TextInput. Rendering thousands of quiz objects in a TextInput was blocking the browser main thread and causing `This page isn't responding`.

### New flow

1. Select JSON file.
2. On web, the browser `File` object is sent to a Web Worker.
3. The worker reads/parses the JSON without blocking the UI thread.
4. The worker keeps the parsed quiz list in the worker and sends only 50 quizzes at a time to the main thread.
5. The main thread sends each 50-quiz batch to `POST /api/v1/admin/bulk/quiz-batch`.
6. The UI updates after every completed batch.
7. The full JSON is never rendered in the text editor.

## Large files

The text editor is retained for manual/sample JSON. Uploaded files are shown as file metadata instead of rendering their entire contents.

The file card shows:

- file name
- file size
- quiz count
- question count
- processing status

## Backend

No backend change is required for this specific browser-freeze fix. The existing `POST /api/v1/admin/bulk/quiz-batch` endpoint remains the server-side batch endpoint and accepts up to 50 quizzes per request.

## Validation

Each 50-quiz batch is validated on the client before sending. Invalid quizzes are recorded as failed items while valid quizzes in the same batch continue to the backend.

## Build

Run:

```bash
npm ci
npm run build:web
```

The source was syntax-checked with Node. A full Expo build requires installing the project's dependencies in the deployment/build environment.
