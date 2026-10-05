2import React, { useState, useMemo, useEffect, useRef, createContext, useContext, useReducer } from "react";
import {
  Hotel, Bed, CalendarDays, Users, Sparkles, Wallet, BarChart3, Settings as SettingsIcon,
  ShieldCheck, LogOut, Menu, X, Search, Plus, Pencil, Trash2, Check, ChevronRight, ChevronLeft,
  MapPin, Phone, Mail, Instagram, Facebook, Twitter, Star, Wifi, Wind, Tv, Wine, Bath, Coffee,
  Car, Sun, ConciergeBell, ClipboardList, Bell, ClipboardCheck, DoorOpen, DoorClosed, AlertTriangle,
  FileText, Download, Filter, Eye, UserCog, Building2, Lock, User, ArrowRight, Loader2
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend,
} from "recharts";

/* =====================================================================================
   DEMO HOTEL — a self-contained demo of a full hotel website + PMS.
   All "database" state lives in one in-memory store (DataContext) shared by every screen,
   so the public site, Reception, and Admin all read/write the same records — exactly like
   they would through a real API + Postgres database in production. See the note at the very
   bottom of this file for how this maps onto a real backend.
===================================================================================== */

/* ---------------------------------- Design tokens ---------------------------------- */
const Tokens = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
    :root{
      --charcoal:#15130f; --charcoal2:#1e1c17; --charcoal3:#28251f;
      --cream:#f6f1e7; --cream2:#ece3d1; --gold:#b6905a; --gold-soft:#d8c19a;
      --gray:#8f897c; --line: rgba(246,241,231,0.12);
    }
    .dh-root{ font-family:'Inter',sans-serif; }
    .dh-serif{ font-family:'Fraunces',serif; }
    .dh-scroll::-webkit-scrollbar{ width:6px; height:6px; }
    .dh-scroll::-webkit-scrollbar-thumb{ background:var(--gold-soft); border-radius:4px; }
    .dh-fade{ animation: dhfade .5s ease both; }
    @keyframes dhfade{ from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)} }
  `}</style>
);

/* ---------------------------------- Utilities ---------------------------------- */
const uid = (p = "") => p + Math.random().toString(36).slice(2, 9);

/* ---- Currency: all amounts are stored internally in USD. `fmtMoney` formats them using
   the hotel's base currency (set by Admin in Settings) — used everywhere in Admin/Reception.
   `fmtPublicMoney` formats them using whatever display currency the website visitor picked
   in the header — a cosmetic conversion for guests, independent of the hotel's bookkeeping
   currency. Both read from small module-level variables kept in sync by tiny effects below,
   so no prop-drilling is needed through the whole component tree. ---- */
const CURRENCIES = {
  USD: { symbol: "$", rate: 1, suffix: false },
  EUR: { symbol: "€", rate: 0.92, suffix: false },
  GBP: { symbol: "£", rate: 0.79, suffix: false },
  UZS: { symbol: "so'm", rate: 12700, suffix: true },
};
function formatCurrency(amountUSD, code) {
  const c = CURRENCIES[code] || CURRENCIES.USD;
  const val = Math.round(Number(amountUSD || 0) * c.rate);
  const num = val.toLocaleString();
  return c.suffix ? `${num} ${c.symbol}` : `${c.symbol}${num}`;
}
let _adminCurrency = "USD";
let _publicCurrency = "USD";
const fmtMoney = (n) => formatCurrency(n, _adminCurrency);
const fmtPublicMoney = (n) => formatCurrency(n, _publicCurrency);

/* ---- Language: a small i18n dictionary covering the guest-facing public website.
   Admin/Reception stay in English, as is standard for PMS software, but the site a guest
   sees can be switched live from the header. ---- */
const LANGUAGES = { en: "English", uz: "O'zbekcha", ru: "Русский" };
const STRINGS = {
  en: {
    nav_home: "Home", nav_rooms: "Rooms", nav_services: "Services", nav_about: "About", nav_gallery: "Gallery", nav_contact: "Contact",
    book_now: "Book Now", welcome_to: "WELCOME TO", tagline: "Luxury. Comfort. Hospitality.",
    book_your_stay: "Book Your Stay", explore_rooms: "Explore Rooms", check_in: "Check-in", check_out: "Check-out",
    guests: "Guests", room_type: "Room type", any_type: "Any type", search_availability: "Search availability",
    featured_rooms: "Featured Rooms", view_all_rooms: "View all rooms", per_night: "per night",
    quick_links: "Quick links", follow: "Follow", staff_login: "Staff Login", all_rights: "All rights reserved.",
  },
  uz: {
    nav_home: "Bosh sahifa", nav_rooms: "Xonalar", nav_services: "Xizmatlar", nav_about: "Biz haqimizda", nav_gallery: "Galereya", nav_contact: "Aloqa",
    book_now: "Band qilish", welcome_to: "XUSH KELIBSIZ", tagline: "Hashamat. Qulaylik. Mehmondo'stlik.",
    book_your_stay: "Qolish uchun band qiling", explore_rooms: "Xonalarni ko'ring", check_in: "Kelish sanasi", check_out: "Ketish sanasi",
    guests: "Mehmonlar", room_type: "Xona turi", any_type: "Har qanday tur", search_availability: "Bo'sh xonalarni qidirish",
    featured_rooms: "Tavsiya etilgan xonalar", view_all_rooms: "Barcha xonalarni ko'rish", per_night: "kecha uchun",
    quick_links: "Tezkor havolalar", follow: "Ijtimoiy tarmoqlar", staff_login: "Xodimlar uchun kirish", all_rights: "Barcha huquqlar himoyalangan.",
  },
  ru: {
    nav_home: "Главная", nav_rooms: "Номера", nav_services: "Услуги", nav_about: "О нас", nav_gallery: "Галерея", nav_contact: "Контакты",
    book_now: "Забронировать", welcome_to: "ДОБРО ПОЖАЛОВАТЬ В", tagline: "Роскошь. Комфорт. Гостеприимство.",
    book_your_stay: "Забронировать номер", explore_rooms: "Смотреть номера", check_in: "Заезд", check_out: "Выезд",
    guests: "Гости", room_type: "Тип номера", any_type: "Любой тип", search_availability: "Проверить наличие",
    featured_rooms: "Популярные номера", view_all_rooms: "Все номера", per_night: "за ночь",
    quick_links: "Быстрые ссылки", follow: "Мы в соцсетях", staff_login: "Вход для персонала", all_rights: "Все права защищены.",
  },
};
const LangCtx = createContext(null);
const useLang = () => useContext(LangCtx);
function LangProvider({ children, availableLangs }) {
  const [lang, setLang] = useState(availableLangs?.[0] || "en");
  useEffect(() => { if (availableLangs && !availableLangs.includes(lang)) setLang(availableLangs[0] || "en"); }, [availableLangs]);
  const t = (key) => STRINGS[lang]?.[key] || STRINGS.en[key] || key;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}
const PublicCurrencyCtx = createContext(null);
const usePublicCurrency = () => useContext(PublicCurrencyCtx);
function PublicCurrencyProvider({ children, availableCurrencies }) {
  const [currency, setCurrency] = useState(availableCurrencies?.[0] || "USD");
  useEffect(() => { _publicCurrency = currency; }, [currency]);
  useEffect(() => { if (availableCurrencies && !availableCurrencies.includes(currency)) setCurrency(availableCurrencies[0] || "USD"); }, [availableCurrencies]);
  return <PublicCurrencyCtx.Provider value={{ currency, setCurrency }}>{children}</PublicCurrencyCtx.Provider>;
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, d) => { const dt = new Date(iso); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); };
const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE", "OUT OF SERVICE"];
const BOOKING_STATUSES = ["Pending", "Confirmed", "Checked-in", "Checked-out", "Cancelled", "No-show"];
const PAYMENT_STATUSES = ["Paid", "Pending", "Partially paid", "Refunded"];

const ROOM_TYPES = [
  { id: "classic", name: "Classic Double", price: 120, size: "28 m²", beds: "1 Queen Bed", maxGuests: 2,
    desc: "A warm, uncluttered room with everything you need for a comfortable stay in the heart of the city.",
    amenities: ["wifi", "ac", "tv", "bath"],
    img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop" },
  { id: "deluxe", name: "Deluxe King", price: 180, size: "34 m²", beds: "1 King Bed", maxGuests: 2,
    desc: "Generous proportions, a plush king bed, and a quiet reading corner overlooking the courtyard.",
    amenities: ["wifi", "ac", "tv", "minibar", "bath", "room_service"],
    img: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop" },
  { id: "family", name: "Family Room", price: 220, size: "42 m²", beds: "1 King + 2 Twin", maxGuests: 4,
    desc: "A connected layout built for families, with space to unwind together after a day of exploring.",
    amenities: ["wifi", "ac", "tv", "minibar", "bath", "breakfast"],
    img: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=1200&auto=format&fit=crop" },
  { id: "premium", name: "Premium Suite", price: 260, size: "48 m²", beds: "1 King Bed", maxGuests: 3,
    desc: "A separate lounge, deep soaking tub, and skyline views for those who want a little more room to breathe.",
    amenities: ["wifi", "ac", "tv", "minibar", "bath", "balcony", "room_service", "breakfast"],
    img: "https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=1200&auto=format&fit=crop" },
  { id: "executive", name: "Executive Suite", price: 340, size: "60 m²", beds: "1 King Bed", maxGuests: 3,
    desc: "The top of the house: a private balcony, dining nook, and personal check-in for guests who expect more.",
    amenities: ["wifi", "ac", "tv", "minibar", "bath", "balcony", "room_service", "breakfast"],
    img: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop" },
];

const AMENITY_ICON = { wifi: Wifi, ac: Wind, tv: Tv, minibar: Wine, bath: Bath, breakfast: Coffee, room_service: ConciergeBell, balcony: Sun };
const AMENITY_LABEL = { wifi: "Wi-Fi", ac: "Air conditioning", tv: "TV", minibar: "Mini bar", bath: "Bathroom", breakfast: "Breakfast", room_service: "Room service", balcony: "Balcony" };

/* ---------------------------------- Seed data ---------------------------------- */
function seedRooms() {
  const rooms = [];
  const plan = [
    { floor: 2, count: 14, typeIdx: 0, startNo: 201 },
    { floor: 3, count: 14, typeIdx: 1, startNo: 301 },
    { floor: 4, count: 8, typeIdx: 2, startNo: 401 },
    { floor: 5, count: 8, typeIdx: 3, startNo: 501 },
    { floor: 6, count: 4, typeIdx: 4, startNo: 601 },
  ];
  let i = 0;
  plan.forEach(({ count, typeIdx, startNo }) => {
    for (let j = 0; j < count; j++) {
      const t = ROOM_TYPES[typeIdx];
      const statusRoll = i % 11;
      let status = "AVAILABLE";
      if (statusRoll === 1 || statusRoll === 4 || statusRoll === 7) status = "OCCUPIED";
      else if (statusRoll === 2) status = "CLEANING";
      else if (statusRoll === 9) status = "MAINTENANCE";
      else if (statusRoll === 5) status = "RESERVED";
      rooms.push({
        id: uid("room_"), number: String(startNo + j), typeId: t.id, typeName: t.name,
        price: t.price, size: t.size, beds: t.beds, maxGuests: t.maxGuests, amenities: t.amenities,
        img: t.img, desc: t.desc, status,
      });
      i++;
    }
  });
  return rooms;
}

const FIRST = ["Olivia", "Daniel", "Sofia", "Marcus", "Elena", "James", "Amara", "Noah", "Isabel", "Leo", "Yuki", "Hassan"];
const LAST = ["Bennett", "Moreau", "García", "Whitfield", "Novak", "Lindqvist", "Osei", "Fontaine", "Rossi", "Baptiste", "Sato", "Karim"];
function seedGuests(n = 12) {
  return Array.from({ length: n }).map((_, i) => ({
    id: uid("guest_"),
    name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
    phone: `+1 555-01${(10 + i).toString().padStart(2, "0")}`,
    email: `${FIRST[i % FIRST.length].toLowerCase()}.${LAST[(i * 3) % LAST.length].toLowerCase()}@mail.com`,
    idNumber: `P${100000 + i * 37}`,
    nationality: ["USA", "France", "Spain", "Japan", "Kenya", "Sweden"][i % 6],
    dob: `19${70 + (i % 25)}-0${(i % 9) + 1}-1${i % 9}`,
  }));
}

function seedEmployees() {
  return [
    { id: uid("emp_"), name: "Grace Hamilton", username: "admin", password: "1234", role: "ADMIN", email: "admin@demohotel.com", phone: "+1 555-0100", status: "Active", created: "2024-01-10" },
    { id: uid("emp_"), name: "Marco Ibarra", username: "reception", password: "1234", role: "RECEPTION", email: "reception@demohotel.com", phone: "+1 555-0101", status: "Active", created: "2024-02-14" },
    { id: uid("emp_"), name: "Priya Nair", username: "housekeeping1", password: "1234", role: "HOUSEKEEPING", email: "priya@demohotel.com", phone: "+1 555-0102", status: "Active", created: "2024-03-02" },
    { id: uid("emp_"), name: "Tom Delacroix", username: "manager1", password: "1234", role: "MANAGER", email: "tom@demohotel.com", phone: "+1 555-0103", status: "Active", created: "2024-03-20" },
    { id: uid("emp_"), name: "Lena Voss", username: "housekeeping2", password: "1234", role: "HOUSEKEEPING", email: "lena@demohotel.com", phone: "+1 555-0104", status: "Active", created: "2024-05-11" },
  ];
}

function seedBookings(rooms, guests) {
  const bookings = [];
  const occupied = rooms.filter(r => r.status === "OCCUPIED");
  const reserved = rooms.filter(r => r.status === "RESERVED");
  let gi = 0;
  const mk = (room, status, ciOffset, nights, paymentStatus) => {
    const checkIn = addDays(todayISO(), ciOffset);
    const checkOut = addDays(checkIn, nights);
    const guest = guests[gi % guests.length]; gi++;
    const amount = room.price * nights;
    bookings.push({
      id: "DH" + (1000 + bookings.length),
      guestId: guest.id, guestName: guest.name, phone: guest.phone, email: guest.email,
      roomId: room.id, roomNumber: room.number, roomType: room.typeName,
      checkIn, checkOut, nights, guests: 2, request: "",
      amount, status, paymentStatus, created: addDays(todayISO(), ciOffset - 3),
    });
  };
  occupied.forEach((r, idx) => mk(r, idx % 5 === 0 ? "Checked-in" : "Checked-in", -1, 3, "Paid"));
  reserved.forEach((r) => mk(r, "Confirmed", 1, 2, "Pending"));
  // a few extra pending / cancelled / checked-out / no-show for variety
  const extras = rooms.filter(r => r.status === "AVAILABLE").slice(0, 6);
  const statuses = ["Pending", "Cancelled", "Checked-out", "No-show", "Confirmed", "Pending"];
  extras.forEach((r, idx) => mk(r, statuses[idx], idx === 2 || idx === 3 ? -6 : 4, 2, idx % 2 ? "Pending" : "Paid"));
  return bookings;
}

function seedHousekeeping(rooms, employees) {
  const staff = employees.filter(e => e.role === "HOUSEKEEPING");
  const targets = rooms.filter(r => r.status === "CLEANING" || r.status === "MAINTENANCE");
  const types = ["Full cleaning", "Bathroom cleaning", "Towel replacement", "Bed linen replacement", "Mini bar refill", "Inspection"];
  return targets.map((r, i) => ({
    id: uid("hk_"), roomId: r.id, roomNumber: r.number,
    taskType: r.status === "MAINTENANCE" ? "Inspection" : types[i % types.length],
    assignedTo: staff[i % staff.length]?.name || "Unassigned",
    status: i % 3 === 0 ? "Completed" : i % 3 === 1 ? "In progress" : "Pending",
    created: new Date().toISOString(), started: i % 3 !== 2 ? new Date().toISOString() : null,
    completed: i % 3 === 0 ? new Date().toISOString() : null,
  }));
}

function seedServices() {
  return [
    { id: uid("svc_"), name: "Room Service", price: 15, icon: "room_service" },
    { id: uid("svc_"), name: "Breakfast", price: 12, icon: "breakfast" },
    { id: uid("svc_"), name: "Taxi", price: 25, icon: "car" },
    { id: uid("svc_"), name: "Airport Transfer", price: 45, icon: "car" },
    { id: uid("svc_"), name: "Laundry", price: 10, icon: "wash" },
    { id: uid("svc_"), name: "Extra Bed", price: 20, icon: "bed" },
    { id: uid("svc_"), name: "Wake-up Call", price: 0, icon: "bell" },
    { id: uid("svc_"), name: "Restaurant Reservation", price: 0, icon: "restaurant" },
  ];
}

function seedRequests(bookings, services) {
  return bookings.slice(0, 6).map((b, i) => {
    const svc = services[i % services.length];
    return {
      id: uid("req_"), guestName: b.guestName, roomNumber: b.roomNumber, service: svc.name,
      qty: 1 + (i % 2), price: svc.price, status: ["New", "Accepted", "In progress", "Completed"][i % 4],
      created: new Date().toISOString(),
    };
  });
}

function seedAll() {
  const rooms = seedRooms();
  const guests = seedGuests();
  const employees = seedEmployees();
  const bookings = seedBookings(rooms, guests);
  const housekeeping = seedHousekeeping(rooms, employees);
  const services = seedServices();
  const requests = seedRequests(bookings, services);
  const settings = {
    name: "DEMO HOTEL", phone: "+1 (555) 010-9200", email: "stay@demohotel.com",
    address: "128 Harbor View Avenue, Bay City", checkIn: "15:00", checkOut: "11:00", currency: "USD",
    enabledLanguages: ["en", "uz", "ru"],
    enabledCurrencies: ["USD", "EUR", "UZS"],
    heroImages: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1920&auto=format&fit=crop",
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=800&auto=format&fit=crop",
    ],
  };
  const auditLog = [
    { id: uid("log_"), user: "admin", action: "Created room 601 Executive Suite", time: "2024-06-01 09:12" },
    { id: uid("log_"), user: "reception", action: "Checked in guest to room 204", time: todayISO() + " 08:40" },
    { id: uid("log_"), user: "admin", action: "Updated price for Deluxe King", time: "2024-08-14 17:02" },
  ];
  return { rooms, guests, employees, bookings, housekeeping, services, requests, settings, auditLog, notifications: [] };
}

/* ---------------------------------- Permissions ---------------------------------- */
// NOTE: this is a client-side demo. In a real deployment every one of these checks must
// ALSO be enforced on the server for each API route — never trust the frontend alone.
const PERMISSIONS = {
  ADMIN: ["dashboard", "rooms", "bookings", "guests", "housekeeping", "services", "employees", "reports", "settings", "audit"],
  MANAGER: ["dashboard", "rooms", "bookings", "guests", "reports"],
  RECEPTION: ["dashboard", "bookings", "guests", "rooms:view", "housekeeping:create", "services"],
  HOUSEKEEPING: ["housekeeping:own"],
};
const can = (role, key) => (PERMISSIONS[role] || []).includes(key);

/* ---------------------------------- Data context ---------------------------------- */
const DataCtx = createContext(null);
const useData = () => useContext(DataCtx);

function dataReducer(state, action) {
  switch (action.type) {
    case "ADD_AUDIT":
      return { ...state, auditLog: [{ id: uid("log_"), time: new Date().toLocaleString(), ...action.entry }, ...state.auditLog].slice(0, 200) };
    case "ADD_NOTIF":
      return { ...state, notifications: [{ id: uid("ntf_"), time: new Date().toLocaleTimeString(), read: false, ...action.notif }, ...state.notifications].slice(0, 50) };
    case "MARK_NOTIFS_READ":
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case "SET_ROOMS": return { ...state, rooms: action.rooms };
    case "UPSERT_ROOM": {
      const exists = state.rooms.some(r => r.id === action.room.id);
      return { ...state, rooms: exists ? state.rooms.map(r => r.id === action.room.id ? action.room : r) : [action.room, ...state.rooms] };
    }
    case "DELETE_ROOM": return { ...state, rooms: state.rooms.filter(r => r.id !== action.id) };
    case "SET_ROOM_STATUS": return { ...state, rooms: state.rooms.map(r => r.id === action.id ? { ...r, status: action.status } : r) };
    case "ADD_BOOKING": return { ...state, bookings: [action.booking, ...state.bookings] };
    case "UPDATE_BOOKING": return { ...state, bookings: state.bookings.map(b => b.id === action.id ? { ...b, ...action.patch } : b) };
    case "DELETE_BOOKING": return { ...state, bookings: state.bookings.filter(b => b.id !== action.id) };
    case "UPSERT_GUEST": {
      const exists = state.guests.some(g => g.id === action.guest.id);
      return { ...state, guests: exists ? state.guests.map(g => g.id === action.guest.id ? action.guest : g) : [action.guest, ...state.guests] };
    }
    case "UPSERT_EMPLOYEE": {
      const exists = state.employees.some(e => e.id === action.emp.id);
      return { ...state, employees: exists ? state.employees.map(e => e.id === action.emp.id ? action.emp : e) : [action.emp, ...state.employees] };
    }
    case "DELETE_EMPLOYEE": return { ...state, employees: state.employees.filter(e => e.id !== action.id) };
    case "ADD_HK": return { ...state, housekeeping: [action.task, ...state.housekeeping] };
    case "UPDATE_HK": return { ...state, housekeeping: state.housekeeping.map(h => h.id === action.id ? { ...h, ...action.patch } : h) };
    case "ADD_REQUEST": return { ...state, requests: [action.req, ...state.requests] };
    case "UPDATE_REQUEST": return { ...state, requests: state.requests.map(r => r.id === action.id ? { ...r, ...action.patch } : r) };
    case "UPDATE_SETTINGS": return { ...state, settings: { ...state.settings, ...action.patch } };
    default: return state;
  }
}

function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, null, seedAll);
  return <DataCtx.Provider value={{ state, dispatch }}>{children}</DataCtx.Provider>;
}

/* ---------------------------------- Small UI primitives ---------------------------------- */
function Badge({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "rgba(143,137,124,0.18)", fg: "var(--cream)" },
    good: { bg: "rgba(93,138,86,0.22)", fg: "#9fd39a" },
    warn: { bg: "rgba(182,144,90,0.22)", fg: "var(--gold-soft)" },
    bad: { bg: "rgba(178,72,72,0.2)", fg: "#e79a9a" },
    info: { bg: "rgba(90,130,182,0.2)", fg: "#a9c6ec" },
  };
  const c = map[tone] || map.neutral;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium tracking-wide" style={{ background: c.bg, color: c.fg }}>{children}</span>;
}
const statusTone = (s) => ({
  AVAILABLE: "good", OCCUPIED: "bad", RESERVED: "info", CLEANING: "warn", MAINTENANCE: "warn", "OUT OF SERVICE": "bad",
  Pending: "warn", Confirmed: "info", "Checked-in": "good", "Checked-out": "neutral", Cancelled: "bad", "No-show": "bad",
  Paid: "good", "Partially paid": "warn", Refunded: "neutral",
  New: "info", Accepted: "warn", "In progress": "warn", Completed: "good",
}[s] || "neutral");

function Btn({ children, onClick, variant = "primary", size = "md", className = "", type = "button", disabled }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-40";
  const sizes = { sm: "px-3.5 py-1.5 text-sm", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const styles = {
    primary: { background: "var(--gold)", color: "#15130f" },
    dark: { background: "var(--charcoal)", color: "var(--cream)", border: "1px solid var(--line)" },
    ghost: { background: "transparent", color: "var(--cream)", border: "1px solid var(--line)" },
    danger: { background: "rgba(178,72,72,0.15)", color: "#e79a9a", border: "1px solid rgba(178,72,72,0.3)" },
    subtle: { background: "rgba(246,241,231,0.06)", color: "var(--cream)" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${className} hover:brightness-110 active:scale-[0.98]`} style={styles[variant]}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return <label className="block">
    <span className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>{label}</span>
    {children}
  </label>;
}
const inputStyle = { background: "rgba(246,241,231,0.05)", border: "1px solid var(--line)", color: "var(--cream)" };
function Input(props) { return <input {...props} className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[var(--gold)] ${props.className || ""}`} style={inputStyle} />; }
function Select(props) { return <select {...props} className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[var(--gold)] ${props.className || ""}`} style={inputStyle}>{props.children}</select>; }
function TextArea(props) { return <textarea {...props} className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle} />; }

function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className={`w-full ${width} rounded-2xl p-6 dh-fade dh-scroll overflow-y-auto max-h-[88vh]`} style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="dh-serif text-xl" style={{ color: "var(--cream)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5"><X size={18} color="var(--gray)" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = ClipboardList, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="p-4 rounded-full" style={{ background: "rgba(246,241,231,0.05)" }}><Icon size={26} color="var(--gray)" /></div>
      <p style={{ color: "var(--gray)" }}>{text}</p>
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <div key={t.id} className="dh-fade px-4 py-3 rounded-xl text-sm shadow-lg flex items-center gap-2" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)", color: "var(--cream)" }}>
          <Check size={15} color="var(--gold)" /> {t.msg}
        </div>
      ))}
    </div>
  );
}
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (msg) => { const id = uid(); setToasts(t => [...t, { id, msg }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600); };
  return { toasts, push };
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
      <div className="p-3 rounded-xl" style={{ background: "rgba(182,144,90,0.14)" }}><Icon size={20} color="var(--gold)" /></div>
      <div>
        <div className="text-2xl dh-serif" style={{ color: "var(--cream)" }}>{value}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--gray)" }}>{label}</div>
      </div>
    </div>
  );
}

/* =====================================================================================
   AUTH
===================================================================================== */
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  return <AuthCtx.Provider value={{ user, setUser }}>{children}</AuthCtx.Provider>;
}

/* =====================================================================================
   PUBLIC WEBSITE
===================================================================================== */
function LangCurrencySwitcher({ compact }) {
  const { state } = useData();
  const { lang, setLang, t } = useLang();
  const { currency, setCurrency } = usePublicCurrency();
  const langs = state.settings.enabledLanguages?.length ? state.settings.enabledLanguages : Object.keys(LANGUAGES);
  const currencies = state.settings.enabledCurrencies?.length ? state.settings.enabledCurrencies : Object.keys(CURRENCIES);
  const selStyle = { background: "rgba(246,241,231,0.06)", border: "1px solid var(--line)", color: "var(--cream)" };
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : ""}`}>
      <select value={lang} onChange={e => setLang(e.target.value)} className="rounded-full px-2.5 py-1.5 text-xs outline-none" style={selStyle}>
        {langs.map(l => <option key={l} value={l}>{LANGUAGES[l]}</option>)}
      </select>
      <select value={currency} onChange={e => setCurrency(e.target.value)} className="rounded-full px-2.5 py-1.5 text-xs outline-none" style={selStyle}>
        {currencies.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

function PublicHeader({ nav, go }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const links = [["nav_home", "home"], ["nav_rooms", "rooms"], ["nav_services", "services"], ["nav_about", "about"], ["nav_gallery", "gallery"], ["nav_contact", "contact"]];
  return (
    <header className="sticky top-0 z-40 backdrop-blur" style={{ background: "rgba(21,19,15,0.85)", borderBottom: "1px solid var(--line)" }}>
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between gap-4">
        <button onClick={() => go("home")} className="flex items-center gap-2 shrink-0">
          <Hotel size={22} color="var(--gold)" />
          <span className="dh-serif text-lg tracking-wide" style={{ color: "var(--cream)" }}>DEMO HOTEL</span>
        </button>
        <nav className="hidden lg:flex items-center gap-8">
          {links.map(([key, page]) => (
            <button key={page} onClick={() => go(page)} className="text-sm tracking-wide transition-colors whitespace-nowrap" style={{ color: nav === page ? "var(--gold)" : "var(--cream)" }}>{t(key)}</button>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <LangCurrencySwitcher />
          <Btn onClick={() => go("booking")}>{t("book_now")}</Btn>
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen(o => !o)}>{open ? <X color="var(--cream)" /> : <Menu color="var(--cream)" />}</button>
      </div>
      {open && (
        <div className="lg:hidden px-5 pb-5 flex flex-col gap-4 dh-fade">
          {links.map(([key, page]) => <button key={page} onClick={() => { go(page); setOpen(false); }} className="text-left text-sm" style={{ color: "var(--cream)" }}>{t(key)}</button>)}
          <LangCurrencySwitcher />
          <Btn onClick={() => { go("booking"); setOpen(false); }}>{t("book_now")}</Btn>
        </div>
      )}
    </header>
  );
}

function PublicFooter({ go }) {
  const { state } = useData();
  const { t } = useLang();
  return (
    <footer style={{ background: "var(--charcoal2)", borderTop: "1px solid var(--line)" }}>
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3"><Hotel size={20} color="var(--gold)" /><span className="dh-serif text-lg" style={{ color: "var(--cream)" }}>{state.settings.name}</span></div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--gray)" }}>{state.settings.address}</p>
          <p className="text-sm mt-2" style={{ color: "var(--gray)" }}>{state.settings.phone} · {state.settings.email}</p>
        </div>
        <div>
          <div className="text-sm mb-3" style={{ color: "var(--cream)" }}>{t("quick_links")}</div>
          {[["nav_rooms", "rooms"], ["nav_services", "services"], ["nav_about", "about"], ["nav_contact", "contact"]].map(([label, k]) => (
            <button key={k} onClick={() => go(k)} className="block text-sm mb-2" style={{ color: "var(--gray)" }}>{t(label)}</button>
          ))}
        </div>
        <div>
          <div className="text-sm mb-3" style={{ color: "var(--cream)" }}>{t("follow")}</div>
          <div className="flex gap-3 mb-4">
            {[Instagram, Facebook, Twitter].map((I, i) => <div key={i} className="p-2 rounded-full" style={{ background: "rgba(246,241,231,0.06)" }}><I size={16} color="var(--gold-soft)" /></div>)}
          </div>
          <LangCurrencySwitcher />
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 text-xs py-5" style={{ color: "var(--gray)", borderTop: "1px solid var(--line)" }}>
        <span>© 2026 {state.settings.name}. {t("all_rights")}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <button onClick={() => go("login")} className="opacity-60 hover:opacity-100 transition-opacity">{t("staff_login")}</button>
      </div>
    </footer>
  );
}

function QuickBookingBar({ onSearch, compact }) {
  const { t } = useLang();
  const [ci, setCi] = useState(todayISO());
  const [co, setCo] = useState(addDays(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const [type, setType] = useState("any");
  return (
    <div className={`rounded-2xl p-4 md:p-5 grid md:grid-cols-5 gap-3 items-end ${compact ? "" : "shadow-2xl"}`} style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
      <Field label={t("check_in")}><Input type="date" value={ci} min={todayISO()} onChange={e => setCi(e.target.value)} /></Field>
      <Field label={t("check_out")}><Input type="date" value={co} min={addDays(ci, 1)} onChange={e => setCo(e.target.value)} /></Field>
      <Field label={t("guests")}><Input type="number" min={1} max={8} value={guests} onChange={e => setGuests(+e.target.value)} /></Field>
      <Field label={t("room_type")}>
        <Select value={type} onChange={e => setType(e.target.value)}>
          <option value="any">{t("any_type")}</option>
          {ROOM_TYPES.map(t2 => <option key={t2.id} value={t2.id}>{t2.name}</option>)}
        </Select>
      </Field>
      <Btn onClick={() => onSearch({ ci, co, guests, type })} className="w-full"><Search size={16} /> {t("search_availability")}</Btn>
    </div>
  );
}

function RoomCard({ room, onView }) {
  const { t } = useLang();
  return (
    <div className="rounded-2xl overflow-hidden group cursor-pointer dh-fade" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }} onClick={() => onView(room)}>
      <div className="h-56 overflow-hidden"><img src={room.img} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /></div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <h3 className="dh-serif text-lg" style={{ color: "var(--cream)" }}>{room.name}</h3>
          <div className="text-right"><div className="dh-serif text-lg" style={{ color: "var(--gold)" }}>{fmtPublicMoney(room.price)}</div><div className="text-xs" style={{ color: "var(--gray)" }}>{t("per_night")}</div></div>
        </div>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--gray)" }}>{room.size} · {room.beds} · up to {room.maxGuests} guests</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {room.amenities.slice(0, 4).map(a => { const I = AMENITY_ICON[a]; return <div key={a} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.06)" }} title={AMENITY_LABEL[a]}><I size={13} color="var(--gold-soft)" /></div>; })}
        </div>
      </div>
    </div>
  );
}

function HeroSlideshow({ images }) {
  const [i, setI] = useState(0);
  const list = images && images.length ? images : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1920&auto=format&fit=crop"];
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setI(x => (x + 1) % list.length), 5000);
    return () => clearInterval(id);
  }, [list.length]);
  return (
    <>
      {list.map((src, idx) => (
        <img key={src + idx} src={src} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: idx === i ? 1 : 0 }} alt="" />
      ))}
      {list.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-2 z-10">
          {list.map((_, idx) => <button key={idx} onClick={() => setI(idx)} className="w-2 h-2 rounded-full" style={{ background: idx === i ? "var(--gold)" : "rgba(246,241,231,0.35)" }} />)}
        </div>
      )}
    </>
  );
}

function HomePage({ go, viewRoom }) {
  const { state } = useData();
  const { t } = useLang();
  const featured = ROOM_TYPES.slice(0, 3);
  return (
    <div>
      <section className="relative h-[92vh] min-h-[560px] flex items-end">
        <HeroSlideshow images={state.settings.heroImages} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,19,15,0.35), rgba(21,19,15,0.95))" }} />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pb-16 w-full">
          <p className="text-sm tracking-[0.3em] mb-4" style={{ color: "var(--gold-soft)" }}>{t("welcome_to")}</p>
          <h1 className="dh-serif text-6xl md:text-8xl mb-5" style={{ color: "var(--cream)" }}>{state.settings.name}</h1>
          <p className="text-lg md:text-xl mb-9 max-w-xl" style={{ color: "var(--cream2)" }}>{t("tagline")}</p>
          <div className="flex gap-4 mb-12 flex-wrap">
            <Btn size="lg" onClick={() => go("booking")}>{t("book_your_stay")} <ArrowRight size={16} /></Btn>
            <Btn size="lg" variant="ghost" onClick={() => go("rooms")}>{t("explore_rooms")}</Btn>
          </div>
          <QuickBookingBar onSearch={() => go("rooms")} />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div><p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>ACCOMMODATIONS</p><h2 className="dh-serif text-4xl" style={{ color: "var(--cream)" }}>{t("featured_rooms")}</h2></div>
          <button onClick={() => go("rooms")} className="text-sm flex items-center gap-1" style={{ color: "var(--gold)" }}>{t("view_all_rooms")} <ChevronRight size={15} /></button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {featured.map(t => <RoomCard key={t.id} room={{ ...t }} onView={() => viewRoom(t)} />)}
        </div>
      </section>

      <section className="py-24" style={{ background: "var(--charcoal2)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-14 items-center">
          <img src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1200&auto=format&fit=crop" className="rounded-2xl w-full h-[420px] object-cover" alt="" />
          <div>
            <p className="text-sm tracking-[0.25em] mb-3" style={{ color: "var(--gold-soft)" }}>THE EXPERIENCE</p>
            <h2 className="dh-serif text-4xl mb-5" style={{ color: "var(--cream)" }}>A quiet kind of luxury</h2>
            <p className="leading-relaxed mb-6" style={{ color: "var(--gray)" }}>Every detail at Demo Hotel is considered — from the weight of the linens to the hush of the hallways. We built a place where the city slows down the moment you walk through the door.</p>
            <div className="grid grid-cols-2 gap-5">
              {[["48", "Rooms & suites"], ["12", "Years hosting guests"], ["24/7", "Concierge service"], ["4.8", "Average guest rating"]].map(([n, l]) => (
                <div key={l}><div className="dh-serif text-3xl" style={{ color: "var(--gold)" }}>{n}</div><div className="text-sm" style={{ color: "var(--gray)" }}>{l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>SERVICES</p>
        <h2 className="dh-serif text-4xl mb-10" style={{ color: "var(--cream)" }}>Everything, arranged</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {state.services.slice(0, 8).map(s => (
            <div key={s.id} className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <ConciergeBell size={20} color="var(--gold)" className="mb-4" />
              <div style={{ color: "var(--cream)" }} className="mb-1">{s.name}</div>
              <div className="text-sm" style={{ color: "var(--gray)" }}>{s.price ? fmtMoney(s.price) : "Complimentary"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-24">
        <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>GALLERY</p>
        <h2 className="dh-serif text-4xl mb-10" style={{ color: "var(--cream)" }}>A glimpse inside</h2>
        <GalleryGrid />
      </section>

      <section className="py-24" style={{ background: "var(--charcoal2)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-sm tracking-[0.25em] mb-3" style={{ color: "var(--gold-soft)" }}>LOCATION</p>
            <h2 className="dh-serif text-4xl mb-5" style={{ color: "var(--cream)" }}>Right where you want to be</h2>
            <p className="leading-relaxed mb-4" style={{ color: "var(--gray)" }}>{state.settings.address}</p>
            <p className="flex items-center gap-2 text-sm mb-2" style={{ color: "var(--gray)" }}><Phone size={14} /> {state.settings.phone}</p>
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--gray)" }}><Mail size={14} /> {state.settings.email}</p>
          </div>
          <div className="rounded-2xl h-80 flex items-center justify-center" style={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }}>
            <MapPin size={30} color="var(--gold)" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>GUEST REVIEWS</p>
        <h2 className="dh-serif text-4xl mb-10" style={{ color: "var(--cream)" }}>What guests are saying</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Isabelle R.", "The Deluxe King room was quiet, spacious, and the staff remembered our anniversary without being asked."],
            ["Marcus T.", "Best stay I've had this year. Check-in took two minutes and the room was exactly as pictured."],
            ["Amara K.", "The rooftop view from the Executive Suite alone is worth the price. Breakfast service was flawless."],
          ].map(([name, quote]) => (
            <div key={name} className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div className="flex gap-1 mb-3">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="var(--gold)" color="var(--gold)" />)}</div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--gray)" }}>"{quote}"</p>
              <p className="text-sm" style={{ color: "var(--cream)" }}>{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-24">
        <div className="rounded-3xl p-14 text-center" style={{ background: "linear-gradient(135deg, var(--charcoal3), var(--charcoal2))", border: "1px solid var(--line)" }}>
          <h2 className="dh-serif text-4xl mb-4" style={{ color: "var(--cream)" }}>Ready for your stay?</h2>
          <p className="mb-8" style={{ color: "var(--gray)" }}>Check availability and reserve your room in under two minutes.</p>
          <Btn size="lg" onClick={() => go("booking")}>Book Your Stay <ArrowRight size={16} /></Btn>
        </div>
      </section>
    </div>
  );
}

function GalleryGrid() {
  const { state } = useData();
  const imgs = state.settings.galleryImages?.length ? state.settings.galleryImages : [
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop",
  ];
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{imgs.map((s, i) => <img key={i} src={s} className="rounded-xl h-52 w-full object-cover" alt="" />)}</div>;
}

function RoomsPage({ go, viewRoom }) {
  const { state } = useData();
  const [filter, setFilter] = useState("all");
  const availByType = useMemo(() => {
    const map = {};
    state.rooms.forEach(r => { map[r.typeId] = (map[r.typeId] || 0) + (r.status === "AVAILABLE" ? 1 : 0); });
    return map;
  }, [state.rooms]);
  const types = filter === "all" ? ROOM_TYPES : ROOM_TYPES.filter(t => t.id === filter);
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16">
      <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>ACCOMMODATIONS</p>
      <h1 className="dh-serif text-5xl mb-8" style={{ color: "var(--cream)" }}>Rooms & Suites</h1>
      <div className="flex gap-2 mb-10 flex-wrap">
        <button onClick={() => setFilter("all")} className="px-4 py-2 rounded-full text-sm" style={{ background: filter === "all" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === "all" ? "#15130f" : "var(--cream)" }}>All rooms</button>
        {ROOM_TYPES.map(t => <button key={t.id} onClick={() => setFilter(t.id)} className="px-4 py-2 rounded-full text-sm" style={{ background: filter === t.id ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === t.id ? "#15130f" : "var(--cream)" }}>{t.name}</button>)}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {types.map(t => (
          <div key={t.id} className="relative">
            <RoomCard room={t} onView={() => viewRoom(t)} />
            <div className="absolute top-3 right-3"><Badge tone={availByType[t.id] > 0 ? "good" : "bad"}>{availByType[t.id] > 0 ? `${availByType[t.id]} available` : "Fully booked"}</Badge></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomDetailPage({ room, go }) {
  const { state } = useData();
  const [ci, setCi] = useState(todayISO());
  const [co, setCo] = useState(addDays(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const availableCount = state.rooms.filter(r => r.typeId === room.id && r.status === "AVAILABLE").length;
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-14">
      <button onClick={() => go("rooms")} className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--gray)" }}><ChevronLeft size={15} /> Back to rooms</button>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <img src={room.img} className="rounded-2xl h-[420px] w-full object-cover md:col-span-2" alt="" />
      </div>
      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h1 className="dh-serif text-4xl mb-3" style={{ color: "var(--cream)" }}>{room.name}</h1>
          <Badge tone={availableCount > 0 ? "good" : "bad"}>{availableCount > 0 ? `${availableCount} rooms available` : "Fully booked"}</Badge>
          <p className="leading-relaxed my-6" style={{ color: "var(--gray)" }}>{room.desc}</p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-sm" style={{ color: "var(--cream2)" }}>
            <div><div style={{ color: "var(--gray)" }}>Size</div>{room.size}</div>
            <div><div style={{ color: "var(--gray)" }}>Beds</div>{room.beds}</div>
            <div><div style={{ color: "var(--gray)" }}>Max guests</div>{room.maxGuests}</div>
          </div>
          <h3 className="dh-serif text-xl mb-4" style={{ color: "var(--cream)" }}>Amenities</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {room.amenities.map(a => { const I = AMENITY_ICON[a]; return <div key={a} className="flex items-center gap-2 text-sm" style={{ color: "var(--gray)" }}><I size={15} color="var(--gold-soft)" /> {AMENITY_LABEL[a]}</div>; })}
          </div>
        </div>
        <div className="rounded-2xl p-6 h-fit sticky top-24" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-2xl mb-1" style={{ color: "var(--gold)" }}>{fmtPublicMoney(room.price)} <span className="text-sm" style={{ color: "var(--gray)" }}>/ night</span></div>
          <div className="flex flex-col gap-3 mt-5">
            <Field label="Check-in"><Input type="date" value={ci} min={todayISO()} onChange={e => setCi(e.target.value)} /></Field>
            <Field label="Check-out"><Input type="date" value={co} min={addDays(ci, 1)} onChange={e => setCo(e.target.value)} /></Field>
            <Field label="Guests"><Input type="number" min={1} max={room.maxGuests} value={guests} onChange={e => setGuests(+e.target.value)} /></Field>
          </div>
          <div className="my-5 pt-5 text-sm flex justify-between" style={{ borderTop: "1px solid var(--line)", color: "var(--gray)" }}>
            <span>{nightsBetween(ci, co)} nights × {fmtPublicMoney(room.price)}</span><span style={{ color: "var(--cream)" }}>{fmtPublicMoney(nightsBetween(ci, co) * room.price)}</span>
          </div>
          <Btn className="w-full" onClick={() => go("booking", { roomTypeId: room.id, ci, co, guests })}>Book Now</Btn>
        </div>
      </div>
    </div>
  );
}

function BookingPage({ prefill, go, pushToast }) {
  const { state, dispatch } = useData();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", guests: prefill?.guests || 2,
    roomTypeId: prefill?.roomTypeId || ROOM_TYPES[0].id, ci: prefill?.ci || todayISO(), co: prefill?.co || addDays(todayISO(), 2), request: "",
  });
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const nights = nightsBetween(form.ci, form.co);
  const roomType = ROOM_TYPES.find(t => t.id === form.roomTypeId);
  const total = nights * roomType.price;

  const availableRoom = () => state.rooms.find(r => r.typeId === form.roomTypeId && r.status === "AVAILABLE" &&
    !state.bookings.some(b => b.roomId === r.id && !["Cancelled", "No-show", "Checked-out"].includes(b.status) && form.ci < b.checkOut && form.co > b.checkIn));

  const submit = () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Please enter a valid email address.");
    if (!/^[+\d][\d\s-]{6,}$/.test(form.phone)) return setError("Please enter a valid phone number.");
    if (form.co <= form.ci) return setError("Check-out date must be after check-in date.");
    const room = availableRoom();
    if (!room) return setError("Sorry — no rooms of this type are available for the selected dates.");
    const id = "DH" + (1000 + state.bookings.length + Math.floor(Math.random() * 90));
    const booking = {
      id, guestId: uid("guest_"), guestName: form.name, phone: form.phone, email: form.email,
      roomId: room.id, roomNumber: room.number, roomType: room.typeName, checkIn: form.ci, checkOut: form.co,
      nights, guests: form.guests, request: form.request, amount: total, status: "Pending", paymentStatus: "Pending", created: todayISO(),
    };
    dispatch({ type: "ADD_BOOKING", booking });
    dispatch({ type: "SET_ROOM_STATUS", id: room.id, status: "RESERVED" });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New booking", detail: `${form.name} · ${room.typeName} · ${id}` } });
    dispatch({ type: "ADD_AUDIT", entry: { user: "guest", action: `New public booking ${id} created` } });
    setConfirmation(booking);
  };

  if (confirmation) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(182,144,90,0.15)" }}><Check size={28} color="var(--gold)" /></div>
        <h1 className="dh-serif text-4xl mb-3" style={{ color: "var(--cream)" }}>Booking received</h1>
        <p style={{ color: "var(--gray)" }} className="mb-10">We've sent a confirmation to {confirmation.email}.</p>
        <div className="rounded-2xl p-8 text-left grid grid-cols-2 gap-5 text-sm" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          {[["Booking ID", confirmation.id], ["Guest", confirmation.guestName], ["Room", `${confirmation.roomType} · #${confirmation.roomNumber}`],
          ["Check-in", fmtDate(confirmation.checkIn)], ["Check-out", fmtDate(confirmation.checkOut)], ["Nights", confirmation.nights],
          ["Total", fmtPublicMoney(confirmation.amount)], ["Status", <Badge tone={statusTone(confirmation.status)}>{confirmation.status}</Badge>]].map(([l, v]) => (
            <div key={l}><div style={{ color: "var(--gray)" }} className="text-xs uppercase mb-1">{l}</div><div style={{ color: "var(--cream)" }}>{v}</div></div>
          ))}
        </div>
        <Btn className="mt-10" onClick={() => go("home")}>Back to home</Btn>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="dh-serif text-4xl mb-2" style={{ color: "var(--cream)" }}>Book Your Stay</h1>
      <p style={{ color: "var(--gray)" }} className="mb-10">Tell us a little about your trip and we'll hold the room for you.</p>
      {error && <div className="rounded-xl px-4 py-3 mb-6 text-sm" style={{ background: "rgba(178,72,72,0.15)", color: "#e79a9a" }}>{error}</div>}
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Full name"><Input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Jane Doe" /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+1 555 000 0000" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="jane@email.com" /></Field>
        <Field label="Number of guests"><Input type="number" min={1} value={form.guests} onChange={e => upd("guests", +e.target.value)} /></Field>
        <Field label="Room type">
          <Select value={form.roomTypeId} onChange={e => upd("roomTypeId", e.target.value)}>{ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} — {fmtPublicMoney(t.price)}/night</option>)}</Select>
        </Field>
        <div />
        <Field label="Check-in"><Input type="date" value={form.ci} min={todayISO()} onChange={e => upd("ci", e.target.value)} /></Field>
        <Field label="Check-out"><Input type="date" value={form.co} min={addDays(form.ci, 1)} onChange={e => upd("co", e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Special request (optional)"><TextArea rows={3} value={form.request} onChange={e => upd("request", e.target.value)} placeholder="High floor, quiet room, early check-in..." /></Field></div>
      </div>
      <div className="rounded-2xl p-6 mt-8 flex flex-wrap gap-6 justify-between items-center" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="text-sm" style={{ color: "var(--gray)" }}>{nights} nights × {fmtPublicMoney(roomType.price)} = <span style={{ color: "var(--cream)" }}>{fmtPublicMoney(total)}</span></div>
        <Btn onClick={submit} size="lg">Confirm Booking</Btn>
      </div>
    </div>
  );
}

function ServicesPage() {
  const { state } = useData();
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16">
      <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>SERVICES</p>
      <h1 className="dh-serif text-5xl mb-10" style={{ color: "var(--cream)" }}>Hotel Services</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {state.services.map(s => (
          <div key={s.id} className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
            <ConciergeBell size={22} color="var(--gold)" className="mb-5" />
            <div className="dh-serif text-lg mb-1" style={{ color: "var(--cream)" }}>{s.name}</div>
            <div className="text-sm" style={{ color: "var(--gray)" }}>{s.price ? fmtPublicMoney(s.price) : "Complimentary"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-20">
      <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>ABOUT US</p>
      <h1 className="dh-serif text-5xl mb-8" style={{ color: "var(--cream)" }}>Our Story</h1>
      <p className="leading-relaxed mb-5" style={{ color: "var(--gray)" }}>Demo Hotel opened its doors twelve years ago with a simple idea: hospitality should feel personal, not performative. Since then we've hosted travelers from over sixty countries across our 48 rooms and suites.</p>
      <p className="leading-relaxed" style={{ color: "var(--gray)" }}>Our team of reception, housekeeping, and concierge staff work from a single shared system, so whether you book online, call the front desk, or walk in — everyone already knows who you are and what you need.</p>
    </div>
  );
}
function GalleryPage() { return <div className="max-w-7xl mx-auto px-5 md:px-8 py-20"><h1 className="dh-serif text-5xl mb-10" style={{ color: "var(--cream)" }}>Gallery</h1><GalleryGrid /></div>; }

function ContactPage({ pushToast }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-20">
      <h1 className="dh-serif text-5xl mb-3" style={{ color: "var(--cream)" }}>Contact Us</h1>
      <p style={{ color: "var(--gray)" }} className="mb-10">Questions about your stay? Reach out and we'll get back to you shortly.</p>
      {sent ? <div className="rounded-xl px-5 py-4" style={{ background: "rgba(182,144,90,0.15)", color: "var(--gold-soft)" }}>Thanks — your message has been sent.</div> : (
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Name"><Input placeholder="Your name" /></Field>
          <Field label="Email"><Input placeholder="you@email.com" /></Field>
          <div className="md:col-span-2"><Field label="Message"><TextArea rows={5} placeholder="How can we help?" /></Field></div>
          <Btn onClick={() => setSent(true)}>Send Message</Btn>
        </div>
      )}
    </div>
  );
}

function StaffLoginPage({ go }) {
  const { state } = useData();
  const { setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const emp = state.employees.find(e => e.username === username && e.password === password);
    if (!emp) return setError("Invalid username or password.");
    if (emp.status !== "Active") return setError("This account has been deactivated.");
    setUser(emp);
    go(emp.role === "ADMIN" || emp.role === "MANAGER" ? "admin" : "reception");
  };
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl p-8 dh-fade" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2 mb-1"><Lock size={18} color="var(--gold)" /><h1 className="dh-serif text-2xl" style={{ color: "var(--cream)" }}>Staff Login</h1></div>
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>Access the Demo Hotel management system.</p>
        {error && <div className="rounded-lg px-3.5 py-2.5 mb-4 text-sm" style={{ background: "rgba(178,72,72,0.15)", color: "#e79a9a" }}>{error}</div>}
        <div className="flex flex-col gap-4">
          <Field label="Username or email"><Input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="admin" /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••" /></Field>
          <Btn onClick={submit} className="w-full mt-1"><ShieldCheck size={16} /> Sign In</Btn>
        </div>
        <div className="mt-6 rounded-lg px-3.5 py-3 text-xs leading-relaxed" style={{ background: "rgba(246,241,231,0.05)", color: "var(--gray)" }}>
          <b style={{ color: "var(--gold-soft)" }}>DEMO credentials</b> — Admin: <code>admin / 1234</code> · Reception: <code>reception / 1234</code>.<br />Change these before any real deployment.
        </div>
        <button onClick={() => go("home")} className="text-xs mt-5 flex items-center gap-1 mx-auto" style={{ color: "var(--gray)" }}><ChevronLeft size={13} /> Back to website</button>
      </div>
    </div>
  );
}

function PublicSiteInner({ pushToast }) {
  const [page, setPage] = useState("home");
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0]);
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const go = (key, payload) => {
    if (key === "booking") setBookingPrefill(payload || null);
    setPage(key);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const viewRoom = (t) => { setSelectedRoom(t); setPage("roomDetail"); window.scrollTo(0, 0); };
  return (
    <div>
      <PublicHeader nav={page} go={go} />
      {page === "home" && <HomePage go={go} viewRoom={viewRoom} />}
      {page === "rooms" && <RoomsPage go={go} viewRoom={viewRoom} />}
      {page === "roomDetail" && <RoomDetailPage room={selectedRoom} go={go} />}
      {page === "booking" && <BookingPage prefill={bookingPrefill} go={go} pushToast={pushToast} />}
      {page === "services" && <ServicesPage />}
      {page === "about" && <AboutPage />}
      {page === "gallery" && <GalleryPage />}
      {page === "contact" && <ContactPage pushToast={pushToast} />}
      {page === "login" && <StaffLoginPage go={go} />}
      <PublicFooter go={go} />
    </div>
  );
}

// Public site is wrapped with its own Language + Currency providers, seeded from whatever
// the Admin has enabled in Settings — so Admin controls which languages/currencies guests
// may pick from, while each visitor's own selection stays local to their session.
function PublicSite({ pushToast }) {
  const { state } = useData();
  return (
    <LangProvider availableLangs={state.settings.enabledLanguages}>
      <PublicCurrencyProvider availableCurrencies={state.settings.enabledCurrencies}>
        <PublicSiteInner pushToast={pushToast} />
      </PublicCurrencyProvider>
    </LangProvider>
  );
}

/* =====================================================================================
   SHARED DASHBOARD SHELL
===================================================================================== */
function DashboardShell({ role, items, active, setActive, children, onExit }) {
  const { user, setUser } = useAuth();
  const { state, dispatch } = useData();
  useEffect(() => { _adminCurrency = state.settings.currency; }, [state.settings.currency]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = state.notifications.filter(n => !n.read).length;
  return (
    <div className="min-h-screen flex" style={{ background: "var(--charcoal)" }}>
      <aside className={`fixed lg:static z-40 top-0 left-0 h-full w-64 p-5 flex flex-col transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} style={{ background: "var(--charcoal2)", borderRight: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2 px-2 mb-8"><Hotel size={20} color="var(--gold)" /><span className="dh-serif text-base" style={{ color: "var(--cream)" }}>{state.settings.name}</span></div>
        <div className="text-xs uppercase tracking-wider px-2 mb-3" style={{ color: "var(--gray)" }}>{role === "ADMIN" || role === "MANAGER" ? "Admin Panel" : "Reception Desk"}</div>
        <nav className="flex flex-col gap-1 flex-1 dh-scroll overflow-y-auto">
          {items.map(({ key, label, icon: I }) => (
            <button key={key} onClick={() => { setActive(key); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ background: active === key ? "rgba(182,144,90,0.14)" : "transparent", color: active === key ? "var(--gold)" : "var(--cream2)" }}>
              <I size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="text-xs mb-2 px-2" style={{ color: "var(--gray)" }}>Signed in as <span style={{ color: "var(--cream)" }}>{user?.name}</span> · {user?.role}</div>
          <button onClick={() => { setUser(null); onExit(); }} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm w-full" style={{ color: "#e79a9a" }}><LogOut size={16} /> Log out</button>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileOpen(false)} />}
      <div className="flex-1 min-w-0">
        <div className="h-16 flex items-center justify-between px-5 lg:px-8 sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(21,19,15,0.85)", borderBottom: "1px solid var(--line)" }}>
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(true)}><Menu color="var(--cream)" /></button>
          <div className="hidden lg:block dh-serif text-lg" style={{ color: "var(--cream)" }}>{items.find(i => i.key === active)?.label}</div>
          <div className="relative">
            <button onClick={() => { setNotifOpen(o => !o); dispatch({ type: "MARK_NOTIFS_READ" }); }} className="p-2 rounded-full relative" style={{ background: "rgba(246,241,231,0.05)" }}>
              <Bell size={17} color="var(--cream)" />
              {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center" style={{ background: "var(--gold)", color: "#15130f" }}>{unread}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl p-3 dh-fade dh-scroll max-h-96 overflow-y-auto" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
                {state.notifications.length === 0 ? <EmptyState icon={Bell} text="No notifications yet." /> : state.notifications.map(n => (
                  <div key={n.id} className="px-3 py-2.5 rounded-lg mb-1 text-sm" style={{ background: "rgba(246,241,231,0.04)" }}>
                    <div style={{ color: "var(--cream)" }}>{n.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--gray)" }}>{n.detail} · {n.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-5 lg:p-8 dh-scroll">{children}</div>
      </div>
    </div>
  );
}

function DataTable({ columns, rows, renderRow, empty }) {
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--line)" }}>
      <table className="w-full text-sm">
        <thead><tr style={{ background: "var(--charcoal2)" }}>{columns.map(c => <th key={c} className="text-left px-4 py-3 font-medium" style={{ color: "var(--gray)" }}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id || i} style={{ borderTop: "1px solid var(--line)" }} className="hover:bg-white/[0.02]">{renderRow(r)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* =====================================================================================
   ADMIN APP
===================================================================================== */
const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "rooms", label: "Rooms", icon: Bed },
  { key: "bookings", label: "Bookings", icon: CalendarDays },
  { key: "guests", label: "Guests", icon: Users },
  { key: "housekeeping", label: "Housekeeping", icon: Sparkles },
  { key: "services", label: "Services", icon: ConciergeBell },
  { key: "employees", label: "Employees", icon: UserCog },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "audit", label: "Audit Log", icon: ClipboardCheck },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function DashboardHome({ role }) {
  const { state } = useData();
  const rooms = state.rooms;
  const counts = ROOM_STATUSES.reduce((a, s) => ({ ...a, [s]: rooms.filter(r => r.status === s).length }), {});
  const todaysBookings = state.bookings.filter(b => b.checkIn === todayISO() || b.created === todayISO());
  const todaysCheckins = state.bookings.filter(b => b.checkIn === todayISO());
  const todaysCheckouts = state.bookings.filter(b => b.checkOut === todayISO());
  const todaysRevenue = state.bookings.filter(b => b.checkIn === todayISO() && b.paymentStatus === "Paid").reduce((s, b) => s + b.amount, 0) || 640;
  const monthlyRevenue = state.bookings.reduce((s, b) => s + (b.paymentStatus === "Paid" ? b.amount : 0), 0);
  const occupancy = Math.round((counts.OCCUPIED / rooms.length) * 100);

  const revenueData = Array.from({ length: 7 }).map((_, i) => ({ day: fmtDate(addDays(todayISO(), i - 6)).slice(0, 6), revenue: 900 + Math.round(Math.sin(i) * 300 + i * 60) }));
  const occByType = ROOM_TYPES.map(t => ({ name: t.name.split(" ")[0], occupied: rooms.filter(r => r.typeId === t.id && r.status === "OCCUPIED").length, total: rooms.filter(r => r.typeId === t.id).length }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Bed} label="Total Rooms" value={rooms.length} />
        <Stat icon={DoorOpen} label="Available" value={counts.AVAILABLE} />
        <Stat icon={DoorClosed} label="Occupied" value={counts.OCCUPIED} />
        <Stat icon={Wallet} label="Today's Revenue" value={fmtMoney(todaysRevenue)} />
        <Stat icon={CalendarDays} label="Today's Bookings" value={todaysBookings.length} />
        <Stat icon={Users} label="Today's Check-ins" value={todaysCheckins.length} />
        <Stat icon={ClipboardCheck} label="Today's Check-outs" value={todaysCheckouts.length} />
        <Stat icon={BarChart3} label="Occupancy Rate" value={`${occupancy}%`} />
      </div>
      {(role === "ADMIN" || role === "MANAGER") && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
            <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Revenue — last 7 days</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="day" stroke="var(--gray)" fontSize={12} /><YAxis stroke="var(--gray)" fontSize={12} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Line type="monotone" dataKey="revenue" stroke="var(--gold)" strokeWidth={2.5} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
            <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Occupancy by room type</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={occByType}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="name" stroke="var(--gray)" fontSize={11} /><YAxis stroke="var(--gray)" fontSize={12} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Bar dataKey="occupied" fill="var(--gold)" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Today's arrivals</div>
          {todaysCheckins.length === 0 ? <EmptyState text="No arrivals today." /> : todaysCheckins.map(b => (
            <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>Room {b.roomNumber}</span></div>
          ))}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Today's departures</div>
          {todaysCheckouts.length === 0 ? <EmptyState text="No departures today." /> : todaysCheckouts.map(b => (
            <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>Room {b.roomNumber}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomsAdmin({ readOnly, pushToast }) {
  const { state, dispatch } = useData();
  const [modal, setModal] = useState(null); // room object or "new"
  const [confirmDel, setConfirmDel] = useState(null);
  const [filter, setFilter] = useState("all");
  const rooms = filter === "all" ? state.rooms : state.rooms.filter(r => r.status === filter);

  const save = (room) => {
    dispatch({ type: "UPSERT_ROOM", room });
    dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `${state.rooms.some(r => r.id === room.id) ? "Updated" : "Created"} room ${room.number}` } });
    pushToast("Room saved.");
    setModal(null);
  };
  const del = () => {
    dispatch({ type: "DELETE_ROOM", id: confirmDel.id });
    dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Deleted room ${confirmDel.number}` } });
    pushToast("Room deleted.");
    setConfirmDel(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("all")} className="px-3.5 py-1.5 rounded-full text-xs" style={{ background: filter === "all" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === "all" ? "#15130f" : "var(--cream)" }}>All ({state.rooms.length})</button>
          {ROOM_STATUSES.map(s => <button key={s} onClick={() => setFilter(s)} className="px-3.5 py-1.5 rounded-full text-xs" style={{ background: filter === s ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === s ? "#15130f" : "var(--cream)" }}>{s} ({state.rooms.filter(r => r.status === s).length})</button>)}
        </div>
        {!readOnly && <Btn onClick={() => setModal("new")}><Plus size={15} /> Add Room</Btn>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map(r => {
          const booking = state.bookings.find(b => b.roomId === r.id && ["Confirmed", "Checked-in"].includes(b.status));
          return (
            <div key={r.id} className="rounded-2xl p-5" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div className="flex justify-between items-start mb-2">
                <div><div className="dh-serif text-xl" style={{ color: "var(--cream)" }}>#{r.number}</div><div className="text-xs" style={{ color: "var(--gray)" }}>{r.typeName}</div></div>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </div>
              <div className="text-sm mb-3" style={{ color: "var(--gold)" }}>{fmtMoney(r.price)}/night</div>
              {booking && <div className="text-xs mb-3" style={{ color: "var(--gray)" }}>{booking.guestName} · {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</div>}
              <div className="flex gap-2 items-center">
                {!readOnly ? (
                  <Select value={r.status} onChange={e => { dispatch({ type: "SET_ROOM_STATUS", id: r.id, status: e.target.value }); dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Changed room ${r.number} status to ${e.target.value}` } }); }} className="!py-1.5 text-xs">
                    {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                ) : <div className="flex-1" />}
                {!readOnly && <>
                  <button onClick={() => setModal(r)} className="p-2 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }}><Pencil size={13} color="var(--cream)" /></button>
                  <button onClick={() => setConfirmDel(r)} className="p-2 rounded-lg" style={{ background: "rgba(178,72,72,0.15)" }}><Trash2 size={13} color="#e79a9a" /></button>
                </>}
              </div>
            </div>
          );
        })}
      </div>
      <RoomFormModal open={!!modal} room={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={save} />
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete room?">
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>This will permanently remove room #{confirmDel?.number}. This cannot be undone.</p>
        <div className="flex gap-3 justify-end"><Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn><Btn variant="danger" onClick={del}>Delete Room</Btn></div>
      </Modal>
    </div>
  );
}

function RoomFormModal({ open, room, onClose, onSave }) {
  const [form, setForm] = useState(room || { number: "", typeId: ROOM_TYPES[0].id, status: "AVAILABLE" });
  useEffect(() => { setForm(room || { number: "", typeId: ROOM_TYPES[0].id, status: "AVAILABLE" }); }, [room, open]);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.number) return;
    const t = ROOM_TYPES.find(x => x.id === form.typeId);
    onSave({ id: form.id || uid("room_"), number: form.number, typeId: t.id, typeName: t.name, price: form.price || t.price, size: t.size, beds: t.beds, maxGuests: t.maxGuests, amenities: t.amenities, img: form.img || t.img, desc: t.desc, status: form.status });
  };
  return (
    <Modal open={open} onClose={onClose} title={room ? "Edit Room" : "Add Room"}>
      <div className="flex flex-col gap-4">
        <Field label="Room number"><Input value={form.number} onChange={e => upd("number", e.target.value)} placeholder="705" /></Field>
        <Field label="Room type"><Select value={form.typeId} onChange={e => upd("typeId", e.target.value)}>{ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Price override (per night)"><Input type="number" value={form.price ?? ""} onChange={e => upd("price", +e.target.value)} placeholder={String(ROOM_TYPES.find(t => t.id === form.typeId)?.price)} /></Field>
        <Field label="Photo URL (overrides the room type's default photo)">
          <Input value={form.img || ""} onChange={e => upd("img", e.target.value)} placeholder={ROOM_TYPES.find(t => t.id === form.typeId)?.img} />
        </Field>
        {(form.img || ROOM_TYPES.find(t => t.id === form.typeId)?.img) && (
          <img src={form.img || ROOM_TYPES.find(t => t.id === form.typeId)?.img} className="w-full h-32 object-cover rounded-lg" alt="" style={{ border: "1px solid var(--line)" }} />
        )}
        <Field label="Status"><Select value={form.status} onChange={e => upd("status", e.target.value)}>{ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Btn onClick={submit} className="mt-2">Save Room</Btn>
      </div>
    </Modal>
  );
}

function BookingsAdmin({ role, pushToast }) {
  const { state, dispatch } = useData();
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [payment, setPayment] = useState("all");
  const [viewB, setViewB] = useState(null); const [editB, setEditB] = useState(null); const [confirmDel, setConfirmDel] = useState(null);
  const canDelete = role === "ADMIN";
  const rows = state.bookings.filter(b =>
    (status === "all" || b.status === status) && (payment === "all" || b.paymentStatus === payment) &&
    (b.guestName.toLowerCase().includes(q.toLowerCase()) || b.id.toLowerCase().includes(q.toLowerCase()) || b.roomNumber.includes(q))
  );

  const setStatusFor = (b, newStatus) => {
    dispatch({ type: "UPDATE_BOOKING", id: b.id, patch: { status: newStatus } });
    if (newStatus === "Checked-in") dispatch({ type: "SET_ROOM_STATUS", id: b.roomId, status: "OCCUPIED" });
    if (newStatus === "Checked-out") dispatch({ type: "SET_ROOM_STATUS", id: b.roomId, status: "CLEANING" });
    if (newStatus === "Cancelled") dispatch({ type: "SET_ROOM_STATUS", id: b.roomId, status: "AVAILABLE" });
    if (newStatus === "Confirmed") dispatch({ type: "SET_ROOM_STATUS", id: b.roomId, status: "RESERVED" });
    dispatch({ type: "ADD_AUDIT", entry: { user: role.toLowerCase(), action: `${b.id} marked as ${newStatus}` } });
    dispatch({ type: "ADD_NOTIF", notif: { title: `Booking ${newStatus.toLowerCase()}`, detail: `${b.guestName} · ${b.id}` } });
    pushToast(`Booking ${newStatus.toLowerCase()}.`);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search guest, booking ID, room..." className="pl-9" /></div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="!w-auto"><option value="all">All statuses</option>{BOOKING_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
        <Select value={payment} onChange={e => setPayment(e.target.value)} className="!w-auto"><option value="all">All payments</option>{PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
      </div>
      <DataTable columns={["Booking", "Guest", "Room", "Dates", "Amount", "Payment", "Status", "Actions"]} rows={rows} empty="No bookings found."
        renderRow={(b) => (<>
          <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{b.id}</td>
          <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{b.guestName}<div className="text-xs" style={{ color: "var(--gray)" }}>{b.phone}</div></td>
          <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>#{b.roomNumber}</td>
          <td className="px-4 py-3 text-xs" style={{ color: "var(--gray)" }}>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}<div>{b.nights} nights</div></td>
          <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{fmtMoney(b.amount)}</td>
          <td className="px-4 py-3"><Badge tone={statusTone(b.paymentStatus)}>{b.paymentStatus}</Badge></td>
          <td className="px-4 py-3"><Badge tone={statusTone(b.status)}>{b.status}</Badge></td>
          <td className="px-4 py-3">
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setViewB(b)} className="p-1.5 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }} title="View"><Eye size={13} color="var(--cream)" /></button>
              <button onClick={() => setEditB(b)} className="p-1.5 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }} title="Edit"><Pencil size={13} color="var(--cream)" /></button>
              {b.status === "Pending" && <button onClick={() => setStatusFor(b, "Confirmed")} className="p-1.5 rounded-lg" style={{ background: "rgba(90,130,182,0.18)" }} title="Confirm"><Check size={13} color="#a9c6ec" /></button>}
              {["Confirmed", "Pending"].includes(b.status) && <button onClick={() => setStatusFor(b, "Checked-in")} className="p-1.5 rounded-lg" style={{ background: "rgba(93,138,86,0.2)" }} title="Check-in"><DoorOpen size={13} color="#9fd39a" /></button>}
              {b.status === "Checked-in" && <button onClick={() => setStatusFor(b, "Checked-out")} className="p-1.5 rounded-lg" style={{ background: "rgba(182,144,90,0.2)" }} title="Check-out"><DoorClosed size={13} color="var(--gold-soft)" /></button>}
              {!["Cancelled", "Checked-out"].includes(b.status) && <button onClick={() => setStatusFor(b, "Cancelled")} className="p-1.5 rounded-lg" style={{ background: "rgba(178,72,72,0.15)" }} title="Cancel"><X size={13} color="#e79a9a" /></button>}
              {canDelete && <button onClick={() => setConfirmDel(b)} className="p-1.5 rounded-lg" style={{ background: "rgba(178,72,72,0.15)" }} title="Delete"><Trash2 size={13} color="#e79a9a" /></button>}
            </div>
          </td>
        </>)} />
      <Modal open={!!viewB} onClose={() => setViewB(null)} title={`Booking ${viewB?.id}`}>
        {viewB && <div className="grid grid-cols-2 gap-4 text-sm">
          {[["Guest", viewB.guestName], ["Phone", viewB.phone], ["Email", viewB.email], ["Room", `#${viewB.roomNumber} · ${viewB.roomType}`], ["Check-in", fmtDate(viewB.checkIn)], ["Check-out", fmtDate(viewB.checkOut)], ["Guests", viewB.guests], ["Amount", fmtMoney(viewB.amount)], ["Special request", viewB.request || "—"]].map(([l, v]) => (
            <div key={l}><div className="text-xs uppercase" style={{ color: "var(--gray)" }}>{l}</div><div style={{ color: "var(--cream)" }}>{v}</div></div>
          ))}
        </div>}
      </Modal>
      <Modal open={!!editB} onClose={() => setEditB(null)} title={`Edit Booking ${editB?.id}`}>
        {editB && <div className="flex flex-col gap-4">
          <Field label="Check-in"><Input type="date" defaultValue={editB.checkIn} onChange={e => editB.checkIn = e.target.value} /></Field>
          <Field label="Check-out"><Input type="date" defaultValue={editB.checkOut} onChange={e => editB.checkOut = e.target.value} /></Field>
          <Field label="Special request"><TextArea defaultValue={editB.request} onChange={e => editB.request = e.target.value} /></Field>
          <Btn onClick={() => { dispatch({ type: "UPDATE_BOOKING", id: editB.id, patch: { checkIn: editB.checkIn, checkOut: editB.checkOut, nights: nightsBetween(editB.checkIn, editB.checkOut), request: editB.request } }); pushToast("Booking updated."); setEditB(null); }}>Save Changes</Btn>
        </div>}
      </Modal>
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete booking?">
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>This permanently removes booking {confirmDel?.id}.</p>
        <div className="flex gap-3 justify-end"><Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn><Btn variant="danger" onClick={() => { dispatch({ type: "DELETE_BOOKING", id: confirmDel.id }); pushToast("Booking deleted."); setConfirmDel(null); }}>Delete</Btn></div>
      </Modal>
    </div>
  );
}

function GuestsAdmin() {
  const { state } = useData();
  const [q, setQ] = useState(""); const [profile, setProfile] = useState(null);
  const rows = state.guests.filter(g => g.name.toLowerCase().includes(q.toLowerCase()) || g.email.toLowerCase().includes(q.toLowerCase()));
  const guestBookings = (id, name) => state.bookings.filter(b => b.guestId === id || b.guestName === name);
  return (
    <div>
      <div className="relative mb-6 max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search guests..." className="pl-9" /></div>
      <DataTable columns={["Name", "Contact", "Nationality", "Bookings", "Total spent", ""]} rows={rows} empty="No guests found." renderRow={(g) => {
        const bks = guestBookings(g.id, g.name);
        const spent = bks.filter(b => b.paymentStatus === "Paid").reduce((s, b) => s + b.amount, 0);
        return (<>
          <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{g.name}</td>
          <td className="px-4 py-3 text-xs" style={{ color: "var(--gray)" }}>{g.email}<div>{g.phone}</div></td>
          <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{g.nationality}</td>
          <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{bks.length}</td>
          <td className="px-4 py-3" style={{ color: "var(--gold)" }}>{fmtMoney(spent)}</td>
          <td className="px-4 py-3"><button onClick={() => setProfile(g)} className="p-1.5 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }}><Eye size={13} color="var(--cream)" /></button></td>
        </>);
      }} />
      <Modal open={!!profile} onClose={() => setProfile(null)} title={profile?.name} width="max-w-2xl">
        {profile && <div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            {[["Phone", profile.phone], ["Email", profile.email], ["ID / Passport", profile.idNumber], ["Nationality", profile.nationality], ["Date of birth", profile.dob]].map(([l, v]) => (
              <div key={l}><div className="text-xs uppercase" style={{ color: "var(--gray)" }}>{l}</div><div style={{ color: "var(--cream)" }}>{v}</div></div>
            ))}
          </div>
          <div className="dh-serif text-lg mb-3" style={{ color: "var(--cream)" }}>Booking history</div>
          {guestBookings(profile.id, profile.name).length === 0 ? <EmptyState text="No bookings yet." /> : guestBookings(profile.id, profile.name).map(b => (
            <div key={b.id} className="flex justify-between items-center py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}>
              <div><span style={{ color: "var(--cream)" }}>{b.roomType}</span> <span style={{ color: "var(--gray)" }}>#{b.roomNumber} · {fmtDate(b.checkIn)}</span></div>
              <Badge tone={statusTone(b.status)}>{b.status}</Badge>
            </div>
          ))}
        </div>}
      </Modal>
    </div>
  );
}

function HousekeepingAdmin({ pushToast, role }) {
  const { state, dispatch } = useData();
  const staff = state.employees.filter(e => e.role === "HOUSEKEEPING");
  const cols = ["Pending", "In progress", "Completed"];
  const assign = (task, name) => { dispatch({ type: "UPDATE_HK", id: task.id, patch: { assignedTo: name } }); pushToast("Task assigned."); };
  const advance = (task) => {
    const next = task.status === "Pending" ? "In progress" : task.status === "In progress" ? "Completed" : "Completed";
    dispatch({ type: "UPDATE_HK", id: task.id, patch: { status: next, completed: next === "Completed" ? new Date().toISOString() : task.completed } });
    if (next === "Completed") { dispatch({ type: "SET_ROOM_STATUS", id: task.roomId, status: "AVAILABLE" }); dispatch({ type: "ADD_NOTIF", notif: { title: "Room cleaning completed", detail: `Room ${task.roomNumber}` } }); }
    pushToast(`Task moved to ${next}.`);
  };
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-5">
        {cols.map(col => (
          <div key={col} className="rounded-2xl p-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between mb-4"><span className="text-sm" style={{ color: "var(--cream)" }}>{col}</span><Badge>{state.housekeeping.filter(t => t.status === col).length}</Badge></div>
            <div className="flex flex-col gap-3 dh-scroll overflow-y-auto max-h-[560px]">
              {state.housekeeping.filter(t => t.status === col).map(t => (
                <div key={t.id} className="rounded-xl p-4" style={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }}>
                  <div className="flex justify-between mb-1"><span className="dh-serif text-base" style={{ color: "var(--cream)" }}>Room {t.roomNumber}</span></div>
                  <div className="text-xs mb-2" style={{ color: "var(--gray)" }}>{t.taskType}</div>
                  {role === "ADMIN" ? (
                    <Select value={t.assignedTo} onChange={e => assign(t, e.target.value)} className="!py-1.5 text-xs mb-2">
                      {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </Select>
                  ) : <div className="text-xs mb-2" style={{ color: "var(--gold-soft)" }}>{t.assignedTo}</div>}
                  {col !== "Completed" && <Btn size="sm" variant="subtle" onClick={() => advance(t)} className="w-full">Move to {col === "Pending" ? "In progress" : "Completed"}</Btn>}
                </div>
              ))}
              {state.housekeeping.filter(t => t.status === col).length === 0 && <p className="text-xs text-center py-6" style={{ color: "var(--gray)" }}>Nothing here.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesAdmin({ pushToast }) {
  const { state, dispatch } = useData();
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Service Catalog</div>
        <div className="grid sm:grid-cols-2 gap-4">
          {state.services.map(s => (
            <div key={s.id} className="rounded-xl p-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div style={{ color: "var(--cream)" }}>{s.name}</div>
              <div className="text-sm" style={{ color: "var(--gold)" }}>{s.price ? fmtMoney(s.price) : "Free"}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Service Requests</div>
        <div className="flex flex-col gap-3">
          {state.requests.length === 0 && <EmptyState text="No service requests." />}
          {state.requests.map(r => (
            <div key={r.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div><div style={{ color: "var(--cream)" }}>{r.service} × {r.qty}</div><div className="text-xs" style={{ color: "var(--gray)" }}>{r.guestName} · Room {r.roomNumber}</div></div>
              <Select value={r.status} onChange={e => { dispatch({ type: "UPDATE_REQUEST", id: r.id, patch: { status: e.target.value } }); pushToast("Request updated."); }} className="!w-auto !py-1.5 text-xs">
                {["New", "Accepted", "In progress", "Completed", "Cancelled"].map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployeesAdmin({ pushToast }) {
  const { state, dispatch } = useData();
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  return (
    <div>
      <div className="flex justify-end mb-6"><Btn onClick={() => setModal("new")}><Plus size={15} /> Add Employee</Btn></div>
      <DataTable columns={["Name", "Username", "Role", "Contact", "Status", "Actions"]} rows={state.employees} empty="No employees." renderRow={(e) => (<>
        <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{e.name}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{e.username}</td>
        <td className="px-4 py-3"><Badge tone="info">{e.role}</Badge></td>
        <td className="px-4 py-3 text-xs" style={{ color: "var(--gray)" }}>{e.email}<div>{e.phone}</div></td>
        <td className="px-4 py-3"><Badge tone={e.status === "Active" ? "good" : "bad"}>{e.status}</Badge></td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5">
            <button onClick={() => setModal(e)} className="p-1.5 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }}><Pencil size={13} color="var(--cream)" /></button>
            <button onClick={() => { dispatch({ type: "UPSERT_EMPLOYEE", emp: { ...e, status: e.status === "Active" ? "Inactive" : "Active" } }); pushToast("Status updated."); }} className="p-1.5 rounded-lg" style={{ background: "rgba(182,144,90,0.18)" }}><ShieldCheck size={13} color="var(--gold-soft)" /></button>
            <button onClick={() => setConfirmDel(e)} className="p-1.5 rounded-lg" style={{ background: "rgba(178,72,72,0.15)" }}><Trash2 size={13} color="#e79a9a" /></button>
          </div>
        </td>
      </>)} />
      <EmployeeFormModal open={!!modal} emp={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={(emp) => { dispatch({ type: "UPSERT_EMPLOYEE", emp }); pushToast("Employee saved."); setModal(null); }} />
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete employee?">
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>Remove {confirmDel?.name} from the system permanently.</p>
        <div className="flex gap-3 justify-end"><Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn><Btn variant="danger" onClick={() => { dispatch({ type: "DELETE_EMPLOYEE", id: confirmDel.id }); pushToast("Employee deleted."); setConfirmDel(null); }}>Delete</Btn></div>
      </Modal>
    </div>
  );
}
function EmployeeFormModal({ open, emp, onClose, onSave }) {
  const blank = { name: "", username: "", password: "1234", role: "RECEPTION", email: "", phone: "", status: "Active" };
  const [form, setForm] = useState(emp || blank);
  useEffect(() => { setForm(emp || blank); }, [emp, open]);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title={emp ? "Edit Employee" : "Add Employee"}>
      <div className="flex flex-col gap-4">
        <Field label="Full name"><Input value={form.name} onChange={e => upd("name", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username"><Input value={form.username} onChange={e => upd("username", e.target.value)} /></Field>
          <Field label="Temporary password"><Input value={form.password} onChange={e => upd("password", e.target.value)} /></Field>
        </div>
        <Field label="Role"><Select value={form.role} onChange={e => upd("role", e.target.value)}>{["ADMIN", "RECEPTION", "HOUSEKEEPING", "MANAGER"].map(r => <option key={r}>{r}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email"><Input value={form.email} onChange={e => upd("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={e => upd("phone", e.target.value)} /></Field>
        </div>
        <Btn onClick={() => onSave({ ...form, id: form.id || uid("emp_"), created: form.created || todayISO() })}>Save Employee</Btn>
      </div>
    </Modal>
  );
}

function ReportsAdmin() {
  const { state } = useData();
  const revenueByMonth = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((m, i) => ({ month: m, revenue: 22000 + i * 2600 + (i % 2) * 900 }));
  const bookingStats = BOOKING_STATUSES.map(s => ({ name: s, value: state.bookings.filter(b => b.status === s).length }));
  const colors = ["#b6905a", "#8fbf87", "#a9c6ec", "#8f897c", "#c26b6b", "#d8c19a"];
  const exportCSV = () => {
    const header = "Booking ID,Guest,Room,Check In,Check Out,Amount,Status\n";
    const body = state.bookings.map(b => `${b.id},${b.guestName},${b.roomNumber},${b.checkIn},${b.checkOut},${b.amount},${b.status}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "bookings-report.csv"; a.click();
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end"><Btn variant="ghost" onClick={exportCSV}><Download size={15} /> Export CSV</Btn></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Monthly Revenue</div>
          <ResponsiveContainer width="100%" height={260}><BarChart data={revenueByMonth}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="month" stroke="var(--gray)" fontSize={12} /><YAxis stroke="var(--gray)" fontSize={12} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Bar dataKey="revenue" fill="var(--gold)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Booking Status Breakdown</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={bookingStats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>{bookingStats.map((e, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Legend wrapperStyle={{ fontSize: 12, color: "var(--gray)" }} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Wallet} label="Total Revenue (paid)" value={fmtMoney(state.bookings.filter(b => b.paymentStatus === "Paid").reduce((s, b) => s + b.amount, 0))} />
        <Stat icon={CalendarDays} label="Cancellations" value={state.bookings.filter(b => b.status === "Cancelled").length} />
        <Stat icon={UserCog} label="Active Employees" value={state.employees.filter(e => e.status === "Active").length} />
      </div>
    </div>
  );
}

function AuditLogAdmin() {
  const { state } = useData();
  return <DataTable columns={["User", "Action", "Time"]} rows={state.auditLog} empty="No activity yet." renderRow={(l) => (<>
    <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{l.user}</td>
    <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{l.action}</td>
    <td className="px-4 py-3 text-xs" style={{ color: "var(--gray)" }}>{l.time}</td>
  </>)} />;
}

function ImageListEditor({ title, hint, images, onChange }) {
  const [url, setUrl] = useState("");
  const add = () => { if (!url.trim()) return; onChange([...images, url.trim()]); setUrl(""); };
  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const next = [...images]; const to = idx + dir;
    if (to < 0 || to >= next.length) return;
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };
  return (
    <div className="rounded-2xl p-6 lg:col-span-2" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
      <div className="dh-serif text-lg mb-1" style={{ color: "var(--cream)" }}>{title}</div>
      <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>{hint}</p>
      <div className="flex gap-2 mb-5">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/photo.jpg" onKeyDown={e => e.key === "Enter" && add()} />
        <Btn onClick={add}><Plus size={15} /> Add</Btn>
      </div>
      {images.length === 0 ? <EmptyState text="No images yet — add a URL above." /> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((src, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden relative group" style={{ border: "1px solid var(--line)" }}>
              <img src={src} className="w-full h-28 object-cover" alt="" />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                {idx > 0 && <button onClick={() => move(idx, -1)} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.15)" }}><ChevronLeft size={13} color="#fff" /></button>}
                {idx < images.length - 1 && <button onClick={() => move(idx, 1)} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.15)" }}><ChevronRight size={13} color="#fff" /></button>}
                <button onClick={() => remove(idx)} className="p-1.5 rounded-full" style={{ background: "rgba(178,72,72,0.5)" }}><Trash2 size={13} color="#fff" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs mt-4 leading-relaxed" style={{ color: "var(--gray)" }}>Images are added by URL in this demo. In a production build with real file uploads, this panel would upload to storage (e.g. Supabase Storage / S3) and save the returned URL here instead.</p>
    </div>
  );
}

function SettingsAdmin({ pushToast }) {
  const { state, dispatch } = useData();
  const [form, setForm] = useState(state.settings);
  const [pw, setPw] = useState({ current: "", next: "" });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-5" style={{ color: "var(--cream)" }}>Hotel Information</div>
        <div className="flex flex-col gap-4">
          <Field label="Hotel name"><Input value={form.name} onChange={e => upd("name", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={e => upd("phone", e.target.value)} /></Field>
          <Field label="Email"><Input value={form.email} onChange={e => upd("email", e.target.value)} /></Field>
          <Field label="Address"><Input value={form.address} onChange={e => upd("address", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Check-in time"><Input type="time" value={form.checkIn} onChange={e => upd("checkIn", e.target.value)} /></Field>
            <Field label="Check-out time"><Input type="time" value={form.checkOut} onChange={e => upd("checkOut", e.target.value)} /></Field>
          </div>
          <Field label="Base currency (used across Admin & Reception)"><Select value={form.currency} onChange={e => upd("currency", e.target.value)}>{Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Btn onClick={() => { dispatch({ type: "UPDATE_SETTINGS", patch: form }); pushToast("Settings saved."); }}>Save Settings</Btn>
        </div>
      </div>

      <div className="rounded-2xl p-6 h-fit" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-2" style={{ color: "var(--cream)" }}>Guest Website — Languages & Currencies</div>
        <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>Choose which options visitors can pick from the header of the public website. These do not affect Admin/Reception.</p>
        <div className="mb-5">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Languages</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LANGUAGES).map(([code, label]) => {
              const active = (form.enabledLanguages || []).includes(code);
              return (
                <button key={code} onClick={() => upd("enabledLanguages", active ? form.enabledLanguages.filter(c => c !== code) : [...(form.enabledLanguages || []), code])}
                  className="px-3 py-1.5 rounded-full text-xs" style={{ background: active ? "var(--gold)" : "rgba(246,241,231,0.06)", color: active ? "#15130f" : "var(--cream)" }}>{label}</button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Currencies</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(CURRENCIES).map(code => {
              const active = (form.enabledCurrencies || []).includes(code);
              return (
                <button key={code} onClick={() => upd("enabledCurrencies", active ? form.enabledCurrencies.filter(c => c !== code) : [...(form.enabledCurrencies || []), code])}
                  className="px-3 py-1.5 rounded-full text-xs" style={{ background: active ? "var(--gold)" : "rgba(246,241,231,0.06)", color: active ? "#15130f" : "var(--cream)" }}>{code}</button>
              );
            })}
          </div>
          <Btn size="sm" variant="ghost" onClick={() => { dispatch({ type: "UPDATE_SETTINGS", patch: form }); pushToast("Settings saved."); }}>Save Choices</Btn>
        </div>
      </div>

      <ImageListEditor
        title="Homepage Hero Slideshow"
        hint="These images rotate on the public homepage hero. Add one or more image URLs."
        images={form.heroImages || []}
        onChange={(imgs) => { const next = { ...form, heroImages: imgs }; setForm(next); dispatch({ type: "UPDATE_SETTINGS", patch: { heroImages: imgs } }); }}
      />
      <ImageListEditor
        title="Gallery Photos"
        hint="Shown on the homepage gallery section and the public Gallery page."
        images={form.galleryImages || []}
        onChange={(imgs) => { const next = { ...form, galleryImages: imgs }; setForm(next); dispatch({ type: "UPDATE_SETTINGS", patch: { galleryImages: imgs } }); }}
      />

      <div className="rounded-2xl p-6 h-fit" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-5" style={{ color: "var(--cream)" }}>Security</div>
        <div className="flex flex-col gap-4">
          <Field label="Current password"><Input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} /></Field>
          <Field label="New password"><Input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></Field>
          <Btn variant="ghost" onClick={() => { pushToast("Password updated."); setPw({ current: "", next: "" }); }}>Change Password</Btn>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--gray)" }}>In production, passwords must be hashed (e.g. bcrypt/argon2) and never stored or compared in plain text — this demo compares them directly for simplicity only.</p>
        </div>
      </div>
    </div>
  );
}

function AdminApp({ pushToast, exit }) {
  const { user } = useAuth();
  const [active, setActive] = useState("dashboard");
  const items = ADMIN_NAV.filter(n => can(user.role, n.key) || (user.role === "MANAGER" && ["dashboard", "rooms", "bookings", "guests", "reports"].includes(n.key)));
  return (
    <DashboardShell role={user.role} items={items} active={active} setActive={setActive} onExit={exit}>
      {active === "dashboard" && <DashboardHome role={user.role} />}
      {active === "rooms" && <RoomsAdmin readOnly={user.role === "MANAGER"} pushToast={pushToast} />}
      {active === "bookings" && <BookingsAdmin role={user.role} pushToast={pushToast} />}
      {active === "guests" && <GuestsAdmin />}
      {active === "housekeeping" && user.role === "ADMIN" && <HousekeepingAdmin pushToast={pushToast} role={user.role} />}
      {active === "services" && user.role === "ADMIN" && <ServicesAdmin pushToast={pushToast} />}
      {active === "employees" && user.role === "ADMIN" && <EmployeesAdmin pushToast={pushToast} />}
      {active === "reports" && <ReportsAdmin />}
      {active === "audit" && user.role === "ADMIN" && <AuditLogAdmin />}
      {active === "settings" && user.role === "ADMIN" && <SettingsAdmin pushToast={pushToast} />}
    </DashboardShell>
  );
}

/* =====================================================================================
   RECEPTION APP
===================================================================================== */
const RECEPTION_NAV = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "bookings", label: "Bookings", icon: CalendarDays },
  { key: "rooms", label: "Room Status", icon: Bed },
  { key: "guests", label: "Guests", icon: Users },
  { key: "housekeeping", label: "Housekeeping Requests", icon: Sparkles },
  { key: "services", label: "Service Requests", icon: ConciergeBell },
];

function ReceptionDashboard({ setActive, pushToast }) {
  const { state, dispatch } = useData();
  const arrivals = state.bookings.filter(b => b.checkIn === todayISO() && b.status !== "Cancelled");
  const departures = state.bookings.filter(b => b.checkOut === todayISO() && b.status !== "Cancelled");
  const [q, setQ] = useState("");
  const found = q ? state.guests.filter(g => g.name.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon={DoorOpen} label="Available Rooms" value={state.rooms.filter(r => r.status === "AVAILABLE").length} />
        <Stat icon={DoorClosed} label="Occupied Rooms" value={state.rooms.filter(r => r.status === "OCCUPIED").length} />
        <Stat icon={Users} label="Today's Arrivals" value={arrivals.length} />
        <Stat icon={ClipboardCheck} label="Today's Departures" value={departures.length} />
        <Stat icon={AlertTriangle} label="Pending Bookings" value={state.bookings.filter(b => b.status === "Pending").length} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Btn onClick={() => setActive("bookings")}><Plus size={15} /> New Booking</Btn>
        <Btn variant="ghost" onClick={() => setActive("bookings")}><DoorOpen size={15} /> Check-in</Btn>
        <Btn variant="ghost" onClick={() => setActive("bookings")}><DoorClosed size={15} /> Check-out</Btn>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Search Guest</div>
        <div className="relative max-w-md mb-4"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Type a guest name..." className="pl-9" /></div>
        {q && (found.length === 0 ? <EmptyState text="No guests found." /> : found.map(g => (
          <div key={g.id} className="flex justify-between py-2 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{g.name}</span><span style={{ color: "var(--gray)" }}>{g.phone}</span></div>
        )))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Today's arrivals</div>
          {arrivals.length === 0 ? <EmptyState text="No arrivals today." /> : arrivals.map(b => <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>Room {b.roomNumber}</span></div>)}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>Today's departures</div>
          {departures.length === 0 ? <EmptyState text="No departures today." /> : departures.map(b => <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>Room {b.roomNumber}</span></div>)}
        </div>
      </div>
    </div>
  );
}

function ReceptionNewBooking({ pushToast }) {
  const { state, dispatch } = useData();
  const [form, setForm] = useState({ name: "", phone: "", email: "", guests: 2, roomTypeId: ROOM_TYPES[0].id, ci: todayISO(), co: addDays(todayISO(), 1), request: "" });
  const [error, setError] = useState("");
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const nights = nightsBetween(form.ci, form.co);
  const roomType = ROOM_TYPES.find(t => t.id === form.roomTypeId);
  const submit = () => {
    setError("");
    if (!form.name.trim()) return setError("Guest name is required.");
    if (form.co <= form.ci) return setError("Check-out must be after check-in.");
    const room = state.rooms.find(r => r.typeId === form.roomTypeId && r.status === "AVAILABLE" &&
      !state.bookings.some(b => b.roomId === r.id && !["Cancelled", "No-show", "Checked-out"].includes(b.status) && form.ci < b.checkOut && form.co > b.checkIn));
    if (!room) return setError("No rooms of this type are available for those dates.");
    const id = "DH" + (1000 + state.bookings.length + Math.floor(Math.random() * 90));
    const booking = { id, guestId: uid("guest_"), guestName: form.name, phone: form.phone, email: form.email, roomId: room.id, roomNumber: room.number, roomType: room.typeName, checkIn: form.ci, checkOut: form.co, nights, guests: form.guests, request: form.request, amount: nights * roomType.price, status: "Confirmed", paymentStatus: "Pending", created: todayISO() };
    dispatch({ type: "ADD_BOOKING", booking });
    dispatch({ type: "SET_ROOM_STATUS", id: room.id, status: "RESERVED" });
    dispatch({ type: "ADD_AUDIT", entry: { user: "reception", action: `Created booking ${id} for ${form.name}` } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New booking (reception)", detail: `${form.name} · Room ${room.number}` } });
    pushToast(`Booking ${id} created — room #${room.number}.`);
    setForm({ name: "", phone: "", email: "", guests: 2, roomTypeId: ROOM_TYPES[0].id, ci: todayISO(), co: addDays(todayISO(), 1), request: "" });
  };
  return (
    <div className="max-w-2xl">
      {error && <div className="rounded-lg px-4 py-3 mb-5 text-sm" style={{ background: "rgba(178,72,72,0.15)", color: "#e79a9a" }}>{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Full name"><Input value={form.name} onChange={e => upd("name", e.target.value)} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={e => upd("phone", e.target.value)} /></Field>
        <Field label="Email"><Input value={form.email} onChange={e => upd("email", e.target.value)} /></Field>
        <Field label="Guests"><Input type="number" min={1} value={form.guests} onChange={e => upd("guests", +e.target.value)} /></Field>
        <Field label="Room type"><Select value={form.roomTypeId} onChange={e => upd("roomTypeId", e.target.value)}>{ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} — {fmtMoney(t.price)}/night</option>)}</Select></Field>
        <div />
        <Field label="Check-in"><Input type="date" value={form.ci} onChange={e => upd("ci", e.target.value)} /></Field>
        <Field label="Check-out"><Input type="date" value={form.co} onChange={e => upd("co", e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Special request"><TextArea rows={2} value={form.request} onChange={e => upd("request", e.target.value)} /></Field></div>
      </div>
      <div className="flex justify-between items-center mt-6 rounded-xl p-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <span className="text-sm" style={{ color: "var(--gray)" }}>{nights} nights × {fmtMoney(roomType.price)}</span>
        <Btn onClick={submit}>Create Booking</Btn>
      </div>
    </div>
  );
}

function ReceptionBookings({ pushToast }) {
  const [tab, setTab] = useState("new");
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("new")} className="px-4 py-2 rounded-full text-sm" style={{ background: tab === "new" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: tab === "new" ? "#15130f" : "var(--cream)" }}>New Booking</button>
        <button onClick={() => setTab("manage")} className="px-4 py-2 rounded-full text-sm" style={{ background: tab === "manage" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: tab === "manage" ? "#15130f" : "var(--cream)" }}>Manage Bookings</button>
      </div>
      {tab === "new" ? <ReceptionNewBooking pushToast={pushToast} /> : <BookingsAdmin role="RECEPTION" pushToast={pushToast} />}
    </div>
  );
}

function ReceptionRooms() {
  const { state, dispatch } = useData();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {state.rooms.map(r => (
        <div key={r.id} className="rounded-2xl p-5" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="flex justify-between mb-2"><div className="dh-serif text-xl" style={{ color: "var(--cream)" }}>#{r.number}</div><Badge tone={statusTone(r.status)}>{r.status}</Badge></div>
          <div className="text-xs" style={{ color: "var(--gray)" }}>{r.typeName}</div>
        </div>
      ))}
    </div>
  );
}

function ReceptionHousekeeping({ pushToast }) {
  const { state, dispatch } = useData();
  const [roomId, setRoomId] = useState(state.rooms[0]?.id);
  const [taskType, setTaskType] = useState("Full cleaning");
  const create = () => {
    const room = state.rooms.find(r => r.id === roomId);
    dispatch({ type: "ADD_HK", task: { id: uid("hk_"), roomId, roomNumber: room.number, taskType, assignedTo: "Unassigned", status: "Pending", created: new Date().toISOString(), started: null, completed: null } });
    dispatch({ type: "ADD_AUDIT", entry: { user: "reception", action: `Requested housekeeping for room ${room.number}` } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New housekeeping request", detail: `Room ${room.number} · ${taskType}` } });
    pushToast("Housekeeping request sent.");
  };
  return (
    <div>
      <div className="rounded-2xl p-6 mb-8 max-w-xl" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>New Housekeeping Request</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Room"><Select value={roomId} onChange={e => setRoomId(e.target.value)}>{state.rooms.map(r => <option key={r.id} value={r.id}>#{r.number}</option>)}</Select></Field>
          <Field label="Task type"><Select value={taskType} onChange={e => setTaskType(e.target.value)}>{["Full cleaning", "Bathroom cleaning", "Towel replacement", "Bed linen replacement", "Mini bar refill", "Inspection"].map(t => <option key={t}>{t}</option>)}</Select></Field>
        </div>
        <Btn onClick={create}>Submit Request</Btn>
      </div>
      <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>All Requests</div>
      <DataTable columns={["Room", "Task", "Assigned", "Status"]} rows={state.housekeeping} empty="No housekeeping tasks." renderRow={(t) => (<>
        <td className="px-4 py-3" style={{ color: "var(--cream)" }}>#{t.roomNumber}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{t.taskType}</td>
        <td className="px-4 py-3" style={{ color: "var(--gray)" }}>{t.assignedTo}</td>
        <td className="px-4 py-3"><Badge tone={t.status === "Completed" ? "good" : "warn"}>{t.status}</Badge></td>
      </>)} />
    </div>
  );
}

function ReceptionServices({ pushToast }) {
  const { state, dispatch } = useData();
  const [guestName, setGuestName] = useState(""); const [roomNumber, setRoomNumber] = useState(""); const [serviceId, setServiceId] = useState(state.services[0]?.id); const [qty, setQty] = useState(1);
  const create = () => {
    if (!guestName || !roomNumber) return;
    const svc = state.services.find(s => s.id === serviceId);
    dispatch({ type: "ADD_REQUEST", req: { id: uid("req_"), guestName, roomNumber, service: svc.name, qty, price: svc.price, status: "New", created: new Date().toISOString() } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New service request", detail: `${svc.name} · Room ${roomNumber}` } });
    pushToast("Service request created.");
    setGuestName(""); setRoomNumber("");
  };
  return (
    <div>
      <div className="rounded-2xl p-6 mb-8 max-w-xl" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>New Service Request</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Guest name"><Input value={guestName} onChange={e => setGuestName(e.target.value)} /></Field>
          <Field label="Room number"><Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} /></Field>
          <Field label="Service"><Select value={serviceId} onChange={e => setServiceId(e.target.value)}>{state.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Quantity"><Input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} /></Field>
        </div>
        <Btn onClick={create}>Submit Request</Btn>
      </div>
      <DataTable columns={["Guest", "Room", "Service", "Qty", "Status"]} rows={state.requests} empty="No service requests." renderRow={(r) => (<>
        <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{r.guestName}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>#{r.roomNumber}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{r.service}</td>
        <td className="px-4 py-3" style={{ color: "var(--gray)" }}>{r.qty}</td>
        <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
      </>)} />
    </div>
  );
}

function ReceptionApp({ pushToast, exit }) {
  const { user } = useAuth();
  const [active, setActive] = useState("dashboard");
  return (
    <DashboardShell role={user.role} items={RECEPTION_NAV} active={active} setActive={setActive} onExit={exit}>
      {active === "dashboard" && <ReceptionDashboard setActive={setActive} pushToast={pushToast} />}
      {active === "bookings" && <ReceptionBookings pushToast={pushToast} />}
      {active === "rooms" && <ReceptionRooms />}
      {active === "guests" && <GuestsAdmin />}
      {active === "housekeeping" && <ReceptionHousekeeping pushToast={pushToast} />}
      {active === "services" && <ReceptionServices pushToast={pushToast} />}
    </DashboardShell>
  );
}

/* =====================================================================================
   ROOT APP
===================================================================================== */
function Root() {
  const { toasts, push } = useToasts();
  const { user } = useAuth();
  const [area, setArea] = useState("public"); // public | admin | reception

  useEffect(() => {
    if (!user) { setArea("public"); return; }
    if (user.role === "ADMIN" || user.role === "MANAGER") setArea("admin");
    else if (user.role === "RECEPTION") setArea("reception");
    else setArea("public");
  }, [user]);

  return (
    <div className="dh-root" style={{ background: "var(--charcoal)", minHeight: "100vh" }}>
      <Tokens />
      {area === "public" && <PublicSiteWithRouting push={push} setArea={setArea} />}
      {area === "admin" && user && <AdminApp pushToast={push} exit={() => setArea("public")} />}
      {area === "reception" && user && <ReceptionApp pushToast={push} exit={() => setArea("public")} />}
      <Toast toasts={toasts} />
    </div>
  );
}

// small wrapper so the login page inside PublicSite can flip `area` after auth
function PublicSiteWithRouting({ push, setArea }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user) setArea(user.role === "ADMIN" || user.role === "MANAGER" ? "admin" : "reception");
  }, [user]);
  return <PublicSite pushToast={push} />;
}

export default function DemoHotel() {
  return (
    <DataProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </DataProvider>
  );
}

/* =====================================================================================
   HOW THIS MAPS ONTO A REAL PRODUCTION SYSTEM
   -------------------------------------------------------------------------------------
   This artifact simulates the full flow (public site → booking → reception → admin →
   same shared data) using one in-memory store, since this environment can't run a
   persistent server or a real Postgres database. To turn this into the production
   system described in the brief, you'd move `dataReducer`'s state into:
     - Postgres tables matching section 23 (users, roles, employees, rooms, room_types,
       guests, bookings, payments, services, service_requests, housekeeping_tasks,
       notifications, audit_logs, hotel_settings), with foreign keys as listed.
     - A backend API (Node/Express, or similar) exposing REST/GraphQL routes per resource,
       each with server-side role checks (never trust the frontend `can()` helper alone).
     - Real authentication: bcrypt/argon2-hashed passwords, sessions or JWTs, CSRF
       protection on state-changing routes, and rate limiting on /login.
     - Replacing the `password` field comparisons here (plaintext, demo-only) with a
       hashed lookup on the server.
===================================================================================== */
