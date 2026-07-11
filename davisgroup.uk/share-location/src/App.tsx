import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { Map as OpenMap, View } from "ol";
import { Tile } from "ol/layer";
import { fromLonLat } from "ol/proj";
import { OSM } from "ol/source";

type LocationEntry = {
  latitude: number;
  longitude: number;
  timestamp: number;
  note?: string;
};

const STORAGE_KEY = "share-location-recent-locations";

function buildMapsLink(latitude: number, longitude: number, provider: "google" | "apple") {
  return provider === "google"
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : `https://maps.apple.com/?q=${latitude},${longitude}`;
}

function App() {
  const [pos, setPos] = useState<{ latitude: null | number; longitude: null | number }>({
    latitude: null,
    longitude: null,
  });
  const [shareData, setShareData] = useState("");
  const [map, setMap] = useState<OpenMap | null>(null);
  const [recentLocations, setRecentLocations] = useState<LocationEntry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: LocationEntry[] = JSON.parse(stored);
        setRecentLocations(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (newpos) => {
          setPos({
            latitude: newpos.coords.latitude,
            longitude: newpos.coords.longitude,
          });
        },
        (error) => {
          console.log(error);
        },
      );
    } else {
      console.log("geolocation not available");
    }
  }, []);

  useEffect(() => {
    if (pos.latitude !== null && pos.longitude !== null) {
      setShareData(
        `My location\n\nGoogle Maps link: ${buildMapsLink(pos.latitude, pos.longitude, "google")}\n\nApple Maps link: ${buildMapsLink(pos.latitude, pos.longitude, "apple")}\n\nhttps://davisgroup.uk/share-location`,
      );

      const newEntry: LocationEntry = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        timestamp: Date.now(),
      };

      setRecentLocations((current) => {
        if (
          current.length > 0 &&
          current[0].latitude === newEntry.latitude &&
          current[0].longitude === newEntry.longitude
        ) {
          return current;
        }
        const next = [newEntry, ...current].slice(0, 20);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [pos]);

  const saveNoteForEntry = (entryId: number, note: string) => {
    setRecentLocations((current) => {
      const updated = current.map((entry) =>
        entry.timestamp === entryId ? { ...entry, note } : entry,
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setEditingId(null);
    setEditingNote("");
  };

  const startEditingNote = (entry: LocationEntry) => {
    setEditingId(entry.timestamp);
    setEditingNote(entry.note ?? "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingNote("");
  };

  const clearRecentLocations = () => {
    setRecentLocations([]);
    setEditingId(null);
    setEditingNote("");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const createMap = useCallback(
    (elt: HTMLElement) => {
      if (map === null && pos.latitude !== null && pos.longitude !== null) {
        const view = new View({
          center: fromLonLat([pos.longitude, pos.latitude]),
          zoom: 18,
        });
        setMap(
          new OpenMap({
            target: elt,
            layers: [
              new Tile({
                source: new OSM({ attributions: "" }),
              }),
            ],
            view,
          }),
        );
      }
    },
    [map, pos],
  );

  return (
    <div className="App">
      <span className="title">
        <a href="https://davisgroup.uk">davisgroup.uk</a> - Share Location
      </span>
      <a
        href={
          pos.latitude !== null && pos.longitude !== null
            ? buildMapsLink(pos.latitude, pos.longitude, "google")
            : "#"
        }
        target="_blank"
        rel="noreferrer"
      >
        Google Maps
      </a>
      <a
        href={
          pos.latitude !== null && pos.longitude !== null
            ? buildMapsLink(pos.latitude, pos.longitude, "apple")
            : "#"
        }
        target="_blank"
        rel="noreferrer"
      >
        Apple Maps
      </a>
      <div>
        <input
          type="button"
          value="Share"
          disabled={!shareData}
          onClick={() => navigator.share({ text: shareData, title: "My location" })}
        />
      </div>

      <div
        id="demo-map"
        // @ts-expect-error
        ref={createMap}
      />

      <section className="recent">
        <div className="recent-header">
          <h2>Recent locations</h2>
          <button type="button" className="clear-button" onClick={clearRecentLocations}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "0.25rem", verticalAlign: "middle" }}
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear all
          </button>
        </div>
        {recentLocations.length === 0 ? (
          <p>No saved locations yet.</p>
        ) : (
          <ul>
            {recentLocations.map((entry) => (
              <li key={entry.timestamp}>
                <div className="entry-info">
                  <span className="entry-label">
                    {new Date(entry.timestamp).toLocaleString()} — {entry.latitude.toFixed(6)},{" "}
                    {entry.longitude.toFixed(6)}
                  </span>
                  {editingId === entry.timestamp ? (
                    <div className="entry-edit-note">
                      <textarea
                        value={editingNote}
                        onChange={(event) => setEditingNote(event.target.value)}
                        placeholder="Edit note..."
                        rows={2}
                      />
                      <div className="note-buttons">
                        <button
                          type="button"
                          onClick={() => saveNoteForEntry(entry.timestamp, editingNote)}
                        >
                          Save
                        </button>
                        <button type="button" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : entry.note ? (
                    <p className="entry-note">{entry.note}</p>
                  ) : null}
                </div>
                <div className="entry-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => startEditingNote(entry)}
                    title="Edit note"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ verticalAlign: "middle" }}
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      navigator
                        .share({
                          text: `My saved location\n\nGoogle Maps link: ${buildMapsLink(
                            entry.latitude,
                            entry.longitude,
                            "google",
                          )}\n\nApple Maps link: ${buildMapsLink(
                            entry.latitude,
                            entry.longitude,
                            "apple",
                          )}`,
                          title: "Saved location",
                        })
                        .catch((err) => {
                          console.error("Error sharing:", err);
                        })
                    }
                    title="Share location"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ verticalAlign: "middle" }}
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                  <a
                    href={buildMapsLink(entry.latitude, entry.longitude, "google")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google
                  </a>
                  <a
                    href={buildMapsLink(entry.latitude, entry.longitude, "apple")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apple
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
