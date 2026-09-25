from __future__ import annotations

import threading
import time

from fastapi import HTTPException, status


class LoginRateLimiter:
    """Limitador simple en memoria de intentos de login (por IP + usuario).

    En produccion se recomienda delegar a un limitador de borde (proxy/reverse).
    """

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.time()
        with self._lock:
            timestamps = self._attempts.setdefault(key, [])
            timestamps = [t for t in timestamps if now - t < self.window_seconds]
            self._attempts[key] = timestamps
            if len(timestamps) >= self.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiados intentos de inicio de sesion; intente mas tarde.",
                )
            timestamps.append(now)


login_rate_limiter = LoginRateLimiter()