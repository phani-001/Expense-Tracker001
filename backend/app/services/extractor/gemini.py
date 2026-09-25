"""Gemini vision extractor — alternative to Groq.

Reads GEMINI_API_KEY and GEMINI_VISION_MODEL from environment.
Encodes image bytes as inline data and sends to the Gemini API via
the google-genai SDK (genai.Client).

Returns ExtractResponse with null for any field the model cannot determine.

Rules (from PROJECT.md):
- Never guess a price or expiry date — null is the correct answer.
- Prefer the printed selling price / MRP.
- Supported date formats: DD/MM/YY, MM/YYYY, "best before N months"
  (only when manufacture date is also visible).
"""

from __future__ import annotations

import json
import logging
import os
import re

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.schemas import ExtractResponse
from app.services.extractor.base import BaseExtractor

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "gemini-3.6-flash"

_SYSTEM_PROMPT = """\
You are an expense-data extractor. The user will send you a photo of a product,
receipt, bill, shelf tag, or packaging.

Your task is to extract the following fields and return them as a single JSON object
with EXACTLY these keys:
  item          - product or expense item name (string or null)
  price         - selling price / MRP / total cost in INR as a decimal number (number or null)
  quantity      - numeric quantity e.g. 1, 0.5, 500 (number or null)
  category      - one of: Groceries, Dining, Transport, Health, Household, Other (string or null)
  expiry_date   - ISO date string YYYY-MM-DD (string or null)
  purchase_date - ISO date string YYYY-MM-DD (string or null)
  confidence    - your overall confidence 0.0–1.0 (number or null)

STRICT RULES:
- Return ONLY the JSON object. No markdown, no explanation, no extra text.
- If you cannot read a field clearly, set it to null. Do NOT guess prices or dates.
- For category: ALWAYS infer the most appropriate category whenever the item is recognized:
  * Groceries: food, beverages, snacks, ingredients, supermarket items, packaged groceries
  * Dining: restaurant bills, cafes, fast food, takeout, food delivery
  * Transport: fuel/petrol, taxi/cab, bus, train, flight, metro, parking, tolls
  * Health: medicine, pharmacy, personal care, cosmetics, doctor visits, hygiene
  * Household: appliances, electronics, gadgets, furniture, cleaning supplies, home utilities
  * Other: clothing, entertainment, gaming, subscriptions, miscellaneous items
  Do not leave category as null if the item type can be determined.
- For price: carefully look for printed selling price, MRP, total, '₹', 'Rs.', 'INR', or amount tag
  anywhere on the receipt, bill, shelf tag, sticker, or packaging label.
  Extract only the numeric decimal amount (e.g. 199.50, 45, 1200). If multiple items or a receipt,
  prefer the grand total / final amount. If no price is present on the image, return null.
- For expiry_date: parse DD/MM/YY, MM/YYYY, and "best before N months from
  manufacture date" (only if manufacture date is visible). If unclear, null.
- For purchase_date: only set if a purchase/bill date is visible; otherwise null.
- quantity should be a plain number (e.g. 1 for a single item, 0.5 for 500g if
  sold in kg units). If the package shows "1 L" return 1. If unclear, null.
"""


class GeminiExtractor(BaseExtractor):
    """Vision extractor backed by Google Gemini's multimodal API."""

    def __init__(self) -> None:
        load_dotenv(override=True)
        self._api_key: str | None = os.getenv("GEMINI_API_KEY")

        self._model: str = os.getenv("GEMINI_VISION_MODEL", _DEFAULT_MODEL)
        if not self._api_key:
            logger.warning(
                "GEMINI_API_KEY is not set — GeminiExtractor will return all-null responses."
            )

    async def extract(self, image_bytes: bytes) -> ExtractResponse:
        """Call the Gemini vision API and parse the JSON response."""
        if not self._api_key:
            logger.warning("Skipping Gemini extraction: no API key.")
            return ExtractResponse()

        try:
            client = genai.Client(
                api_key=self._api_key,
                http_options=types.HttpOptions(timeout=15000),
            )

            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg",
            )
            text_part = types.Part.from_text(
                text="Extract the expense fields from this image and return JSON."
            )
            system_part = types.Part.from_text(text=_SYSTEM_PROMPT)

            response = await client.aio.models.generate_content(
                model=self._model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[image_part, text_part],
                    )
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_part,
                    temperature=0.1,
                    max_output_tokens=1024,
                    response_mime_type="application/json",
                ),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemini API error: %s", exc)
            return ExtractResponse()

        try:
            raw: str = response.text
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not read Gemini response text: %s", exc)
            return ExtractResponse()

        return _parse_model_output(raw)


def _parse_model_output(raw: str) -> ExtractResponse:
    """Parse the model's text output into ExtractResponse.

    Handles cases where the model wraps JSON in a markdown code block.
    Returns all-null ExtractResponse on any parse error.
    """
    cleaned = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()

    try:
        obj = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.warning(
            "Failed to parse Gemini JSON output: %s | raw=%r", exc, raw[:200]
        )
        return ExtractResponse()

    try:
        return ExtractResponse.model_validate(obj)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ExtractResponse validation failed: %s", exc)
        return ExtractResponse()
