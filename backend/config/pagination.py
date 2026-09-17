"""Shared pagination and consistent response helpers."""
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default pagination shape used by list endpoints.

    Adds ``page_size``, ``total`` and ``total_pages`` metadata so API clients
    can render pager controls without guessing.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        from rest_framework.response import Response

        page_size = self.get_page_size(self.request)

        return Response(
            {
                "success": True,
                "data": data,
                "pagination": {
                    "page": self.page.number,
                    "page_size": page_size,
                    "total": self.page.paginator.count,
                    "total_pages": self.page.paginator.num_pages,
                },
            }
        )


def success_response(data=None, message: str = "Success", status: int = 200):
    """Consistent success envelope for ad-hoc endpoints."""
    from rest_framework.response import Response

    return Response(
        {"success": True, "data": data, "message": message},
        status=status,
    )


def error_response(
    message: str = "Error",
    errors: dict | None = None,
    status: int = 400,
):
    """Consistent error envelope for ad-hoc endpoints."""
    from rest_framework.response import Response

    return Response(
        {
            "success": False,
            "message": message,
            "errors": errors or {},
        },
        status=status,
    )