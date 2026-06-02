"""Custom DRF exception handler — consistent error format."""
from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        errors = response.data
        if isinstance(errors, dict):
            first_key = next(iter(errors), None)
            first_val = errors.get(first_key, "")
            if isinstance(first_val, list):
                first_val = first_val[0]
            response.data = {
                "error": str(first_val),
                "code": str(exc.__class__.__name__).upper(),
                "details": errors,
            }
    return response
