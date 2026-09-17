"""Admin analytics routing (Phase 12)."""
from django.urls import path

from .views import (
    AnalyticsTrendView,
    CategorySalesView,
    DashboardAggregateView,
    TopCustomersView,
    TopProductsView,
)

urlpatterns = [
    path("dashboard/", DashboardAggregateView.as_view(), name="admin-dashboard"),
    path("analytics/", AnalyticsTrendView.as_view(), name="admin-analytics"),
    path(
        "analytics/top-products/",
        TopProductsView.as_view(),
        name="admin-analytics-top-products",
    ),
    path(
        "analytics/top-customers/",
        TopCustomersView.as_view(),
        name="admin-analytics-top-customers",
    ),
    path(
        "analytics/category-sales/",
        CategorySalesView.as_view(),
        name="admin-analytics-category-sales",
    ),
]