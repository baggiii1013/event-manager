"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Event {
  _id: string;
  name: string;
  date: string;
  capacity: number;
  registeredSeats: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    fetchEvents(token);
    fetchMyRegistrations(token);
  }, [router]);

  const fetchEvents = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setEvents(data.data);
      }
    } catch {
      setMessage("Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRegistrations = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/events/my-registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setMyRegistrations(data.data);
      }
    } catch {
      console.error("Failed to load registrations.");
    }
  };

  const handleRegister = async (eventId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setRegisteringId(eventId);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/register`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setMessage("Seat registered successfully!");
        fetchEvents(token);
        fetchMyRegistrations(token);
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setRegisteringId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Events</h1>
            <p className="text-sm text-gray-500">
              Welcome, {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {message && (
          <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">No events available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const isFull = event.registeredSeats >= event.capacity;
              const canRegister =
                event.status === "upcoming" || event.status === "ongoing";
              const isRegistered = myRegistrations.includes(event._id);

              return (
                <div
                  key={event._id}
                  className="flex flex-col rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {event.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[event.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {event.status}
                    </span>
                  </div>

                  <p className="mb-1 text-sm text-gray-500">
                    📅{" "}
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>

                  <p className="mb-4 text-sm text-gray-500">
                    👥 {event.registeredSeats} / {event.capacity} seats filled
                  </p>

                  {/* Progress bar */}
                  <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-blue-500"}`}
                      style={{
                        width: `${Math.min((event.registeredSeats / event.capacity) * 100, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-auto">
                    {isRegistered ? (
                      <p className="text-center text-sm font-medium text-green-600">
                        ✓ You are registered
                      </p>
                    ) : canRegister && !isFull ? (
                      <button
                        onClick={() => handleRegister(event._id)}
                        disabled={registeringId === event._id}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {registeringId === event._id
                          ? "Registering..."
                          : "Register"}
                      </button>
                    ) : isFull ? (
                      <p className="text-center text-sm font-medium text-red-500">
                        Fully Booked
                      </p>
                    ) : (
                      <p className="text-center text-sm font-medium text-gray-400">
                        Registration closed
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
