"""Abstract extractor interface.

All extractor implementations must subclass BaseExtractor and implement
`extract`. This keeps the router decoupled from any specific provider.
"""

from abc import ABC, abstractmethod

from app.schemas import ExtractResponse


class BaseExtractor(ABC):
    """Provider-agnostic image extraction interface."""

    @abstractmethod
    async def extract(self, image_bytes: bytes) -> ExtractResponse:
        """Extract expense fields from image bytes.

        Rules (from PROJECT.md):
        - Return ExtractResponse with null for any unknown field.
        - Never guess a price or expiry date.
        - Prefer the printed selling price / MRP.
        - Supported date formats: DD/MM/YY, MM/YYYY,
          "best before N months" (only if manufacture date is visible).
        """
        ...
