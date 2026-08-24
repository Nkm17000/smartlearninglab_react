let listeners = new Set();
let sessionListeners = new Set();

export function subscribeNotifications(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyApp(type, message, duration = 3200) {
  const event = { id: `${Date.now()}-${Math.random()}`, type, message, duration };
  listeners.forEach(listener => {
    try { listener(event); } catch (_) {}
  });
}

export function subscribeSessionExpired(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function emitSessionExpired() {
  sessionListeners.forEach(listener => {
    try { listener(); } catch (_) {}
  });
}

export function success(message) { notifyApp('success', message); }
export function error(message) { notifyApp('error', message, 4200); }
export function info(message) { notifyApp('info', message); }
