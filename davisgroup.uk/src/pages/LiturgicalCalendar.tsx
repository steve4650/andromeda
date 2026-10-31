import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as ical from "ical";
import type { CalendarComponent } from "ical";
import "../styles/LiturgicalCalendar.css";

interface DisplayEvent {
  uid: string;
  date: Date;
  title: string;
}

export default function LiturgicalCalendar() {
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [{ start: rangeStart, end: rangeEnd }] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });

  const handleCopyLink = async () => {
    const url = "https://davisgroup.uk/liturgy.ics";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = url;
        tempInput.setAttribute("readonly", "");
        tempInput.style.position = "absolute";
        tempInput.style.left = "-9999px";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      setCopyStatus("Copied!");
      setTimeout(() => {
        setCopyStatus("Copy link");
      }, 1600);
    } catch (err) {
      setCopyStatus("Copy failed");
      console.error(err);
    }
  };

  useEffect(() => {
    async function loadCalendar() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/liturgy.ics");
        if (!response.ok) {
          throw new Error(`Failed to fetch /liturgy.ics (HTTP ${response.status})`);
        }

        const icsText = await response.text();

        if (typeof ical.parseICS !== "function") {
          throw new Error("Could not find parseICS in ical library");
        }

        const parsedData = ical.parseICS(icsText);

        const filteredEvents: DisplayEvent[] = [];

        for (const key of Object.keys(parsedData)) {
          const item = parsedData[key] as CalendarComponent;
          if (item && item.type === "VEVENT" && item.start) {
            const eventDate = item.start instanceof Date ? item.start : new Date(item.start);

            if (eventDate >= rangeStart && eventDate <= rangeEnd) {
              filteredEvents.push({
                uid: item.uid ?? key,
                date: eventDate,
                title: item.summary ?? "Liturgical Event",
              });
            }
          }
        }

        filteredEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
        setEvents(filteredEvents);
      } catch (err) {
        console.error("Error loading liturgical calendar:", err);
        setError(err instanceof Error ? err.message : "Error parsing calendar data");
      } finally {
        setLoading(false);
      }
    }

    loadCalendar();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const rangeDescription = `${rangeStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${rangeEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className="liturgical-cal-root colflex">
      <div className="nav-back">
        <Link to="/">← davisgroup.uk</Link>
      </div>
      <span className="title">Liturgical Calendar</span>
      <p>
        This is an online Roman Catholic liturgical calendar based on{" "}
        <a href="https://www.usccb.org/committees/divine-worship/liturgical-calendar">
          the official USCCB calendar
        </a>
        . Subscribe using the iPhone Calendar app, Google Calendar, et cetera!
      </p>

      <p className="subtitle">Instructions:</p>
      <ol>
        <li>
          Copy this link:
          <div className="copy-link-row">
            <code id="calendar-url">https://davisgroup.uk/liturgy.ics</code>
            <button id="copy-button" type="button" onClick={handleCopyLink}>
              {copyStatus}
            </button>
          </div>
        </li>
        <li>
          Subscribe using one of these instructions:
          <ul>
            <li>
              <a href="https://support.apple.com/en-us/102301">iPhone Calendar</a>
            </li>
            <li>
              <a href="https://support.google.com/calendar/answer/37100">Google Calendar</a>
            </li>
          </ul>
        </li>
      </ol>

      <section className="upcoming-events-section">
        <span className="subtitle">Upcoming Events</span>
        <p className="events-range">Next month ({rangeDescription})</p>

        {loading && <p>Loading upcoming events...</p>}

        {error && (
          <>
            <p>Could not load calendar events: {error}</p>
            <p>You can still subscribe using the link above.</p>
          </>
        )}

        {!loading && !error && events.length === 0 && (
          <p>No events scheduled for the next month.</p>
        )}

        {!loading && !error && events.length > 0 && (
          <ul className="events-list">
            {events.map((event) => (
              <li key={event.uid}>
                <time className="event-date" dateTime={event.date.toISOString().slice(0, 10)}>
                  {formatDate(event.date)}
                </time>{" "}
                {event.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
