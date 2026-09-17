"""
Centralised exception handler for the SriPon API.

Converts Django/DRF exceptions into a consistent, human-readable envelope and
guarantees that raw stack traces and internal details never leak to clients.
"""
import logging

from rest_framework import status as http_status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("django.request")


def api_exception_handler(exc, context):
    """Translate every raised exception into the SriPon error envelope."""
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled error (e.g. 500 caused by an unexpected exception).
        logger.exception(
            "Unhandled API exception in %s",
            context["request"].path if context.get("request") else "<unknown>",
            exc_info=exc,
        )
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred. Please try again.",
                "errors": {},
            },
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = response.data
    detail = data.get("detail")
    message = (
        str(detail)
        if detail is not None
        else "Invalid request data."
    )

    errors = {}
    if isinstance(data, dict):
        detail = data.get("detail")

        if detail is not None and isinstance(detail, list):
            # e.g. throttling / authentication errors
            if data.keys() == {"detail"}:
                message = " ".join(map(str, detail))
                errors = {}
            else:
                errors = data

        for field, value in data.items():
            if field == "detail" and isinstance(value, list):
                continue
            if isinstance(value, (list, tuple)):
                errors[field] = [str(item) for item in value]
            else:
                errors[field] = str(value)

    return Response(
        {
            "success": False,
            "message": message,
            "errors": errors,
        },
        status=response.status_code,
    )