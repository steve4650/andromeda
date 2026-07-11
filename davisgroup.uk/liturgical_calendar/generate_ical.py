"""Generate an iCalendar file from liturgical CSV data."""

from __future__ import annotations

import csv
import datetime
import hashlib
import pathlib
import sys

from icalendar import Calendar, Event

CSV_FILENAME = "liturgy.csv"
OUTPUT_FILENAME = "../dist/liturgy.ics"
QUALIFIER_FIELDS = ["Solemnity", "Holyday of Obligation", "Feast"]


def normalize_qualifier(value: str) -> str:
    return value.strip()


def get_event_summary(description: str, qualifiers: list[str]) -> str:
    if qualifiers:
        return f"{description} ({', '.join(qualifiers)})"
    return description


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes", "y", "t"}


def build_uid(date: datetime.date, summary: str) -> str:
    digest = hashlib.sha1(f"{date.isoformat()}|{summary}".encode()).hexdigest()
    return f"{digest}@davisgroup.uk"


def read_events(csv_path: pathlib.Path) -> list[dict[str, str]]:
    with csv_path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = []
        for row in reader:
            if not row.get("Date") or not row.get("Description"):
                continue
            rows.append(row)
    return rows


def build_ical(events: list[dict[str, str]], now: datetime.datetime) -> str:
    calendar = Calendar()
    calendar.add("prodid", "-//davisgroup.uk//Liturgy Calendar//EN")
    calendar.add("version", "2.0")
    calendar.add("calscale", "GREGORIAN")
    calendar.add("method", "PUBLISH")
    calendar.add("x-wr-calname", "USCCB Liturgical Calendar")

    for row in events:
        try:
            event_date = datetime.date.fromisoformat(row["Date"].strip())
        except ValueError as exc:
            raise ValueError(f"Invalid date in CSV: {row['Date']!r}") from exc

        description = row["Description"].strip()
        qualifiers = [field for field in QUALIFIER_FIELDS if row.get(field) and parse_bool(row[field])]
        summary = get_event_summary(description, qualifiers)
        uid = build_uid(event_date, summary)

        event = Event()
        event.add("dtstamp", now)
        event["uid"] = uid
        event.add("dtstart", event_date)
        event.add("dtend", event_date + datetime.timedelta(days=1))
        event.add("summary", summary)
        event.add("transp", "TRANSPARENT")
        calendar.add_component(event)

    return calendar.to_ical().decode("utf-8")


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv
    script_dir = pathlib.Path(__file__).resolve().parent
    csv_path = script_dir / CSV_FILENAME
    output_path = script_dir / OUTPUT_FILENAME

    if len(argv) > 1:
        output_path = pathlib.Path(argv[1])

    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}", file=sys.stderr)
        return 1

    events = read_events(csv_path)
    calendar_text = build_ical(events, datetime.datetime.now(datetime.UTC))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(calendar_text, encoding="utf-8")
    print(f"Generated {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
