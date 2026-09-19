"""Views for the baked SriPon admin dashboard (served by Django)."""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def admin_portal(request, path: str = ""):
    """Serve the built admin SPA and its assets under /admin-portal/.

    The Vite build lands in ``settings.ADMIN_PORTAL_DIR``. Requests for real
    files (JS/CSS/fonts/favicon) are answered from disk; everything else falls
    back to ``index.html`` so client-side routes render directly.
    """
    root = Path(settings.ADMIN_PORTAL_DIR).resolve()
    if not root.is_dir():
        raise Http404("Admin dashboard is not built.")

    if path:
        candidate = (root / path).resolve()
        # Guard against path traversal; only serve files inside the build dir.
        try:
            candidate.relative_to(root)
        except ValueError:
            raise Http404("Not found.")
        if candidate.is_file():
            content_type, _ = mimetypes.guess_type(candidate.name)
            return FileResponse(
                candidate.open("rb"),
                content_type=content_type or "application/octet-stream",
            )

    index = root / "index.html"
    if not index.is_file():
        raise Http404("Admin dashboard is not built.")
    return FileResponse(index.open("rb"), content_type="text/html")