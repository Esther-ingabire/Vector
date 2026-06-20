"""
Distance helpers for "nearby" recommendations (warehouses near a cooperative,
distributors near a market agent, etc). Plain-Python haversine — no geo
library/extension needed since we only ever sort a few hundred rows in memory.
"""

import math


def haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance between two lat/lng points, in kilometres."""
    lat1, lng1, lat2, lng2 = map(float, (lat1, lng1, lat2, lng2))
    r = 6371.0  # Earth radius, km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return r * 2 * math.asin(math.sqrt(a))


def nearest(items, origin_lat, origin_lng, lat_attr='gps_latitude', lng_attr='gps_longitude', limit=5):
    """
    Sort `items` (any iterable of model instances with lat/lng attributes) by distance
    from (origin_lat, origin_lng). Items missing coordinates are dropped.
    Returns a list, each item annotated with `.distance_km`.
    """
    if origin_lat is None or origin_lng is None:
        return []
    scored = []
    for item in items:
        lat, lng = getattr(item, lat_attr, None), getattr(item, lng_attr, None)
        if lat is None or lng is None:
            continue
        item.distance_km = round(haversine_km(origin_lat, origin_lng, lat, lng), 1)
        scored.append(item)
    scored.sort(key=lambda i: i.distance_km)
    return scored[:limit]
