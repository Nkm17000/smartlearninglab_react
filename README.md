# Smart Learning Lab — Frontend

Expo / React Native Web frontend for Smart Learning Lab.

## Local development

```powershell
npm install
npx expo start --web -c
```

## Web production build

```powershell
npx expo export --platform web
```

The production web output is generated in `dist/`.

## Environment

Copy `.env.example` to `.env` and set the backend URL. Never commit `.env`.

Example:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

For Render, set `EXPO_PUBLIC_API_URL` in the Static Site environment variables to the deployed backend URL.

## Render

Build command:

```text
npm ci && npx expo export --platform web
```

Publish directory:

```text
dist
```

For client-side routing, add this Render rewrite:

```text
/*    /index.html    Rewrite
```
