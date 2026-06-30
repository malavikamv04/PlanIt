const BASE = "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("planit_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) || "Something went wrong. Please try again.");
  return data as T;
}

export const api = {
  get:    <T>(path: string)                    => request<T>(path),
  post:   <T>(path: string, body: unknown)     => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)     => request<T>(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(path: string)                    => request<T>(path, { method: "DELETE" }),
};

export type ApiUser = {
  id:       string;
  _id?:     string;
  name:     string;
  email:    string;
  role:     "user" | "host" | "admin";
  phone?:   string;
  avatar?:  string;
  bio?:     string;
  socials?: { twitter?: string; linkedin?: string; website?: string };
  savedEvents?: PopulatedEvent[] | string[];
  createdAt?: string;
};

export type ApiEvent = {
  _id:          string;
  title:        string;
  description:  string;
  category:     string;
  date:         string;
  time:         string;
  location:     string;
  city:         string;
  price:        string;
  priceAmount:  number;
  spots:        number;
  spotsBooked:  number;
  image:        string;
  hostName:     string;
  hostEmail:    string;
  host?:        string;
  status:       "active" | "cancelled" | "completed";
  volunteerPassword?: string;
  assignedVolunteers?: { name: string; email: string }[];
  createdAt?:   string;
};

export type PopulatedUser = { _id: string; name: string; email: string; phone?: string };
export type PopulatedEvent = Pick<ApiEvent, "_id" | "title" | "date" | "time" | "location" | "city" | "price" | "category" | "hostName" | "hostEmail" | "status">;

export type ApiBooking = {
  _id:           string;
  bookingId:     string;
  attendeeName:  string;
  attendeeEmail: string;
  qty:           number;
  status:        "upcoming" | "past" | "cancelled";
  totalAmount:   number;
  createdAt?:    string;
  event?:        PopulatedEvent | null;
  user?:         PopulatedUser  | null;
};

export type ApiNotification = {
  _id:       string;
  recipient: string;
  type:      string;
  title:     string;
  message:   string;
  event?:    PopulatedEvent | null;
  read:      boolean;
  createdAt: string;
};
