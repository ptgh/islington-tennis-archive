#!/usr/bin/env python3
"""Refresh the optional, simplified OSM backdrop. Python 3 and curl only.

Run from the repository root: python3 scripts/fetch-geography.py
Or transform a saved Overpass response: --input /path/to/response.json
This is a bounding-box extract, not an exhaustive borough map. Park relations
are not included. OSM copyright attribution must remain visible when rendered.
The existing output is preserved if downloading or validation fails.
"""

import argparse
import datetime
import json
import math
from pathlib import Path
import subprocess
import sys


BBOX = (51.522, -0.152, 51.577, -0.078)  # south, west, north, east
QUERY = """[out:json][timeout:30];(
way["highway"~"^(primary|secondary|tertiary)$"](51.522,-0.152,51.577,-0.078);
way["leisure"="park"](51.522,-0.152,51.577,-0.078);
way["railway"="rail"](51.522,-0.152,51.577,-0.078);
);out geom;"""
ENDPOINT = "https://overpass-api.de/api/interpreter"


def perpendicular_distance(point, start, end):
    """Approximate metres, sufficiently accurate for this local backdrop."""
    scale = (111320 * math.cos(math.radians(51.55)), 111320)
    p, a, b = [tuple(v[i] * scale[i] for i in range(2)) for v in (point, start, end)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == dy == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def simplify(points, tolerance=3):
    """Douglas-Peucker simplification; retain endpoints and meaningful bends."""
    if len(points) <= 2:
        return points
    distances = [perpendicular_distance(p, points[0], points[-1]) for p in points[1:-1]]
    furthest = max(distances)
    if furthest <= tolerance:
        return [points[0], points[-1]]
    split = distances.index(furthest) + 1
    return simplify(points[:split + 1], tolerance)[:-1] + simplify(points[split:], tolerance)


def transform(raw, source):
    if raw.get("remark") or not isinstance(raw.get("elements"), list):
        raise ValueError("Overpass returned an error or an incomplete response")
    result = {
        "roads": [], "parks": [], "rails": [],
        "bbox": list(BBOX),
        "attribution": "© OpenStreetMap contributors",
        "license": "https://www.openstreetmap.org/copyright",
        "source": source,
        "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "osmTimestamp": raw.get("osm3s", {}).get("timestamp_osm_base"),
        "notes": "Simplified OSM ways intersecting the bounding box; endpoints may extend outside it. Park relations and minor roads are omitted. Not for navigation.",
    }
    seen = set()
    for element in raw["elements"]:
        tags = element.get("tags", {})
        geometry = element.get("geometry", [])
        if element.get("type") != "way" or len(geometry) < 2:
            continue
        points = [[round(p["lon"], 6), round(p["lat"], 6)] for p in geometry]
        points = [p for i, p in enumerate(points) if i == 0 or p != points[i - 1]]
        if len(points) < 2:
            continue
        if tags.get("highway") in ("primary", "secondary", "tertiary"):
            category, kind = "roads", tags["highway"]
        elif tags.get("leisure") == "park":
            if points[0] != points[-1] or len(points) < 4:
                continue  # Render only closed park polygons.
            category, kind = "parks", "park"
        elif tags.get("railway") == "rail":
            category, kind = "rails", "tunnel" if tags.get("tunnel") in ("yes", "building_passage") else "surface"
        else:
            continue
        reduced = simplify(points)
        if category == "parks" and len(reduced) < 4:
            reduced = points
        key = (category, tuple(map(tuple, reduced)))
        reverse_key = (category, tuple(map(tuple, reversed(reduced))))
        if key in seen or reverse_key in seen:
            continue
        seen.add(key)
        result[category].append({"name": tags.get("name", ""), "points": reduced, "kind": kind, "osmWayId": element["id"]})
    if not result["roads"]:
        raise ValueError("No roads returned; refusing to replace the existing backdrop")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Read an already downloaded Overpass JSON response")
    parser.add_argument("--endpoint", default=ENDPOINT)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "public/data/islington-geography.json")
    args = parser.parse_args()
    try:
        if args.input:
            raw = json.loads(args.input.read_text())
        else:
            response = subprocess.run(
                ["curl", "--fail", "--silent", "--show-error", "--max-time", "45", "--get", "--data-urlencode", "data=" + QUERY, args.endpoint],
                check=True, capture_output=True, text=True,
            )
            raw = json.loads(response.stdout)
        result = transform(raw, args.endpoint)
        payload = json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n"
        if len(payload.encode()) > 300000:
            raise ValueError("Output exceeds the 300 KB backdrop budget; narrow the extract")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.output.with_suffix(".tmp")
        temporary.write_text(payload)
        temporary.replace(args.output)
        print(f"Saved {args.output}: {len(result['roads'])} roads, {len(result['parks'])} parks, {len(result['rails'])} railway ways; {len(payload.encode())} bytes")
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        detail = error.stderr.strip() if isinstance(error, subprocess.CalledProcessError) else str(error)
        print(f"Geography refresh failed; existing data preserved: {detail}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
