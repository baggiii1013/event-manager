"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Event {
  _id: string;
  name: string;
  date: string;
  capacity: number;
  registeredSeats: number;
  status: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "users">("events");

  // Data states
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Form states for events
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    date: "",
    capacity: 0,
    status: "upcoming",
  });

  // Registrations state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isRegistrationsModalOpen, setIsRegistrationsModalOpen] = useState(false);
  const [selectedEventName, setSelectedEventName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.data.role !== "admin") {
          router.push("/");
          return;
        }
        setUser(data.data);
        fetchEvents();
        fetchUsers(token);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events`);
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const fetchEventRegistrations = async (eventId: string, eventName: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.data);
        setSelectedEventName(eventName);
        setIsRegistrationsModalOpen(true);
      } else {
        alert(data.message || "Failed to fetch registrations");
      }
    } catch (error) {
      console.error("Failed to fetch registrations", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const url = isEditingEvent
      ? `${API_URL}/api/events/${currentEventId}`
      : `${API_URL}/api/events`;
    const method = isEditingEvent ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventForm),
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        setEventForm({ name: "", date: "", capacity: 0, status: "upcoming" });
        setIsEditingEvent(false);
        setCurrentEventId(null);
      } else {
        alert(data.message || "Failed to save event");
      }
    } catch (error) {
      console.error("Failed to save event", error);
    }
  };

  const handleEditEvent = (event: Event) => {
    setIsEditingEvent(true);
    setCurrentEventId(event._id);
    
    let formattedDate = "";
    try {
      if (event.date) {
        formattedDate = new Date(event.date).toISOString().split("T")[0];
      }
    } catch (e) {
      formattedDate = event.date ? event.date.split("T")[0] : "";
    }

    setEventForm({
      name: event.name || "",
      date: formattedDate,
      capacity: event.capacity || 0,
      status: event.status || "upcoming",
    });
    
    // Scroll to top so the user sees the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
      } else {
        alert(data.message || "Failed to delete event");
      }
    } catch (error) {
      console.error("Failed to delete event", error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers(token!);
      } else {
        alert(data.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">
              Welcome, {user?.name} ({user?.email})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("events")}
            className={`pb-2 text-sm font-medium ${
              activeTab === "events"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Manage Events
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-2 text-sm font-medium ${
              activeTab === "users"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Manage Users
          </button>
        </div>

        {activeTab === "events" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  {isEditingEvent ? "Edit Event" : "Create Event"}
                </h2>
                <form onSubmit={handleEventSubmit} className="space-y-4 text-black">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={eventForm.capacity}
                      onChange={(e) => setEventForm({ ...eventForm, capacity: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={eventForm.status}
                      onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      {isEditingEvent ? "Update" : "Create"}
                    </button>
                    {isEditingEvent && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingEvent(false);
                          setCurrentEventId(null);
                          setEventForm({ name: "", date: "", capacity: 0, status: "upcoming" });
                        }}
                        className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Events List</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Capacity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {events.map((event) => (
                        <tr key={event._id}>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{event.name}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                            {new Date(event.date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                            {event.registeredSeats} / {event.capacity}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              event.status === "upcoming" ? "bg-green-100 text-green-800" :
                              event.status === "cancelled" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium">
                            <button
                              onClick={() => fetchEventRegistrations(event._id, event.name)}
                              className="mr-3 text-green-600 hover:text-green-900"
                            >
                              Registrations
                            </button>
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="mr-3 text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Users List</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{u.name}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{u.email}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          disabled={u._id === user?._id}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registrations Modal */}
        {isRegistrationsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Registrations for {selectedEventName}
                </h2>
                <button
                  onClick={() => setIsRegistrationsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {registrations.length === 0 ? (
                <p className="text-gray-500">No registrations yet.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {registrations.map((reg) => (
                        <tr key={reg._id}>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">{reg.user?.name || "Unknown"}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{reg.user?.email || "Unknown"}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                            {new Date(reg.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}