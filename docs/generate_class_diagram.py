from __future__ import annotations

from dataclasses import dataclass
from html import escape
from pathlib import Path


@dataclass(frozen=True)
class ClassBox:
    name: str
    fields: tuple[str, ...]
    x: int
    y: int
    width: int = 285

    @property
    def height(self) -> int:
        return 52 + len(self.fields) * 22 + 16

    @property
    def center(self) -> tuple[int, int]:
        return self.x + self.width // 2, self.y + self.height // 2

    def side_point(self, other: "ClassBox") -> tuple[int, int]:
        cx, cy = self.center
        ox, _ = other.center
        if ox >= cx:
            return self.x + self.width, cy
        return self.x, cy


@dataclass(frozen=True)
class Relation:
    source: str
    target: str
    label: str
    source_cardinality: str
    target_cardinality: str
    inheritance: bool = False


Point = tuple[int, int]


CLASSES = (
    ClassBox(
        "AbstractUser",
        ("<<Django>>",),
        60,
        60,
    ),
    ClassBox(
        "CustomUser",
        (
            "+ full_name: CharField",
            "+ phone: CharField",
            "+ role: CharField",
            "+ email_verified: BooleanField",
            "+ verification_code: CharField",
            "+ verification_code_expires_at: DateTimeField",
            "+ effective_role: property",
        ),
        60,
        220,
    ),
    ClassBox(
        "Visit",
        (
            "+ user: ForeignKey",
            "+ path: CharField",
            "+ ip: CharField",
            "+ user_agent: TextField",
            "+ created_at: DateTimeField",
            "+ __str__()",
        ),
        60,
        520,
    ),
    ClassBox(
        "Category",
        (
            "+ name: CharField",
            "+ delivery_price: IntegerField",
            "+ __str__()",
        ),
        430,
        60,
    ),
    ClassBox(
        "Location",
        (
            "+ city: CharField",
            "+ latitude: FloatField",
            "+ longitude: FloatField",
            "+ __str__()",
        ),
        430,
        235,
    ),
    ClassBox(
        "Listing",
        (
            "+ title: CharField",
            "+ photo: ImageField",
            "+ description: TextField",
            "+ price: DecimalField",
            "+ created_at: DateTimeField",
            "+ user: ForeignKey",
            "+ category: ForeignKey",
            "+ location: ForeignKey",
            "+ name: CharField",
            "+ email: EmailField",
            "+ phone: CharField",
            "+ is_active: BooleanField",
            "+ reported: BooleanField",
            "+ report_reason: TextField",
            "+ report_message: TextField",
            "+ reported_at: DateTimeField",
            "+ promoted_until: DateTimeField",
            "+ is_promoted: property",
            "+ __str__()",
        ),
        430,
        435,
    ),
    ClassBox(
        "Image",
        (
            "+ image_url: TextField",
            "+ listing: ForeignKey",
        ),
        805,
        60,
    ),
    ClassBox(
        "Review",
        (
            "+ rating: IntegerField",
            "+ comment: TextField",
            "+ user: ForeignKey",
            "+ listing: ForeignKey",
            "+ created_at: DateTimeField",
            "+ __str__()",
        ),
        805,
        205,
    ),
    ClassBox(
        "Favorite",
        (
            "+ user: ForeignKey",
            "+ listing: ForeignKey",
            "+ unique_together(user, listing)",
        ),
        805,
        445,
    ),
    ClassBox(
        "Order",
        (
            "+ user: ForeignKey",
            "+ listing: ForeignKey",
            "+ city: CharField",
            "+ delivery_price: PositiveIntegerField",
            "+ final_price: PositiveIntegerField",
            "+ payment_provider: CharField",
            "+ payment_reference: CharField",
            "+ created_at: DateTimeField",
            "+ paid: BooleanField",
            "+ __str__()",
        ),
        1180,
        60,
    ),
    ClassBox(
        "CanceledOrderLog",
        (
            "+ original_order_id: PositiveIntegerField",
            "+ user: ForeignKey",
            "+ listing: ForeignKey",
            "+ city: CharField",
            "+ delivery_price: PositiveIntegerField",
            "+ final_price: PositiveIntegerField",
            "+ paid: BooleanField",
            "+ order_created_at: DateTimeField",
            "+ canceled_at: DateTimeField",
            "+ __str__()",
        ),
        1180,
        395,
    ),
    ClassBox(
        "Message",
        (
            "+ listing: ForeignKey",
            "+ sender: ForeignKey",
            "+ receiver: ForeignKey",
            "+ content: TextField",
            "+ timestamp: DateTimeField",
        ),
        1180,
        710,
    ),
)

RELATIONS = (
    Relation("CustomUser", "AbstractUser", "extends", "", "", True),
    Relation("CustomUser", "Visit", "visits", "1", "0..*"),
    Relation("CustomUser", "Listing", "listings", "1", "0..*"),
    Relation("CustomUser", "Review", "reviews", "1", "0..*"),
    Relation("CustomUser", "Favorite", "favorites", "1", "0..*"),
    Relation("CustomUser", "Order", "orders", "1", "0..*"),
    Relation("CustomUser", "CanceledOrderLog", "canceled_orders", "0..1", "0..*"),
    Relation("CustomUser", "Message", "sent/received", "1", "0..*"),
    Relation("Category", "Listing", "category", "0..1", "0..*"),
    Relation("Location", "Listing", "location", "0..1", "0..*"),
    Relation("Listing", "Image", "images", "1", "0..*"),
    Relation("Listing", "Review", "reviews", "1", "0..*"),
    Relation("Listing", "Favorite", "favorited_by", "1", "0..*"),
    Relation("Listing", "Order", "orders", "1", "0..*"),
    Relation("Listing", "CanceledOrderLog", "canceled_orders", "0..1", "0..*"),
    Relation("Listing", "Message", "messages", "0..1", "0..*"),
)


ORTHOGONAL_ROUTES: dict[tuple[str, str, str], tuple[Point, ...]] = {
    ("CustomUser", "AbstractUser", "extends"): ((202, 220), (202, 150)),
    ("CustomUser", "Visit", "visits"): ((202, 442), (202, 520)),
    ("CustomUser", "Listing", "listings"): (
        (345, 330),
        (390, 330),
        (390, 610),
        (430, 610),
    ),
    ("CustomUser", "Review", "reviews"): (
        (345, 285),
        (370, 285),
        (370, 45),
        (760, 45),
        (760, 305),
        (805, 305),
    ),
    ("CustomUser", "Favorite", "favorites"): (
        (345, 360),
        (370, 360),
        (370, 930),
        (765, 930),
        (765, 512),
        (805, 512),
    ),
    ("CustomUser", "Order", "orders"): (
        (345, 260),
        (360, 260),
        (360, 30),
        (1160, 30),
        (1160, 150),
        (1180, 150),
    ),
    ("CustomUser", "CanceledOrderLog", "canceled_orders"): (
        (345, 395),
        (385, 395),
        (385, 945),
        (1160, 945),
        (1160, 500),
        (1180, 500),
    ),
    ("CustomUser", "Message", "sent/received"): (
        (345, 420),
        (365, 420),
        (365, 960),
        (1140, 960),
        (1140, 800),
        (1180, 800),
    ),
    ("Category", "Listing", "category"): (
        (715, 130),
        (745, 130),
        (745, 465),
        (715, 465),
    ),
    ("Location", "Listing", "location"): ((572, 391), (572, 435)),
    ("Listing", "Image", "images"): (
        (715, 470),
        (765, 470),
        (765, 45),
        (948, 45),
        (948, 60),
    ),
    ("Listing", "Review", "reviews"): (
        (715, 535),
        (750, 535),
        (750, 305),
        (805, 305),
    ),
    ("Listing", "Favorite", "favorited_by"): ((715, 512), (805, 512)),
    ("Listing", "Order", "orders"): (
        (715, 610),
        (1125, 610),
        (1125, 205),
        (1180, 205),
    ),
    ("Listing", "CanceledOrderLog", "canceled_orders"): (
        (715, 555),
        (1145, 555),
        (1145, 540),
        (1180, 540),
    ),
    ("Listing", "Message", "messages"): (
        (715, 750),
        (1110, 750),
        (1110, 780),
        (1180, 780),
    ),
}


def class_svg(box: ClassBox) -> str:
    rows = []
    y = box.y + 60
    for field in box.fields:
        rows.append(
            f'<text x="{box.x + 16}" y="{y}" class="field">{escape(field)}</text>'
        )
        y += 22

    return "\n".join(
        (
            f'<g class="class-box" id="{box.name}">',
            f'<rect x="{box.x}" y="{box.y}" width="{box.width}" height="{box.height}" rx="8"/>',
            f'<rect class="class-title-bg" x="{box.x}" y="{box.y}" width="{box.width}" height="42" rx="8"/>',
            f'<line x1="{box.x}" y1="{box.y + 42}" x2="{box.x + box.width}" y2="{box.y + 42}"/>',
            f'<text x="{box.x + box.width / 2}" y="{box.y + 27}" class="title">{escape(box.name)}</text>',
            *rows,
            "</g>",
        )
    )


def route_for(relation: Relation, boxes: dict[str, ClassBox]) -> tuple[Point, ...]:
    route = ORTHOGONAL_ROUTES.get((relation.source, relation.target, relation.label))
    if route:
        return route

    source = boxes[relation.source]
    target = boxes[relation.target]
    if relation.inheritance:
        return (
            (source.x + source.width // 2, source.y),
            (target.x + target.width // 2, target.y + target.height),
        )

    sx, sy = source.side_point(target)
    tx, ty = target.side_point(source)
    middle_x = (sx + tx) // 2
    return ((sx, sy), (middle_x, sy), (middle_x, ty), (tx, ty))


def route_midpoint(points: tuple[Point, ...]) -> Point:
    segments = [
        (start, end, abs(end[0] - start[0]) + abs(end[1] - start[1]))
        for start, end in zip(points, points[1:])
    ]
    total = sum(length for _, _, length in segments)
    half = total / 2
    covered = 0

    for start, end, length in segments:
        if covered + length >= half:
            remaining = half - covered
            dx = 0 if end[0] == start[0] else 1 if end[0] > start[0] else -1
            dy = 0 if end[1] == start[1] else 1 if end[1] > start[1] else -1
            return int(start[0] + dx * remaining), int(start[1] + dy * remaining)
        covered += length

    return points[-1]


def cardinality_svg(text: str, point: Point, neighbor: Point, near_start: bool) -> str:
    if not text:
        return ""

    direction_x = neighbor[0] - point[0]
    direction_y = neighbor[1] - point[1]
    x_offset = 14 if direction_x >= 0 else -14
    y_offset = -8 if direction_y >= 0 or near_start else 16
    return (
        f'<text x="{point[0] + x_offset}" y="{point[1] + y_offset}" class="cardinality">'
        f"{escape(text)}</text>"
    )


def relation_svg(relation: Relation, boxes: dict[str, ClassBox]) -> str:
    points = route_for(relation, boxes)
    sx, sy = points[0]
    tx, ty = points[-1]
    mx, my = route_midpoint(points)
    marker = "url(#inheritance)" if relation.inheritance else "url(#association)"
    stroke = "inheritance-line" if relation.inheritance else "association-line"
    point_list = " ".join(f"{x},{y}" for x, y in points)

    labels = ""
    if relation.label:
        labels = (
            f'<text x="{mx}" y="{my - 8}" class="relation-label">{escape(relation.label)}</text>'
        )
    labels += cardinality_svg(relation.source_cardinality, points[0], points[1], True)
    labels += cardinality_svg(relation.target_cardinality, points[-1], points[-2], False)

    return "\n".join(
        (
            '<g class="relation">',
            f'<polyline class="{stroke}" points="{point_list}" marker-end="{marker}"/>',
            labels,
            "</g>",
        )
    )


def build_svg() -> str:
    boxes = {box.name: box for box in CLASSES}
    width = 1540
    height = 990
    relations = "\n".join(relation_svg(relation, boxes) for relation in RELATIONS)
    class_boxes = "\n".join(class_svg(box) for box in CLASSES)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <defs>
    <marker id="association" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 10 4 L 0 8 z" fill="#40536b"/>
    </marker>
    <marker id="inheritance" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 12 6 L 0 12 z" fill="#ffffff" stroke="#2f3d4d" stroke-width="1.5"/>
    </marker>
    <style>
      svg {{
        background: #f6f8fb;
        font-family: "Segoe UI", Arial, sans-serif;
      }}
      .class-box rect {{
        fill: #ffffff;
        stroke: #2f3d4d;
        stroke-width: 1.4;
      }}
      .class-title-bg {{
        fill: #e8eef6 !important;
      }}
      .class-box line {{
        stroke: #2f3d4d;
        stroke-width: 1.2;
      }}
      .title {{
        fill: #182536;
        font-size: 17px;
        font-weight: 700;
        text-anchor: middle;
      }}
      .field {{
        fill: #24364a;
        font-size: 13px;
      }}
      .association-line {{
        fill: none;
        stroke: #40536b;
        stroke-width: 1.4;
      }}
      .inheritance-line {{
        fill: none;
        stroke: #2f3d4d;
        stroke-width: 1.8;
      }}
      .relation-label {{
        fill: #5d6f84;
        font-size: 12px;
        text-anchor: middle;
        paint-order: stroke;
        stroke: #f6f8fb;
        stroke-width: 5px;
      }}
      .cardinality {{
        fill: #304258;
        font-size: 12px;
        font-weight: 600;
        paint-order: stroke;
        stroke: #f6f8fb;
        stroke-width: 5px;
        text-anchor: middle;
      }}
    </style>
  </defs>
  <text x="60" y="34" style="font-size: 22px; font-weight: 700; fill: #182536;">Class Diagram: Django Classifieds Project</text>
  {relations}
  {class_boxes}
</svg>
"""


def main() -> None:
    output = Path(__file__).with_name("class_diagram.svg")
    output.write_text(build_svg(), encoding="utf-8")
    print(f"Generated {output}")


if __name__ == "__main__":
    main()
