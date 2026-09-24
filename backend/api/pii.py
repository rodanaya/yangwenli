"""RFC privacy guard (.claude/rules/security.md § 1).

Mexican RFC format is self-describing:
  - 12 chars (3 letters + YYMMDD + 3) = persona moral (company) → public
  - 13 chars (4 letters + YYMMDD + 3) = persona física (individual) → personal data, never exposed

Verified 2026-09-24: RFC format agrees with vendors.is_individual on 100% of
45,714 well-formed RFCs, so the format alone is a safe discriminator — no
entity resolution needed.

Two layers:
  public_rfc()              — whitelist at call sites: only a valid company RFC gets out
                              (also drops source placeholders like '10861.0', 'sin_RFC').
  RfcRedactionMiddleware    — safety net over every JSON response, for free text
                              (ARIA memos, notes) and any call site that forgets.
"""
from __future__ import annotations

import re
from typing import Optional

_COMPANY_RFC = re.compile(r"^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$")

# Persona-física RFC token inside text/JSON. The YYMMDD part is validated to keep
# false positives on unrelated codes near zero. Ñ may arrive raw or JSON-escaped.
_PERSON_RFC_TOKEN = re.compile(
    r"(?<![A-Za-z0-9&Ñ])"
    r"(?:[A-Z&]|Ñ|\\u00[dD]1){4}"
    r"\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])"
    r"[A-Z0-9]{3}"
    r"(?![A-Za-z0-9])"
)
REDACTED = "[RFC]"


def public_rfc(rfc: Optional[str]) -> Optional[str]:
    """Return the RFC only if it is a well-formed company RFC; otherwise None."""
    if not rfc:
        return None
    cleaned = str(rfc).strip().upper()
    return cleaned if _COMPANY_RFC.match(cleaned) else None


def redact_person_rfcs(text: str) -> str:
    """Replace every persona-física RFC token in free text."""
    return _PERSON_RFC_TOKEN.sub(REDACTED, text) if text else text


class RfcRedactionMiddleware:
    """Pure-ASGI: buffers application/json bodies only and redacts person RFCs.

    Non-JSON (ZIP, CSV, streaming) and already-encoded responses pass through
    untouched — those paths must use public_rfc() at the call site. Must be
    registered *inside* GZipMiddleware (added before it) so it sees plain JSON.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_msg = None
        passthrough = False
        chunks: list[bytes] = []

        async def _send(message):
            nonlocal start_msg, passthrough
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers") or [])
                ctype = headers.get(b"content-type", b"")
                if not ctype.startswith(b"application/json") or b"content-encoding" in headers:
                    passthrough = True
                    await send(message)
                else:
                    start_msg = message
                return
            if passthrough or message["type"] != "http.response.body":
                await send(message)
                return
            chunks.append(message.get("body", b""))
            if message.get("more_body"):
                return
            body = b"".join(chunks)
            text = body.decode("utf-8", errors="surrogateescape")
            redacted = redact_person_rfcs(text)
            if redacted != text:
                body = redacted.encode("utf-8", errors="surrogateescape")
            headers = [(k, v) for k, v in start_msg.get("headers", []) if k.lower() != b"content-length"]
            headers.append((b"content-length", str(len(body)).encode()))
            await send({**start_msg, "headers": headers})
            await send({"type": "http.response.body", "body": body})

        await self.app(scope, receive, _send)
