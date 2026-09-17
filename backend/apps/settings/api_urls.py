from django.urls import path

from . import api

urlpatterns = [
    path("", api.HomeView.as_view(), name="home-index"),
]