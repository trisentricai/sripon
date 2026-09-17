"""Rate-limit throttle classes for sensitive or brute-forceable endpoints.

The ``DEFAULT_THROTTLE_RATES`` in ``config.settings.base`` define the limits:

    login    - authentication attempts
    coupon   - coupon validation
    checkout - order placement
    payment  - payment initiation / confirmation

Each class extends ``SimpleRateThrottle`` and keys on the request user (falling
back to IP for anonymous requests) so one customer exhausting a limit cannot
starve another.
"""
from rest_framework.throttling import SimpleRateThrottle


class _ScopedUserRateThrottle(SimpleRateThrottle):
    """Base for per-user, per-scope throttling with a fixed rate."""

    scope = None
    rate = None

    def get_cache_key(self, request, view):
        if request.user and getattr(request.user, "pk", None):
            ident = f"user-{request.user.pk}"
        else:
            ident = f"anon-{self.get_ident(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginThrottle(_ScopedUserRateThrottle):
    scope = "login"
    rate = "10/min"


class CouponThrottle(_ScopedUserRateThrottle):
    scope = "coupon"
    rate = "20/min"


class CheckoutThrottle(_ScopedUserRateThrottle):
    scope = "checkout"
    rate = "10/min"


class PaymentThrottle(_ScopedUserRateThrottle):
    scope = "payment"
    rate = "10/min"


class StrictAnonRateThrottle(SimpleRateThrottle):
    """Tighter anonymous limit for public write endpoints."""

    scope = "anon"
    rate = "10/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": f"anon-{self.get_ident(request)}",
        }