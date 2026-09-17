from django.db import models

from apps.common.models import TimeStampedModel


class Category(TimeStampedModel):
    """Product category supporting nested parent/child trees."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    description = models.TextField(blank=True)
    image = models.JSONField(default=dict, blank=True)
    banner = models.JSONField(default=dict, blank=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    sort_order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "name"],
                name="uniq_category_parent_name",
            )
        ]

    def __str__(self):
        prefix = ""
        if self.parent:
            prefix = f"{self.parent} / "
        return f"{prefix}{self.name}"

    def get_descendant_ids(self):
        ids = []
        queue = list(self.children.values_list("id", flat=True))
        while queue:
            current = queue.pop(0)
            ids.append(current)
            queue.extend(
                Category.objects.filter(parent_id=current).values_list(
                    "id", flat=True
                )
            )
        return ids