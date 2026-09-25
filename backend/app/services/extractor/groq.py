"""Groq vision extractor — Phase 4 full implementation.

Reads GROQ_API_KEY and GROQ_VISION_MODEL from environment.
Encodes image bytes as base64 and sends to Groq chat-completions API.
Returns ExtractResponse with null for any field the model cannot determine.

Rules (from PROJECT.md):
- Never guess a price or expiry date — null is the correct answer.
- Prefer the printed selling price / MRP.
- Supported date formats: DD/MM/YY, MM/YYYY, "best before N months"
  (only when manufacture date is also visible).
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re

import httpx

from app.schemas import ExtractResponse
from app.services.extractor.base import BaseExtractor

logger = logging.getLogger(__name__)

_GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
_TIMEOUT = 30.0  # seconds

_SYSTEM_PROMPT = """\
You are an expense-data extractor. The user will send you a photo of a product,
receipt, shelf tag, or packaging.

Your task is to extract the following fields and return them as a single JSON object
with EXACTLY these keys:
  item          - product name (string or null)
  price         - selling price / MRP in INR as a decimal number (number or null)
  quantity      - numeric quantity e.g. 1, 0.5, 500 (number or null)
  category      - one of: Groceries, Dining, Transport, Health, Household, Other (string or null)
  expiry_date   - ISO date string YYYY-MM-DD (string or null)
  purchase_date - ISO date string YYYY-MM-DD (string or null)
  confidence    - your overall confidence 0.0–1.0 (number or null)

STRICT RULES:
- Return ONLY the JSON object. No markdown, no explanation, no extra text.
- If you cannot read a field clearly, set it to null. Do NOT guess.
- For price: use the printed MRP/selling price in INR. If multiple prices are
  visible, prefer the selling price. If unclear, return null.
- For expiry_date: parse DD/MM/YY, MM/YYYY, and "best before N months from
  manufacture date" (only if manufacture date is visible). If unclear, null.
- For purchase_date: only set if a purchase/bill date is visible; otherwise null.
- quantity should be a plain number (e.g. 1 for a single item, 0.5 for 500g if
  sold in kg units). If the package shows "1 L" return 1. If unclear, null.
"""


class GroqExtractor(BaseExtractor):
    """Vision extractor backed by Groq's multimodal API."""

    def __init__(self) -> None:
        self._api_key: str | None = os.getenv("GROQ_API_KEY")
        self._model: str = os.getenv(
            "GROQ_VISION_MODEL", "llama-3.2-11b-vision-preview"
        )
        if not self._api_key:
            logger.warning(
                "GROQ_API_KEY is not set — GroqExtractor will return all-null responses."
            )

    async def extract(self, image_bytes: bytes) -> ExtractResponse:
        """Call the Groq vision API and parse the JSON response."""
        if not self._api_key:
            logger.warning("Skipping Groq extraction: no API key.")
            return ExtractResponse()

        b64 = base64.b64encode(image_bytes).decode()
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                        {
                            "type": "text",
                            "text": "Extract the expense fields from this image and return JSON.",
                        },
                    ],
                },
            ],
            "temperature": 0.1,
            "max_tokens": 512,
        }

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.post(
                    _GROQ_CHAT_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                )
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("Groq HTTP %s: %s", exc.response.status_code, exc.response.text)
            return ExtractResponse()
        except httpx.RequestError as exc:
            logger.warning("Groq network error: %s", exc)
            return ExtractResponse()

        # Extract the raw text from the first choice
        try:
            raw: str = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            logger.warning("Unexpected Groq response shape: %s", exc)
            return ExtractResponse()

        return _parse_model_output(raw)


def _parse_model_output(raw: str) -> ExtractResponse:
    """Parse the model's text output into ExtractResponse.

    Handles cases where the model wraps JSON in a markdown code block.
    Returns all-null ExtractResponse on any parse error.
    """
    # Strip optional ```json ... ``` fences
    cleaned = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()

    try:
        obj = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse Groq JSON output: %s | raw=%r", exc, raw[:200])
        return ExtractResponse()

    # Validate through Pydantic — unknown keys are ignored
    try:
        return ExtractResponse.model_validate(obj)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ExtractResponse validation failed: %s", exc)
        return ExtractResponse()
