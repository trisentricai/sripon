"""Seed a SUPER_ADMIN admin account (deployment helper).

Admin identities live in Supabase Auth; this command creates the matching
``AdminUser`` row in Django so the linked Supabase identity can sign in to the
dashboard. Run once after provisioning a Supabase admin user:

    python manage.py seed_superadmin --supabase-uid <uid> --email a@x.com
"""
from django.core.management.base import BaseCommand

from apps.users.models import AdminUser


class Command(BaseCommand):
    help = "Create (or promote) the Django record for a SUPER_ADMIN."

    def add_arguments(self, parser):
        parser.add_argument("--supabase-uid", required=True, help="Supabase Auth user id.")
        parser.add_argument("--email", required=True, help="Admin email address.")
        parser.add_argument("--name", default="Super Admin", help="Display name.")

    def handle(self, *args, **options):
        admin, created = AdminUser.objects.update_or_create(
            supabase_uid=options["supabase_uid"],
            defaults={
                "email": options["email"].lower().strip(),
                "name": options["name"],
                "role": AdminUser.Role.SUPER_ADMIN,
                "active": True,
            },
        )
        verb = "created" if created else "promoted to SUPER_ADMIN"
        self.stdout.write(
            self.style.SUCCESS(
                f"Admin {admin.email} {verb} (supabase_uid={admin.supabase_uid})."
            )
        )