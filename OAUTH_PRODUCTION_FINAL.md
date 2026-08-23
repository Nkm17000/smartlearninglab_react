# Smart Learning Lab OAuth Frontend

Set:

```env
EXPO_PUBLIC_API_BASE_URL=https://smartlearninglab.onrender.com/api/v1
EXPO_PUBLIC_API_URL=https://smartlearninglab.onrender.com/api/v1
```

For web OAuth, the browser origin is used as the post-login destination. The backend must have the exact deployed frontend URL in `FRONTEND_WEB_URL`.

After changing environment variables, restart Expo and clear Metro cache:

```bash
npx expo start -c
```
