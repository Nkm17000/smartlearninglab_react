# API syntax fix

Fixed `src/services/api.js` `syncOffline` method. The async arrow function
was missing its closing `}` before the comma, causing Babel:

`Unexpected token (228:562)`

Run:

```powershell
npm install
npx expo start --web -c
```
