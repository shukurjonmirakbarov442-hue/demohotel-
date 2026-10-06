import React, { useState, useMemo, useEffect, useRef, createContext, useContext, useReducer } from "react";
import {
  Hotel, Bed, CalendarDays, Users, Sparkles, Wallet, BarChart3, Settings as SettingsIcon,
  ShieldCheck, LogOut, Menu, X, Search, Plus, Pencil, Trash2, Check, ChevronRight, ChevronLeft,
  MapPin, Phone, Mail, Share2, Star, Wifi, Wind, Tv, Wine, Bath, Coffee,
  Car, Sun, ConciergeBell, ClipboardList, Bell, ClipboardCheck, DoorOpen, DoorClosed, AlertTriangle,
  FileText, Download, Filter, Eye, UserCog, Building2, Lock, User, ArrowRight, Loader2
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend,
} from "recharts";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, isFirebaseConfigured, storage } from "./firebase";

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
      --charcoal:#fffaf8; --charcoal2:#ffffff; --charcoal3:#f4e4e8;
      --cream:#4b1022; --cream2:#712e43; --gold:#8d2140; --gold-soft:#b94d67;
      --gray:#806b73; --line: rgba(92,24,49,0.18);
      --gold-glow: rgba(141,33,64,0.2);
      --wine:#7f2138; --wine-soft:#b33c59; --champagne:#f6dfc0; --ink:#4b1022;
    }
    html{ scroll-behavior:smooth; background:var(--charcoal); }
    body{ margin:0; background:var(--charcoal); }
    button, input, select, textarea{ font-family:'Inter',sans-serif; }
    button{ cursor:pointer; }
    .dh-root{ min-height:100vh; font-family:'Inter',sans-serif; color:var(--cream); background:
      radial-gradient(circle at 82% 0%, rgba(179,60,89,0.14), transparent 30rem),
      radial-gradient(circle at 10% 48%, rgba(127,33,56,0.08), transparent 26rem),
      linear-gradient(135deg,#fffaf8 0%,#ffffff 48%,#f7e9ec 100%); }
    .dh-root::before{ content:""; position:fixed; inset:0; pointer-events:none; z-index:0; opacity:.2; background-image:radial-gradient(rgba(255,255,255,.16) .45px,transparent .45px); background-size:5px 5px; mix-blend-mode:soft-light; }
    .dh-root > *{ position:relative; z-index:1; }
    .dh-root::selection{ background:var(--gold); color:var(--charcoal); }
    .dh-serif{ font-family:'Fraunces',Georgia,serif; letter-spacing:.015em; text-shadow:0 1px 18px rgba(201,160,100,.08); }
    .dh-scroll::-webkit-scrollbar{ width:7px; height:7px; }
    .dh-scroll::-webkit-scrollbar-track{ background:var(--charcoal); }
    .dh-scroll::-webkit-scrollbar-thumb{ background:linear-gradient(var(--gold-soft),var(--gold)); border-radius:4px; }
    .dh-fade{ animation: dhfade .55s cubic-bezier(.22,1,.36,1) both; }
    .dh-root > div:not(.fixed){ animation: dhpage .7s cubic-bezier(.22,1,.36,1) both; }
    .dh-root section{ animation: dhsection .8s cubic-bezier(.22,1,.36,1) both; }
    .dh-root img{ transition:filter .35s ease, transform .7s cubic-bezier(.22,1,.36,1); }
    .dh-root img:hover{ filter:saturate(1.08) contrast(1.03); }
    .dh-root input::placeholder,.dh-root textarea::placeholder{ color:rgba(248,242,232,.35); }
    .dh-root input[type="date"]::-webkit-calendar-picker-indicator{ filter:invert(80%) sepia(23%) saturate(650%); opacity:.8; }
    .dh-root select option{ background:var(--charcoal2); color:var(--cream); }
    @keyframes dhfade{ from{opacity:0; transform:translateY(9px)} to{opacity:1; transform:translateY(0)} }
    @keyframes dhpage{ from{opacity:0} to{opacity:1} }
    @keyframes dhsection{ from{opacity:0; transform:translateY(18px)} to{opacity:1; transform:translateY(0)} }
    @keyframes dhfloat{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes dhpulse{ 0%,100%{box-shadow:0 0 0 0 rgba(196,154,92,0)} 50%{box-shadow:0 0 0 8px rgba(196,154,92,.08)} }
    @keyframes dhmodal{ from{opacity:0; transform:translateY(16px) scale(.98)} to{opacity:1; transform:translateY(0) scale(1)} }
    @keyframes dhshine{ 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
    .dh-root section:nth-of-type(2){ animation-delay:.08s; }
    .dh-root section:nth-of-type(3){ animation-delay:.14s; }
    .dh-root section:nth-of-type(4){ animation-delay:.2s; }
    .dh-root section:nth-of-type(5){ animation-delay:.26s; }
    .dh-root section:nth-of-type(6){ animation-delay:.32s; }
    .dh-root .grid > *{ animation:dhfade .6s cubic-bezier(.22,1,.36,1) both; }
    .dh-root .grid > *:nth-child(2){ animation-delay:.06s; }
    .dh-root .grid > *:nth-child(3){ animation-delay:.12s; }
    .dh-root .grid > *:nth-child(4){ animation-delay:.18s; }
    .dh-root .grid > *:nth-child(5){ animation-delay:.24s; }
    .dh-root .grid > *:nth-child(6){ animation-delay:.3s; }
    @keyframes dhshine{ 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
    .dh-root .rounded-2xl,.dh-root .rounded-3xl{ box-shadow:0 18px 50px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.025); }
    .dh-root .rounded-2xl:hover{ border-color:rgba(234,208,154,.38) !important; transform:translateY(-3px); transition:transform .3s cubic-bezier(.22,1,.36,1), border-color .3s ease, box-shadow .3s ease; box-shadow:0 24px 70px rgba(0,0,0,.3), 0 0 0 1px rgba(201,160,100,.05); }
    .dh-root button:not(:disabled){ transition:transform .2s cubic-bezier(.22,1,.36,1), filter .2s ease, border-color .2s ease, background .2s ease; }
    .dh-root button:not(:disabled):hover{ filter:brightness(1.08); transform:translateY(-2px); }
    .dh-root button:not(:disabled):active{ transform:translateY(0) scale(.97); }
    .dh-root button{ letter-spacing:.015em; }
    .dh-root button[style*="var(--gold)"]{ box-shadow:0 8px 24px rgba(201,160,100,.16), inset 0 1px 0 rgba(255,255,255,.2); }
    .dh-root input,.dh-root select,.dh-root textarea{ transition:border-color .25s ease, box-shadow .25s ease, background .25s ease, transform .25s ease; }
    .dh-root input:focus,.dh-root select:focus,.dh-root textarea:focus{ box-shadow:0 0 0 3px rgba(196,154,92,.12); background:rgba(246,241,231,.08); transform:translateY(-1px); }
    .dh-root header{ animation:dhheader .65s cubic-bezier(.22,1,.36,1) both; box-shadow:0 10px 35px rgba(0,0,0,.18); }
    .dh-root header nav button{ position:relative; }
    .dh-root header nav button::after{ content:""; position:absolute; left:0; right:0; bottom:-8px; height:1px; background:var(--gold); transform:scaleX(0); transform-origin:center; transition:transform .25s ease; }
    .dh-root header nav button:hover::after{ transform:scaleX(1); }
    .dh-root .group:hover img{ transform:scale(1.06); }
    .dh-root h1,.dh-root h2,.dh-root h3{ text-wrap:balance; }
    .dh-root .dh-serif.text-6xl,.dh-root .dh-serif.text-8xl{ text-shadow:0 8px 34px rgba(0,0,0,.42), 0 0 28px rgba(201,160,100,.1); }
    .dh-root .rounded-2xl,.dh-root .rounded-3xl{ backdrop-filter:blur(8px); }
    .dh-root section:nth-of-type(3),.dh-root section:nth-of-type(5){ background:linear-gradient(135deg,rgba(127,33,56,.72),rgba(59,18,29,.96)) !important; }
    .dh-root section:nth-of-type(3) h1,.dh-root section:nth-of-type(3) h2,.dh-root section:nth-of-type(3) h3,.dh-root section:nth-of-type(5) h1,.dh-root section:nth-of-type(5) h2,.dh-root section:nth-of-type(5) h3{ color:#fff !important; }
    .dh-root section:nth-of-type(3) p,.dh-root section:nth-of-type(3) span,.dh-root section:nth-of-type(5) p,.dh-root section:nth-of-type(5) span{ color:rgba(255,255,255,.78) !important; }
    .dh-root section:nth-of-type(3) .dh-serif,.dh-root section:nth-of-type(5) .dh-serif{ color:#f6dfc0 !important; }
    .dh-root section:nth-of-type(2) .rounded-2xl,.dh-root section:nth-of-type(6) .rounded-2xl{ border-color:rgba(212,168,95,.28) !important; }
    .dh-root .dh-service-card{ background:linear-gradient(145deg,rgba(179,60,89,.92),rgba(59,18,29,.98)) !important; border-color:rgba(255,255,255,.25) !important; }
    .dh-root .dh-service-card:hover{ background:linear-gradient(145deg,#b33c59,#5b1d2b) !important; }
    .dh-root .rounded-2xl[style*="var(--charcoal3)"],.dh-root .rounded-3xl[style*="var(--charcoal3)"]{ background:linear-gradient(145deg,#6f2035,#3b121d) !important; }
    .dh-root section:first-of-type h1,.dh-root section:first-of-type p{ color:#fff !important; }
    .dh-root section:first-of-type .rounded-2xl{ background:rgba(75,16,34,.92) !important; border-color:rgba(255,255,255,.3) !important; }
    .dh-root .dh-booking-bar{ background:#fffaf8 !important; border-color:rgba(127,33,56,.24) !important; color:var(--cream) !important; }
    .dh-root .dh-booking-bar label{ color:var(--cream) !important; }
    .dh-root .dh-booking-bar input,.dh-root .dh-booking-bar select{ background:#fff !important; color:var(--cream) !important; border-color:rgba(127,33,56,.18) !important; }
    .dh-root .dh-booking-bar input::placeholder{ color:rgba(75,16,34,.5) !important; }
    .dh-root .dh-service-card,.dh-root .dh-service-card *,.dh-root .dh-service-card:hover,.dh-root .rounded-2xl[style*="var(--charcoal3)"],.dh-root .rounded-3xl[style*="var(--charcoal3)"]{ color:#fff !important; }
    .dh-root .rounded-2xl[style*="var(--charcoal3)"] *, .dh-root .rounded-3xl[style*="var(--charcoal3)"] *{ color:#fff !important; }
    .dh-root header{ background:rgba(127,33,56,.97) !important; border-bottom-color:rgba(255,255,255,.24) !important; }
    .dh-root header button,.dh-root header span,.dh-root header select{ color:#fff !important; }
    .dh-root header select{ background:rgba(255,255,255,.12) !important; border-color:rgba(255,255,255,.3) !important; }
    .dh-root header option{ color:var(--cream); background:#fff; }
    .dh-root header button[style*="var(--gold)"]{ color:#fff !important; }
    .dh-root .dh-service-card::before{ content:""; position:absolute; inset:0; background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.06) 50%,transparent 65%); transform:translateX(-120%); transition:transform .7s ease; pointer-events:none; }
    .dh-root .dh-service-card:hover::before{ transform:translateX(120%); }
    .dh-root .fixed.z-50 > div{ animation:dhmodal .3s cubic-bezier(.22,1,.36,1) both; }
    .dh-root .fixed.z-\[100\] > div{ animation:dhfade .35s cubic-bezier(.22,1,.36,1) both; }
    .dh-root .sticky.top-24{ animation:dhfloat 5s ease-in-out infinite; }
    @keyframes dhheader{ from{opacity:0; transform:translateY(-12px)} to{opacity:1; transform:translateY(0)} }
    @media (prefers-reduced-motion: reduce){
      .dh-root *, .dh-root *::before, .dh-root *::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
    }
    .dh-root .bg-white\\/[0.02],.dh-root .bg-white\\/[0.04]{ backdrop-filter:blur(10px); }
    .dh-services-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1.25rem; }
    .dh-service-card{ position:relative; min-height:142px; overflow:hidden; transition:transform .3s ease, border-color .3s ease, background .3s ease; }
    .dh-service-card::after{ content:""; position:absolute; width:110px; height:110px; right:-48px; bottom:-55px; border:1px solid rgba(224,199,150,.18); border-radius:50%; }
    .dh-service-card:hover{ transform:translateY(-5px); background:linear-gradient(145deg,#29231a,var(--charcoal2)) !important; border-color:rgba(224,199,150,.4) !important; }
    @media(max-width:900px){ .dh-services-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media(max-width:520px){ .dh-services-grid{ grid-template-columns:1fr; } }
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
  USD: { symbol: "$", rate: 1, uzsRate: 12000, suffix: false },
  EUR: { symbol: "€", rate: 0.92, uzsRate: 13200, suffix: false },
  RUB: { symbol: "₽", rate: 92, uzsRate: 130, suffix: false },
  UZS: { symbol: "so'm", rate: 12000, uzsRate: 1, suffix: true },
};
function formatCurrency(amountUSD, code) {
  const c = CURRENCIES[code] || CURRENCIES.USD;
  const val = Math.round(Number(amountUSD || 0) * c.rate);
  const num = val.toLocaleString();
  return c.suffix ? `${num} ${c.symbol}` : `${c.symbol}${num}`;
}
let _adminCurrency = "UZS";
let _publicCurrency = "USD";
const fmtMoney = (n) => formatCurrency(n, _adminCurrency);
const fmtPublicMoney = (n) => formatCurrency(n, _publicCurrency);
const formatUZS = (amountUSD, code = "USD") => {
  const currency = CURRENCIES[code] || CURRENCIES.USD;
  return `${Math.round(Number(amountUSD || 0) * currency.rate * currency.uzsRate).toLocaleString()} so'm`;
};

/* ---- Language: a small i18n dictionary covering the guest-facing public website.
   Admin/Reception stay in English, as is standard for PMS software, but the site a guest
   sees can be switched live from the header. ---- */
const LANGUAGES = { en: "English", uz: "O'zbekcha", ru: "Русский" };
const CURRENCY_LABELS = { USD: "USD ($)", EUR: "EUR (€)", RUB: "RUB (₽)", UZS: "UZS (so'm)" };
const EXTRA_STRINGS = {
  en: { all_rooms: "All rooms", available: "available", fully_booked: "Fully booked", size: "Size", beds: "Beds", max_guests: "Max guests", amenities: "Amenities", back_to_rooms: "Back to rooms", book_now_short: "Book Now", room_number: "Room", interface_language: "Interface language", hotel_information: "Hotel Information", hotel_name: "Hotel name", address: "Address", check_in_time: "Check-in time", check_out_time: "Check-out time", base_currency: "Base currency (used across Admin & Reception)", save_settings: "Save Settings", homepage_hero: "Homepage Hero Slideshow", homepage_hero_hint: "These images rotate on the public homepage hero. Add one or more image URLs.", gallery_photos: "Gallery Photos", gallery_hint: "Shown on the homepage gallery section and the public Gallery page.", security: "Security", current_password: "Current password", new_password: "New password", change_password: "Change Password", add: "Add", no_images: "No images yet — add a URL above.", images_url_note: "Images are added by URL in this demo.", about_us: "ABOUT US", our_story: "Our Story", contact_us: "Contact Us", contact_copy: "Questions about your stay? Reach out and we'll get back to you shortly.", send_message: "Send Message", name: "Name", message: "Message", gallery: "Gallery", guest_website_languages: "Guest Website — Languages & Currencies", choose_guest_options: "Choose which options visitors can pick from the header of the public website.", languages: "Languages", currencies: "Currencies", save_choices: "Save Choices", exchange_rates: "UZS exchange rates", service_order: "Order a service", guest_name: "Guest name", service: "Service", passengers: "Number of passengers", select_service: "Select", order_service: "Order service", passenger_count_error: "Enter a valid number of passengers.", service_request_sent: "Service request sent to reception.", housekeeping_request: "Housekeeping request", task_type: "Task type", send_housekeeping_request: "Send housekeeping request", room_number_required: "Please enter your name and room number.", room_required: "Please enter the room number.", housekeeping_request_sent: "Housekeeping request sent.", payment_confirmed: "Payment confirmed", payment_unconfirmed: "Payment not confirmed", payment_confirmed_toast: "Payment marked as confirmed.", payment_unconfirmed_toast: "Payment marked as not confirmed." },
  uz: { all_rooms: "Barcha xonalar", available: "bo'sh", fully_booked: "Barcha xonalar band", size: "Maydon", beds: "Karavotlar", max_guests: "Maksimal mehmonlar", amenities: "Qulayliklar", back_to_rooms: "Xonalarga qaytish", book_now_short: "Band qilish", room_number: "Xona", interface_language: "Interfeys tili", hotel_information: "Mehmonxona ma'lumotlari", hotel_name: "Mehmonxona nomi", address: "Manzil", check_in_time: "Kelish vaqti", check_out_time: "Ketish vaqti", base_currency: "Asosiy valyuta (Admin va Qabulxona uchun)", save_settings: "Sozlamalarni saqlash", homepage_hero: "Bosh sahifa asosiy slayderi", homepage_hero_hint: "Bu rasmlar bosh sahifadagi asosiy qismda almashadi. Bir yoki bir nechta rasm URL manzilini qo'shing.", gallery_photos: "Galereya rasmlari", gallery_hint: "Bosh sahifa galereyasi va Galereya sahifasida ko'rsatiladi.", security: "Xavfsizlik", current_password: "Joriy parol", new_password: "Yangi parol", change_password: "Parolni o'zgartirish", add: "Qo'shish", no_images: "Hali rasm yo'q — yuqoriga URL qo'shing.", images_url_note: "Bu demo versiyada rasmlar URL orqali qo'shiladi.", about_us: "BIZ HAQIMIZDA", our_story: "Bizning hikoyamiz", contact_us: "Biz bilan bog'laning", contact_copy: "Tashrifingiz haqida savollaringiz bormi? Biz bilan bog'laning.", send_message: "Xabar yuborish", name: "Ism", message: "Xabar", gallery: "Galereya", guest_website_languages: "Mehmonlar sayti — Tillar va valyutalar", choose_guest_options: "Mehmonlar sayt sarlavhasidan tanlay oladigan variantlarni belgilang.", languages: "Tillar", currencies: "Valyutalar", save_choices: "Tanlovlarni saqlash", exchange_rates: "UZS kurslari", service_order: "Xizmatga buyurtma", guest_name: "Mehmon ismi", service: "Xizmat", passengers: "Yo'lovchilar soni", select_service: "Tanlash", order_service: "Buyurtma berish", passenger_count_error: "Yo'lovchilar sonini to'g'ri kiriting.", service_request_sent: "Xizmat so'rovi qabulxonaga yuborildi.", housekeeping_request: "Xonani tozalash so'rovi", task_type: "Vazifa turi", send_housekeeping_request: "Tozalash so'rovini yuborish", room_number_required: "Ism va xona raqamini kiriting.", room_required: "Xona raqamini kiriting.", housekeeping_request_sent: "Tozalash so'rovi yuborildi.", payment_confirmed: "To'lov tasdiqlandi", payment_unconfirmed: "To'lov tasdiqlanmadi", payment_confirmed_toast: "To'lov tasdiqlandi deb belgilandi.", payment_unconfirmed_toast: "To'lov tasdiqlanmadi deb belgilandi." },
  ru: { all_rooms: "Все номера", available: "доступно", fully_booked: "Все номера заняты", size: "Площадь", beds: "Кровати", max_guests: "Максимум гостей", amenities: "Удобства", back_to_rooms: "Назад к номерам", book_now_short: "Забронировать", room_number: "Номер", interface_language: "Язык интерфейса", hotel_information: "Информация об отеле", hotel_name: "Название отеля", address: "Адрес", check_in_time: "Время заезда", check_out_time: "Время выезда", base_currency: "Основная валюта (для Admin и ресепшена)", save_settings: "Сохранить настройки", homepage_hero: "Главный слайдер сайта", homepage_hero_hint: "Эти изображения сменяются на главном экране сайта. Добавьте один или несколько URL изображений.", gallery_photos: "Фотографии галереи", gallery_hint: "Показываются в галерее на главной странице и на странице Галерея.", security: "Безопасность", current_password: "Текущий пароль", new_password: "Новый пароль", change_password: "Изменить пароль", add: "Добавить", no_images: "Изображений пока нет — добавьте URL выше.", images_url_note: "В этой демо-версии изображения добавляются по URL.", about_us: "О НАС", our_story: "Наша история", contact_us: "Свяжитесь с нами", contact_copy: "Есть вопросы о поездке? Напишите нам, и мы скоро ответим.", send_message: "Отправить сообщение", name: "Имя", message: "Сообщение", gallery: "Галерея", guest_website_languages: "Сайт для гостей — Языки и валюты", choose_guest_options: "Выберите варианты, которые посетители смогут менять в шапке сайта.", languages: "Языки", currencies: "Валюты", save_choices: "Сохранить выбор", exchange_rates: "Курсы UZS", service_order: "Заказать услугу", guest_name: "Имя гостя", service: "Услуга", passengers: "Количество пассажиров", select_service: "Выбрать", order_service: "Заказать услугу", passenger_count_error: "Укажите корректное число пассажиров.", service_request_sent: "Запрос на услугу отправлен на ресепшен.", housekeeping_request: "Запрос на уборку", task_type: "Тип задачи", send_housekeeping_request: "Отправить запрос на уборку", room_number_required: "Укажите имя и номер комнаты.", room_required: "Укажите номер комнаты.", housekeeping_request_sent: "Запрос на уборку отправлен.", payment_confirmed: "Платёж подтверждён", payment_unconfirmed: "Платёж не подтверждён", payment_confirmed_toast: "Платёж отмечен как подтверждённый.", payment_unconfirmed_toast: "Платёж отмечен как не подтверждённый." },
};
const PANEL_STRINGS = {
  en: { contact_messages: "Contact messages", no_contact_messages: "No contact messages yet.", new_message: "New", read_message: "Read", mark_message_read: "Mark as read", sent_at: "Received", delete_action: "Delete", confirm_delete_contact_message: "Delete contact message?", contact_message_delete_warning: "This message will be permanently deleted. This cannot be undone.", contact_message_deleted: "Contact message deleted.", contact_message_delete_failed: "Could not delete the contact message. Please try again.", feedback_title: "Feedback & suggestions", feedback_intro: "Share a suggestion or tell us about an issue. Our team will follow up.", feedback_type: "What would you like to share?", suggestion: "Suggestion", complaint: "Complaint", other: "Other", feedback_success: "Thank you. Your feedback has been sent.", feedback_error: "Enter your name, a valid email, phone number, and a message.", hotel_phone: "Call the hotel", map_latitude: "Map latitude", map_longitude: "Map longitude", open_map: "Open in Google Maps", panel_currency: "Display currency" },
  uz: { contact_messages: "Murojaatlar", no_contact_messages: "Hali murojaatlar yo'q.", new_message: "Yangi", read_message: "O'qilgan", mark_message_read: "O'qilgan deb belgilash", sent_at: "Yuborilgan vaqt", delete_action: "O'chirish", confirm_delete_contact_message: "Murojaat o'chirilsinmi?", contact_message_delete_warning: "Bu murojaat butunlay o'chiriladi. Bu amalni bekor qilib bo'lmaydi.", contact_message_deleted: "Murojaat o'chirildi.", contact_message_delete_failed: "Murojaatni o'chirib bo'lmadi. Qayta urinib ko'ring.", feedback_title: "Taklif va e'tirozlar", feedback_intro: "Taklifingizni yoki muammoni bizga yozib qoldiring. Jamoamiz siz bilan bog'lanadi.", feedback_type: "Murojaat turi", suggestion: "Taklif", complaint: "E'tiroz", other: "Boshqa", feedback_success: "Rahmat. Murojaatingiz yuborildi.", feedback_error: "Ism, to'g'ri email, telefon raqami va xabarni kiriting.", hotel_phone: "Mehmonxonaga qo'ng'iroq qilish", map_latitude: "Xarita kengligi (latitude)", map_longitude: "Xarita uzunligi (longitude)", open_map: "Google Maps’da ochish", panel_currency: "Ko‘rsatish valyutasi" },
  ru: { contact_messages: "Обращения", no_contact_messages: "Обращений пока нет.", new_message: "Новое", read_message: "Прочитано", mark_message_read: "Отметить прочитанным", sent_at: "Получено", delete_action: "Удалить", confirm_delete_contact_message: "Удалить обращение?", contact_message_delete_warning: "Обращение будет удалено без возможности восстановления.", contact_message_deleted: "Обращение удалено.", contact_message_delete_failed: "Не удалось удалить обращение. Попробуйте ещё раз.", feedback_title: "Предложения и жалобы", feedback_intro: "Поделитесь предложением или сообщите о проблеме. Наша команда свяжется с вами.", feedback_type: "Тип обращения", suggestion: "Предложение", complaint: "Жалоба", other: "Другое", feedback_success: "Спасибо. Ваше обращение отправлено.", feedback_error: "Укажите имя, корректный email, номер телефона и сообщение.", hotel_phone: "Позвонить в отель", map_latitude: "Широта для карты", map_longitude: "Долгота для карты", open_map: "Открыть в Google Maps", panel_currency: "Валюта отображения" },
};
const PANEL_COPY = {
  en: {},
  uz: {
    "Total Rooms": "Jami xonalar", "Available": "Bo'sh", "Occupied": "Band", "Today's Revenue": "Bugungi tushum", "Today's Bookings": "Bugungi bandlovlar", "Today's Check-ins": "Bugungi kelishlar", "Today's Check-outs": "Bugungi ketishlar", "Occupancy Rate": "Bandlik darajasi", "Revenue — last 7 days": "So'nggi 7 kun tushumi", "Occupancy by room type": "Xona turi bo'yicha bandlik", "Today's arrivals": "Bugungi kelishlar", "Today's departures": "Bugungi ketishlar", "No arrivals today.": "Bugun keluvchilar yo'q.", "No departures today.": "Bugun ketuvchilar yo'q.", "Room": "Xona",
    "All": "Barchasi", "Add Room": "Xona qo'shish", "Delete room?": "Xona o'chirilsinmi?", "This will permanently remove room": "Bu xona butunlay o'chiriladi", "This cannot be undone.": "Bu amalni bekor qilib bo'lmaydi.", "Cancel": "Bekor qilish", "Delete Room": "Xonani o'chirish", "Edit Room": "Xonani tahrirlash", "Room number": "Xona raqami", "Room type": "Xona turi", "Price override (per night)": "Maxsus narx (bir kecha uchun)", "Photo URL (overrides the room type's default photo)": "Rasm havolasi (xona turidagi standart rasm o'rniga)", "Status": "Holat", "Save Room": "Xonani saqlash", "Room saved.": "Xona saqlandi.", "Room deleted.": "Xona o'chirildi.",
    "Search guest, booking ID, room...": "Mehmon, bandlov raqami yoki xonani qidirish...", "All statuses": "Barcha holatlar", "All payments": "Barcha to'lovlar", "Booking": "Bandlov", "Guest": "Mehmon", "Room": "Xona", "Dates": "Sanalar", "Amount": "Summa", "Payment": "To'lov", "Actions": "Amallar", "No bookings found.": "Bandlov topilmadi.", "View": "Ko'rish", "Edit": "Tahrirlash", "Confirm": "Tasdiqlash", "Check-in": "Ro'yxatdan o'tkazish", "Check-out": "Ro'yxatdan chiqarish", "Cancel booking?": "Bandlov bekor qilinsinmi?", "Delete booking?": "Bandlov o'chirilsinmi?", "Save Changes": "O'zgarishlarni saqlash", "Booking updated.": "Bandlov yangilandi.", "Booking deleted.": "Bandlov o'chirildi.", "Search guests...": "Mehmonlarni qidirish...", "Name": "Ism", "Contact": "Aloqa", "Nationality": "Fuqaroligi", "Bookings": "Bandlovlar", "Total spent": "Jami sarflangan", "No guests found.": "Mehmonlar topilmadi.", "ID / Passport": "ID / Pasport", "Date of birth": "Tug'ilgan sana", "Booking history": "Bandlovlar tarixi", "No bookings yet.": "Hali bandlovlar yo'q.",
    "Pending": "Kutilmoqda", "In progress": "Jarayonda", "Completed": "Bajarildi", "Accepted": "Qabul qilindi", "Cancelled": "Bekor qilindi", "New": "Yangi", "Confirmed": "Tasdiqlangan", "Checked-in": "Mehmonxonada", "Checked-out": "Chiqib ketgan", "No-show": "Kelmagan", "Paid": "To'langan", "Partially paid": "Qisman to'langan", "Refunded": "Qaytarilgan", "AVAILABLE": "Bo'sh", "OCCUPIED": "Band", "RESERVED": "Band qilingan", "CLEANING": "Tozalanmoqda", "MAINTENANCE": "Ta'mirda", "OUT OF SERVICE": "Xizmatda emas", "ADMIN": "Administrator", "RECEPTION": "Qabulxona", "MANAGER": "Menejer", "HOUSEKEEPING": "Tozalash xizmati",
    "Total Revenue (paid)": "Jami tushum (to'langan)", "Cancellations": "Bekor qilinganlar", "Active Employees": "Faol xodimlar", "Export CSV": "CSV yuklab olish", "Monthly Revenue": "Oylik tushum", "Booking Status Breakdown": "Bandlov holatlari", "Service Catalog": "Xizmatlar ro'yxati", "Service Requests": "Xizmat so'rovlari", "No service requests.": "Xizmat so'rovlari yo'q.", "Free": "Bepul", "Request updated.": "So'rov yangilandi.", "Name": "Ism", "Username": "Foydalanuvchi nomi", "Role": "Lavozim", "Contact": "Aloqa", "Status": "Holat", "Add Employee": "Xodim qo'shish", "No employees.": "Xodimlar yo'q.", "Full name": "To'liq ism", "Temporary password": "Vaqtinchalik parol", "Save Employee": "Xodimni saqlash", "Employee saved.": "Xodim saqlandi.", "Delete employee?": "Xodim o'chirilsinmi?", "Delete employee": "Xodimni o'chirish", "Employee deleted.": "Xodim o'chirildi.", "Status updated.": "Holat yangilandi.",
    "Search Guest": "Mehmonni qidirish", "Type a guest name...": "Mehmon ismini kiriting...", "No guests found.": "Mehmonlar topilmadi.", "New Booking": "Yangi bandlov", "Check-in": "Kelish", "Check-out": "Ketish", "Today's Arrivals": "Bugungi kelishlar", "Today's Departures": "Bugungi ketishlar", "Pending Bookings": "Kutilayotgan bandlovlar", "Search Guest": "Mehmonni qidirish", "Today's arrivals": "Bugungi kelishlar", "Today's departures": "Bugungi ketishlar", "Create Booking": "Bandlov yaratish", "Guest name is required.": "Mehmon ismini kiriting.", "Passport number is required.": "Pasport raqamini kiriting.", "Check-out must be after check-in.": "Ketish sanasi kelish sanasidan keyin bo'lishi kerak.", "No rooms of this type are available for those dates.": "Bu sanalarda bunday turdagi xona bo'sh emas.", "Full name": "To'liq ism", "Additional phone": "Qo'shimcha telefon", "Passport number": "Pasport raqami", "Email": "Elektron pochta", "Guests": "Mehmonlar", "Payment method": "To'lov turi", "Payment currency": "To'lov valyutasi", "Cash / Naqd": "Naqd", "Card / Karta": "Karta", "Special request": "Maxsus so'rov", "Create Booking": "Bandlov yaratish", "Search Guest": "Mehmonni qidirish", "New Housekeeping Request": "Yangi tozalash so'rovi", "Task type": "Vazifa turi", "Submit Request": "So'rov yuborish", "All Requests": "Barcha so'rovlar", "Assigned": "Biriktirilgan", "Nothing here.": "Hozircha ma'lumot yo'q.", "Housekeeping request sent.": "Tozalash so'rovi yuborildi.", "New Service Request": "Yangi xizmat so'rovi", "Guest name": "Mehmon ismi", "Room number": "Xona raqami", "Quantity": "Miqdor", "Passengers": "Yo'lovchilar", "Service": "Xizmat", "Submit Request": "So'rov yuborish", "Service request created.": "Xizmat so'rovi yaratildi.", "Qty": "Miqdor",
    "No notifications yet.": "Bildirishnomalar yo'q.", "Currency": "Valyuta", "Current password": "Joriy parol", "New password": "Yangi parol", "Change Password": "Parolni o'zgartirish", "Save Settings": "Sozlamalarni saqlash", "Settings saved.": "Sozlamalar saqlandi.", "Change Password": "Parolni o'zgartirish", "Current password": "Joriy parol", "New password": "Yangi parol", "Delete": "O'chirish", "Save": "Saqlash", "Close": "Yopish", "Room Photos": "Xona rasmlari"
  },
  ru: {
    "Total Rooms": "Всего номеров", "Available": "Свободно", "Occupied": "Занято", "Today's Revenue": "Выручка за сегодня", "Today's Bookings": "Бронирования сегодня", "Today's Check-ins": "Заезды сегодня", "Today's Check-outs": "Выезды сегодня", "Occupancy Rate": "Загрузка номеров", "Revenue — last 7 days": "Выручка за последние 7 дней", "Occupancy by room type": "Загрузка по типам номеров", "Today's arrivals": "Заезды сегодня", "Today's departures": "Выезды сегодня", "No arrivals today.": "Сегодня заездов нет.", "No departures today.": "Сегодня выездов нет.",
    "All": "Все", "Add Room": "Добавить номер", "Delete room?": "Удалить номер?", "This cannot be undone.": "Это действие нельзя отменить.", "Cancel": "Отмена", "Delete Room": "Удалить номер", "Edit Room": "Изменить номер", "Room number": "Номер комнаты", "Room type": "Тип номера", "Price override (per night)": "Особая цена (за ночь)", "Photo URL (overrides the room type's default photo)": "Ссылка на фото (вместо стандартного фото номера)", "Status": "Статус", "Save Room": "Сохранить номер", "Room saved.": "Номер сохранён.", "Room deleted.": "Номер удалён.",
    "Search guest, booking ID, room...": "Поиск гостя, бронирования или номера...", "All statuses": "Все статусы", "All payments": "Все платежи", "Booking": "Бронирование", "Guest": "Гость", "Room": "Номер", "Dates": "Даты", "Amount": "Сумма", "Payment": "Оплата", "Actions": "Действия", "No bookings found.": "Бронирования не найдены.", "View": "Просмотр", "Edit": "Изменить", "Confirm": "Подтвердить", "Check-in": "Заезд", "Check-out": "Выезд", "Delete booking?": "Удалить бронирование?", "Save Changes": "Сохранить изменения", "Booking updated.": "Бронирование обновлено.", "Booking deleted.": "Бронирование удалено.", "Search guests...": "Поиск гостей...", "Name": "Имя", "Contact": "Контакт", "Nationality": "Гражданство", "Bookings": "Бронирования", "Total spent": "Всего потрачено", "No guests found.": "Гости не найдены.", "ID / Passport": "ID / Паспорт", "Date of birth": "Дата рождения", "Booking history": "История бронирований", "No bookings yet.": "Бронирований пока нет.",
    "Pending": "Ожидает", "In progress": "В процессе", "Completed": "Завершено", "Accepted": "Принято", "Cancelled": "Отменено", "New": "Новое", "Confirmed": "Подтверждено", "Checked-in": "Заселён", "Checked-out": "Выселен", "No-show": "Не заехал", "Paid": "Оплачено", "Partially paid": "Частично оплачено", "Refunded": "Возвращено", "AVAILABLE": "Свободен", "OCCUPIED": "Занят", "RESERVED": "Забронирован", "CLEANING": "Уборка", "MAINTENANCE": "На ремонте", "OUT OF SERVICE": "Не обслуживается", "ADMIN": "Администратор", "RECEPTION": "Ресепшен", "MANAGER": "Менеджер", "HOUSEKEEPING": "Уборка",
    "Total Revenue (paid)": "Общая выручка (оплачено)", "Cancellations": "Отмены", "Active Employees": "Активные сотрудники", "Export CSV": "Экспорт CSV", "Monthly Revenue": "Выручка по месяцам", "Booking Status Breakdown": "Статусы бронирований", "Service Catalog": "Каталог услуг", "Service Requests": "Запросы услуг", "No service requests.": "Нет запросов услуг.", "Free": "Бесплатно", "Request updated.": "Запрос обновлён.", "Username": "Имя пользователя", "Role": "Роль", "Add Employee": "Добавить сотрудника", "No employees.": "Нет сотрудников.", "Full name": "Полное имя", "Temporary password": "Временный пароль", "Save Employee": "Сохранить сотрудника", "Employee saved.": "Сотрудник сохранён.", "Delete employee?": "Удалить сотрудника?", "Employee deleted.": "Сотрудник удалён.", "Status updated.": "Статус обновлён.",
    "Search Guest": "Поиск гостя", "Type a guest name...": "Введите имя гостя...", "New Booking": "Новое бронирование", "Today's Arrivals": "Заезды сегодня", "Today's Departures": "Выезды сегодня", "Pending Bookings": "Ожидающие бронирования", "Create Booking": "Создать бронирование", "Guest name is required.": "Укажите имя гостя.", "Passport number is required.": "Укажите номер паспорта.", "Check-out must be after check-in.": "Дата выезда должна быть позже даты заезда.", "No rooms of this type are available for those dates.": "На эти даты нет свободных номеров этого типа.", "Additional phone": "Дополнительный телефон", "Passport number": "Номер паспорта", "Email": "Эл. почта", "Guests": "Гости", "Payment method": "Способ оплаты", "Payment currency": "Валюта оплаты", "Cash / Naqd": "Наличные", "Card / Karta": "Карта", "Special request": "Особое пожелание", "New Housekeeping Request": "Новый запрос на уборку", "Task type": "Тип задачи", "Submit Request": "Отправить запрос", "All Requests": "Все запросы", "Assigned": "Назначено", "Nothing here.": "Здесь пока пусто.", "Housekeeping request sent.": "Запрос на уборку отправлен.", "New Service Request": "Новый запрос услуги", "Guest name": "Имя гостя", "Room number": "Номер комнаты", "Quantity": "Количество", "Passengers": "Пассажиры", "Service": "Услуга", "Service request created.": "Запрос услуги создан.", "Qty": "Кол-во",
    "No notifications yet.": "Уведомлений пока нет.", "Currency": "Валюта", "Current password": "Текущий пароль", "New password": "Новый пароль", "Change Password": "Изменить пароль", "Save Settings": "Сохранить настройки", "Settings saved.": "Настройки сохранены.", "Delete": "Удалить", "Save": "Сохранить", "Close": "Закрыть", "Room Photos": "Фотографии номеров"
  }
};
const STRINGS = {
  en: {
    nav_home: "Home", nav_rooms: "Rooms", nav_services: "Services", nav_about: "About", nav_gallery: "Gallery", nav_contact: "Contact",
    book_now: "Book Now", welcome_to: "WELCOME TO", tagline: "Luxury. Comfort. Hospitality.",
    book_your_stay: "Book Your Stay", check_in: "Check-in", check_out: "Check-out",
    guests: "Guests", room_type: "Room type", any_type: "Any type", search_availability: "Search availability",
    featured_rooms: "Featured Rooms", view_all_rooms: "View all rooms", per_night: "per night",
    quick_links: "Quick links", follow: "Follow", staff_login: "Staff Login", all_rights: "All rights reserved.",
    full_name: "Full name", phone: "Phone", additional_phone: "Additional phone", passport: "Passport number", email: "Email", number_guests: "Number of guests", payment_method: "Payment method", payment_currency: "Payment currency", cash: "Cash", card: "Card", confirm_booking: "Confirm Booking", book_stay_intro: "Tell us a little about your trip and we'll hold the room for you.", nights: "nights", accommodations: "ACCOMMODATIONS", experience: "THE EXPERIENCE", quiet_luxury: "A quiet kind of luxury", experience_copy: "Every detail at Demo Hotel is considered — from the weight of the linens to the hush of the hallways. We built a place where the city slows down the moment you walk through the door.", rooms_suites: "Rooms & suites", years_hosting: "Years hosting guests", concierge: "Concierge service", guest_rating: "Average guest rating", services_title: "Everything, arranged", gallery_title: "A glimpse inside", location: "LOCATION", location_title: "Right where you want to be", guest_reviews: "GUEST REVIEWS", reviews_title: "What guests are saying", ready_stay: "Ready for your stay?", reserve_copy: "Check availability and reserve your room in under two minutes.", book_stay: "Book Your Stay", complimentary: "Complimentary",
    dashboard: "Dashboard", rooms: "Rooms", bookings: "Bookings", guests_nav: "Guests", housekeeping: "Housekeeping", services_nav: "Services", employees: "Employees", reports: "Reports", audit: "Audit Log", settings: "Settings", admin_panel: "Admin Panel", reception_desk: "Reception Desk", logout: "Log out", signed_in_as: "Signed in as",
    service_catalog: "Service Catalog", service_requests: "Service Requests", no_service_requests: "No service requests.", free: "Free",
    request_updated: "Request updated.", status_new: "New", status_accepted: "Accepted", status_in_progress: "In progress", status_completed: "Completed", status_cancelled: "Cancelled",
    hk_full_cleaning: "Full cleaning", hk_bathroom_cleaning: "Bathroom cleaning", hk_towel_replacement: "Towel replacement", hk_bed_linen_replacement: "Bed linen replacement", hk_minibar_refill: "Mini bar refill", hk_inspection: "Inspection",
    hk_move_to_progress: "Move to In progress", hk_move_to_completed: "Move to Completed", hk_task_assigned: "Task assigned.", hk_task_moved_progress: "Task moved to In progress.", hk_task_moved_completed: "Task moved to Completed.", hk_unassigned: "Unassigned", hk_no_tasks: "No housekeeping tasks.",
  },
  uz: {
    nav_home: "Bosh sahifa", nav_rooms: "Xonalar", nav_services: "Xizmatlar", nav_about: "Biz haqimizda", nav_gallery: "Galereya", nav_contact: "Aloqa",
    book_now: "Band qilish", welcome_to: "XUSH KELIBSIZ", tagline: "Hashamat. Qulaylik. Mehmondo'stlik.",
    book_your_stay: "Qolish uchun band qiling", check_in: "Kelish sanasi", check_out: "Ketish sanasi",
    guests: "Mehmonlar", room_type: "Xona turi", any_type: "Har qanday tur", search_availability: "Bo'sh xonalarni qidirish",
    featured_rooms: "Tavsiya etilgan xonalar", view_all_rooms: "Barcha xonalarni ko'rish", per_night: "kecha uchun",
    quick_links: "Tezkor havolalar", follow: "Ijtimoiy tarmoqlar", staff_login: "Xodimlar uchun kirish", all_rights: "Barcha huquqlar himoyalangan.",
    full_name: "To'liq ism", phone: "Telefon", additional_phone: "Qo'shimcha telefon", passport: "Pasport raqami", email: "Email", number_guests: "Mehmonlar soni", payment_method: "To'lov turi", payment_currency: "To'lov valyutasi", cash: "Naqd", card: "Karta", confirm_booking: "Bandlovni tasdiqlash", book_stay_intro: "Safaringiz haqida ma'lumot bering, biz xonani siz uchun band qilamiz.", nights: "kecha", accommodations: "XONALAR", experience: "TAJRIBA", quiet_luxury: "Sokin hashamat", experience_copy: "Demo Hotel mehmonxonamizda har bir detal e'tibor bilan tanlangan. Bu yerda shahar eshikdan kirgan zahoti sekinlashadi.", rooms_suites: "Xonalar va suitlar", years_hosting: "Yillik tajriba", concierge: "Konsyerj xizmati", guest_rating: "Mehmonlar bahosi", services_title: "Barcha xizmatlar", gallery_title: "Ichkaridan ko'rinish", location: "MANZIL", location_title: "Siz istagan joyda", guest_reviews: "MEHMONLAR FIKRI", reviews_title: "Mehmonlar nima deydi", ready_stay: "Tashrifga tayyormisiz?", reserve_copy: "Bo'sh xonani tekshiring va ikki daqiqada band qiling.", book_stay: "Qolish uchun band qiling", complimentary: "Bepul",
    dashboard: "Boshqaruv paneli", rooms: "Xonalar", bookings: "Bandlovlar", guests_nav: "Mehmonlar", housekeeping: "Tozalash", services_nav: "Xizmatlar", employees: "Xodimlar", reports: "Hisobotlar", audit: "Audit jurnali", settings: "Sozlamalar", admin_panel: "Admin paneli", reception_desk: "Qabulxona", logout: "Chiqish", signed_in_as: "Tizimga kirgan:",
    service_catalog: "Xizmatlar katalogi", service_requests: "Xizmat so'rovlari", no_service_requests: "Xizmat so'rovlari yo'q.", free: "Bepul",
    request_updated: "So'rov yangilandi.", status_new: "Yangi", status_accepted: "Qabul qilindi", status_in_progress: "Jarayonda", status_completed: "Bajarildi", status_cancelled: "Bekor qilindi",
    hk_full_cleaning: "To'liq tozalash", hk_bathroom_cleaning: "Hammomni tozalash", hk_towel_replacement: "Sochiqlarni almashtirish", hk_bed_linen_replacement: "Choyshablarni almashtirish", hk_minibar_refill: "Mini-barni to'ldirish", hk_inspection: "Tekshiruv",
    hk_move_to_progress: "Jarayonga o'tkazish", hk_move_to_completed: "Bajarildi deb belgilash", hk_task_assigned: "Vazifa biriktirildi.", hk_task_moved_progress: "Vazifa jarayonga o'tkazildi.", hk_task_moved_completed: "Vazifa bajarildi.", hk_unassigned: "Biriktirilmagan", hk_no_tasks: "Tozalash vazifalari yo'q.",
  },
  ru: {
    nav_home: "Главная", nav_rooms: "Номера", nav_services: "Услуги", nav_about: "О нас", nav_gallery: "Галерея", nav_contact: "Контакты",
    book_now: "Забронировать", welcome_to: "ДОБРО ПОЖАЛОВАТЬ В", tagline: "Роскошь. Комфорт. Гостеприимство.",
    book_your_stay: "Забронировать номер", check_in: "Заезд", check_out: "Выезд",
    guests: "Гости", room_type: "Тип номера", any_type: "Любой тип", search_availability: "Проверить наличие",
    featured_rooms: "Популярные номера", view_all_rooms: "Все номера", per_night: "за ночь",
    quick_links: "Быстрые ссылки", follow: "Мы в соцсетях", staff_login: "Вход для персонала", all_rights: "Все права защищены.",
    full_name: "Полное имя", phone: "Телефон", additional_phone: "Дополнительный телефон", passport: "Номер паспорта", email: "Эл. почта", number_guests: "Количество гостей", payment_method: "Способ оплаты", payment_currency: "Валюта оплаты", cash: "Наличные", card: "Карта", confirm_booking: "Подтвердить бронирование", book_stay_intro: "Расскажите о поездке, и мы забронируем номер для вас.", nights: "ночей", accommodations: "НОМЕРА", experience: "ВПЕЧАТЛЕНИЯ", quiet_luxury: "Тихая роскошь", experience_copy: "В Demo Hotel каждая деталь продумана. Здесь город замедляется сразу после входа.", rooms_suites: "Номера и люксы", years_hosting: "Лет принимаем гостей", concierge: "Услуги консьержа", guest_rating: "Средняя оценка гостей", services_title: "Всё для вашего отдыха", gallery_title: "Взгляд внутрь", location: "РАСПОЛОЖЕНИЕ", location_title: "Там, где вам удобно", guest_reviews: "ОТЗЫВЫ ГОСТЕЙ", reviews_title: "Что говорят гости", ready_stay: "Готовы к поездке?", reserve_copy: "Проверьте наличие и забронируйте номер за две минуты.", book_stay: "Забронировать номер", complimentary: "Бесплатно",
    dashboard: "Панель управления", rooms: "Номера", bookings: "Бронирования", guests_nav: "Гости", housekeeping: "Уборка", services_nav: "Услуги", employees: "Сотрудники", reports: "Отчёты", audit: "Журнал аудита", settings: "Настройки", admin_panel: "Панель администратора", reception_desk: "Ресепшен", logout: "Выйти", signed_in_as: "В системе:",
    service_catalog: "Каталог услуг", service_requests: "Запросы услуг", no_service_requests: "Нет запросов услуг.", free: "Бесплатно",
    request_updated: "Запрос обновлён.", status_new: "Новый", status_accepted: "Принято", status_in_progress: "В процессе", status_completed: "Завершено", status_cancelled: "Отменено",
    hk_full_cleaning: "Полная уборка", hk_bathroom_cleaning: "Уборка ванной", hk_towel_replacement: "Замена полотенец", hk_bed_linen_replacement: "Замена постельного белья", hk_minibar_refill: "Пополнение мини-бара", hk_inspection: "Проверка",
    hk_move_to_progress: "Перевести в работу", hk_move_to_completed: "Отметить выполненным", hk_task_assigned: "Задача назначена.", hk_task_moved_progress: "Задача переведена в работу.", hk_task_moved_completed: "Задача выполнена.", hk_unassigned: "Не назначено", hk_no_tasks: "Нет задач по уборке.",
  },
};
const LangCtx = createContext(null);
const useLang = () => useContext(LangCtx);
function LangProvider({ children, availableLangs }) {
  const [lang, setLang] = useState(() => localStorage.getItem("demo-hotel-language") || availableLangs?.[0] || "en");
  useEffect(() => { localStorage.setItem("demo-hotel-language", lang); }, [lang]);
  useEffect(() => { if (availableLangs && !availableLangs.includes(lang)) setLang(availableLangs[0] || "en"); }, [availableLangs]);
  const t = (key) => STRINGS[lang]?.[key] || EXTRA_STRINGS[lang]?.[key] || PANEL_STRINGS[lang]?.[key] || PANEL_COPY[lang]?.[key] || STRINGS.en[key] || EXTRA_STRINGS.en[key] || PANEL_STRINGS.en[key] || PANEL_COPY.en[key] || key;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}
const PublicCurrencyCtx = createContext(null);
const usePublicCurrency = () => useContext(PublicCurrencyCtx);
function PublicCurrencyProvider({ children, availableCurrencies }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem("demo-hotel-currency") || "USD");
  _publicCurrency = currency;
  useEffect(() => { _publicCurrency = currency; }, [currency]);
  useEffect(() => { localStorage.setItem("demo-hotel-currency", currency); }, [currency]);
  useEffect(() => { if (!Object.keys(CURRENCIES).includes(currency)) setCurrency("USD"); }, [currency]);
  return <PublicCurrencyCtx.Provider value={{ currency, setCurrency }}>{children}</PublicCurrencyCtx.Provider>;
}
const toLocalISODate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayISO = () => toLocalISODate(new Date());
const addDays = (iso, d) => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return toLocalISODate(new Date(year, month - 1, day + d));
};
const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE", "OUT OF SERVICE"];
const BOOKING_STATUSES = ["Pending", "Confirmed", "Checked-in", "Checked-out", "Cancelled", "No-show"];
const PAYMENT_STATUSES = ["Paid", "Pending", "Partially paid", "Refunded"];
const HOUSEKEEPING_TASK_LABELS = {
  "Full cleaning": "hk_full_cleaning",
  "Bathroom cleaning": "hk_bathroom_cleaning",
  "Towel replacement": "hk_towel_replacement",
  "Bed linen replacement": "hk_bed_linen_replacement",
  "Mini bar refill": "hk_minibar_refill",
  Inspection: "hk_inspection",
};
const HOUSEKEEPING_TASK_TYPES = Object.keys(HOUSEKEEPING_TASK_LABELS);

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
const ROOM_LABELS = {
  en: {
    classic: ["Classic Double Room", "A warm, uncluttered room with everything you need for a comfortable stay in the heart of the city."],
    deluxe: ["Deluxe King Room", "Generous proportions, a plush king bed, and a quiet reading corner overlooking the courtyard."],
    family: ["Family Room", "A connected layout built for families, with space to unwind together after a day of exploring."],
    premium: ["Premium Suite", "A separate lounge, deep soaking tub, and skyline views for those who want a little more room to breathe."],
    executive: ["Executive Suite", "The top of the house: a private balcony, dining nook, and personal check-in for guests who expect more."],
  },
  uz: {
    classic: ["Klassik ikki kishilik xona", "Shahar markazida qulay dam olish uchun kerak bo'lgan barcha sharoitlarga ega iliq xona."],
    deluxe: ["Lyuks katta karavotli xona", "Keng xona, yumshoq katta karavot va hovliga qaragan sokin o'qish burchagi."],
    family: ["Oilaviy xona", "Birga dam olish uchun keng va qulay joyga ega oilalar uchun mo'ljallangan xona."],
    premium: ["Yuqori toifadagi lyuks xona", "Alohida mehmonxona, chuqur vanna va shahar manzarasiga ega keng xona."],
    executive: ["Maxsus lyuks xona", "Xususiy balkon, ovqatlanish joyi va alohida ro'yxatdan o'tish xizmatiga ega yuqori toifadagi xona."],
  },
  ru: {
    classic: ["Классический двухместный номер", "Уютный номер со всем необходимым для комфортного отдыха в центре города."],
    deluxe: ["Номер Делюкс с большой кроватью", "Просторный номер с большой кроватью и тихим уголком для чтения с видом на двор."],
    family: ["Семейный номер", "Просторный номер для семейного отдыха после прогулок по городу."],
    premium: ["Люкс повышенной категории", "Отдельная гостиная, глубокая ванна и вид на город для особенно комфортного отдыха."],
    executive: ["Особый люкс", "Балкон, обеденная зона и персональная регистрация для гостей, которые ценят максимум комфорта."],
  },
};
const AMENITY_LABELS = {
  en: { wifi: "Wi-Fi", ac: "Air conditioning", tv: "TV", minibar: "Mini bar", bath: "Bathroom", breakfast: "Breakfast", room_service: "Room service", balcony: "Balcony" },
  uz: { wifi: "Wi-Fi", ac: "Konditsioner", tv: "Televizor", minibar: "Mini bar", bath: "Hammom", breakfast: "Nonushta", room_service: "Xona xizmati", balcony: "Balkon" },
  ru: { wifi: "Wi-Fi", ac: "Кондиционер", tv: "Телевизор", minibar: "Мини-бар", bath: "Ванная", breakfast: "Завтрак", room_service: "Обслуживание номера", balcony: "Балкон" },
};
const SERVICE_LABELS = {
  en: { "Room Service": "Room Service", Breakfast: "Breakfast", Taxi: "Taxi", "Airport Transfer": "Airport Transfer", Laundry: "Laundry", "Extra Bed": "Extra Bed", "Wake-up Call": "Wake-up Call", "Restaurant Reservation": "Restaurant Reservation" },
  uz: { "Room Service": "Xona xizmati", Breakfast: "Nonushta", Taxi: "Taksi", "Airport Transfer": "Aeroport transferi", Laundry: "Kir yuvish", "Extra Bed": "Qo'shimcha karavot", "Wake-up Call": "Uyg'otish qo'ng'irog'i", "Restaurant Reservation": "Restoranda stol band qilish" },
  ru: { "Room Service": "Обслуживание номера", Breakfast: "Завтрак", Taxi: "Такси", "Airport Transfer": "Трансфер из аэропорта", Laundry: "Прачечная", "Extra Bed": "Дополнительная кровать", "Wake-up Call": "Звонок-будильник", "Restaurant Reservation": "Бронирование ресторана" },
};
const roomLabel = (room, lang) => ROOM_LABELS[lang]?.[room.id] || ROOM_LABELS.en[room.id] || [room.name, room.desc];
const roomTypeFor = (room) => ROOM_TYPES.find(type => type.id === room.typeId) || room;
const amenityLabel = (amenity, lang) => AMENITY_LABELS[lang]?.[amenity] || AMENITY_LABEL[amenity];
const serviceLabel = (name, lang) => SERVICE_LABELS[lang]?.[name] || name;
const isPassengerCountService = (service) => {
  const name = String(typeof service === "string" ? service : service?.name || "").trim().toLowerCase();
  return service?.icon === "car" || ["taxi", "taksi", "airport transfer", "aeroport transferi", "трансфер из аэропорта", "такси"].includes(name);
};
const requestHasPassengerCount = (request) => request.quantityType === "passengers" || isPassengerCountService(request.service);
const roomStatusLabel = (status, lang) => {
  const map = {
    en: { AVAILABLE: "Available", OCCUPIED: "Occupied", RESERVED: "Reserved", CLEANING: "Cleaning", MAINTENANCE: "Maintenance", "OUT OF SERVICE": "Out of service" },
    uz: { AVAILABLE: "Bo'sh", OCCUPIED: "Band", RESERVED: "Bandlangan", CLEANING: "Tozalash", MAINTENANCE: "Ta'mirlash", "OUT OF SERVICE": "Xizmatdan tashqari" },
    ru: { AVAILABLE: "Свободно", OCCUPIED: "Занято", RESERVED: "Зарезервировано", CLEANING: "Уборка", MAINTENANCE: "Ремонт", "OUT OF SERVICE": "Не обслуживается" },
  };
  return map[lang]?.[status] || map.en[status] || status;
};
const ROOM_BEDS = {
  en: { classic: "1 Queen bed", deluxe: "1 King bed", family: "1 King bed + 2 single beds", premium: "1 King bed", executive: "1 King bed" },
  uz: { classic: "1 ta ikki kishilik karavot", deluxe: "1 ta katta karavot", family: "1 ta katta karavot + 2 ta bir kishilik karavot", premium: "1 ta katta karavot", executive: "1 ta katta karavot" },
  ru: { classic: "1 двуспальная кровать", deluxe: "1 большая кровать", family: "1 большая кровать + 2 односпальные кровати", premium: "1 большая кровать", executive: "1 большая кровать" },
};
const roomBeds = (room, lang) => ROOM_BEDS[lang]?.[room.id] || room.beds;
const roomCapacity = (room, lang) => lang === "uz" ? `${room.maxGuests} tagacha mehmon` : lang === "ru" ? `до ${room.maxGuests} гостей` : `up to ${room.maxGuests} guests`;

function isRoomAvailableForStay(room, checkIn, checkOut, bookings) {
  if (!room || !checkIn || !checkOut) return room?.status === "AVAILABLE";
  if (room.status !== "AVAILABLE") return false;
  const ci = new Date(checkIn + "T00:00:00");
  const co = new Date(checkOut + "T00:00:00");
  return !bookings.some(b => {
    if (b.roomId !== room.id) return false;
    if (["Cancelled", "No-show", "Checked-out"].includes(b.status)) return false;
    const bIn = new Date(b.checkIn + "T00:00:00");
    const bOut = new Date(b.checkOut + "T00:00:00");
    return ci < bOut && co > bIn;
  });
}

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
  const types = HOUSEKEEPING_TASK_TYPES;
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
    address: "128 Harbor View Avenue, Bay City", latitude: 41.261167, longitude: 69.1635, checkIn: "15:00", checkOut: "11:00", currency: "UZS",
    enabledLanguages: ["en", "uz", "ru"],
    enabledCurrencies: ["USD", "EUR", "RUB", "UZS"],
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
  return { rooms, guests, employees, bookings, housekeeping, services, requests, contactMessages: [], settings, auditLog, notifications: [] };
}

/* ---------------------------------- Permissions ---------------------------------- */
// NOTE: this is a client-side demo. In a real deployment every one of these checks must
// ALSO be enforced on the server for each API route — never trust the frontend alone.
const PERMISSIONS = {
  ADMIN: ["dashboard", "rooms", "bookings", "guests", "contact_messages", "housekeeping", "services", "employees", "reports", "settings", "audit"],
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
    case "HYDRATE": return action.state;
    case "ADD_AUDIT":
      return { ...state, auditLog: [{ id: uid("log_"), time: new Date().toLocaleString(), ...action.entry }, ...state.auditLog].slice(0, 200) };
    case "ADD_NOTIF":
      return { ...state, notifications: [{ id: uid("ntf_"), time: new Date().toLocaleTimeString(), read: false, ...action.notif }, ...state.notifications].slice(0, 50) };
    case "ADD_CONTACT_MESSAGE": return { ...state, contactMessages: [action.message, ...state.contactMessages] };
    case "UPDATE_CONTACT_MESSAGE": return { ...state, contactMessages: state.contactMessages.map(message => message.id === action.id ? { ...message, ...action.patch } : message) };
    case "DELETE_CONTACT_MESSAGE": return { ...state, contactMessages: state.contactMessages.filter(message => message.id !== action.id) };
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
  const [hydrated, setHydrated] = useState(!isFirebaseConfigured);
  const deleteContactMessage = async (id) => {
    if (db) await deleteDoc(doc(db, "contactMessages", String(id)));
    dispatch({ type: "DELETE_CONTACT_MESSAGE", id });
  };

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    const load = async () => {
      try {
        const seed = seedAll();
        const keys = ["rooms", "guests", "employees", "bookings", "housekeeping", "services", "requests", "contactMessages", "auditLog", "notifications"];
        const entries = await Promise.all(keys.map(async key => {
          const snapshot = await getDocs(collection(db, key));
          return [key, snapshot.docs.map(item => item.data())];
        }));
        const stored = Object.fromEntries(entries);
        const hasStoredData = entries.some(([, items]) => items.length > 0);
        if (cancelled) return;
        dispatch({ type: "HYDRATE", state: {
          ...seed,
          ...stored,
          settings: (await getDocs(collection(db, "settings"))).docs[0]?.data() || seed.settings,
        } });
        if (!hasStoredData) await saveStateToFirestore(seed);
      } catch (error) {
        console.error("Firebase data load failed:", error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!db || !hydrated) return;
    saveStateToFirestore(state).catch(error => console.error("Firebase data save failed:", error));
  }, [state, hydrated]);

  return <DataCtx.Provider value={{ state, dispatch, deleteContactMessage }}>{children}</DataCtx.Provider>;
}

const FIRESTORE_COLLECTIONS = ["rooms", "guests", "employees", "bookings", "housekeeping", "services", "requests", "contactMessages", "auditLog", "notifications"];
async function saveStateToFirestore(state) {
  if (!db) return;
  await Promise.all(FIRESTORE_COLLECTIONS.flatMap(key =>
    state[key].map(item => setDoc(doc(db, key, String(item.id)), item))
  ));
  await setDoc(doc(db, "settings", "current"), state.settings);
}

/* ---------------------------------- Small UI primitives ---------------------------------- */
function Badge({ children, tone = "neutral" }) {
  const { t } = useLang();
  const map = {
    neutral: { bg: "rgba(143,137,124,0.18)", fg: "var(--cream)" },
    good: { bg: "rgba(93,138,86,0.22)", fg: "#9fd39a" },
    warn: { bg: "rgba(182,144,90,0.22)", fg: "var(--gold-soft)" },
    bad: { bg: "rgba(178,72,72,0.2)", fg: "#e79a9a" },
    info: { bg: "rgba(90,130,182,0.2)", fg: "#a9c6ec" },
  };
  const c = map[tone] || map.neutral;
  const label = typeof children === "string" ? t(children) : children;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium tracking-wide" style={{ background: c.bg, color: c.fg }}>{label}</span>;
}
const statusTone = (s) => ({
  AVAILABLE: "good", OCCUPIED: "bad", RESERVED: "info", CLEANING: "warn", MAINTENANCE: "warn", "OUT OF SERVICE": "bad",
  Pending: "warn", Confirmed: "info", "Checked-in": "good", "Checked-out": "neutral", Cancelled: "bad", "No-show": "bad",
  Paid: "good", "Partially paid": "warn", Refunded: "neutral",
  New: "info", Accepted: "warn", "In progress": "warn", Completed: "good",
}[s] || "neutral");

function Btn({ children, onClick, variant = "primary", size = "md", className = "", type = "button", disabled }) {
  const { t } = useLang();
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-40";
  const sizes = { sm: "px-3.5 py-1.5 text-sm", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const styles = {
    primary: { background: "var(--gold)", color: "#ffffff" },
    dark: { background: "var(--charcoal)", color: "var(--cream)", border: "1px solid var(--line)" },
    ghost: { background: "transparent", color: "var(--cream)", border: "1px solid var(--line)" },
    danger: { background: "rgba(178,72,72,0.15)", color: "#e79a9a", border: "1px solid rgba(178,72,72,0.3)" },
    subtle: { background: "rgba(246,241,231,0.06)", color: "var(--cream)" },
  };
  const translatedChildren = React.Children.map(children, child => typeof child === "string" ? t(child) : child);
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${className} hover:brightness-110 active:scale-[0.98]`} style={styles[variant]}>
      {translatedChildren}
    </button>
  );
}

function Field({ label, children }) {
  const { t } = useLang();
  return <label className="block">
    <span className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>{typeof label === "string" ? t(label) : label}</span>
    {children}
  </label>;
}
const inputStyle = { background: "rgba(246,241,231,0.05)", border: "1px solid var(--line)", color: "var(--cream)" };
function Input(props) { return <input {...props} className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[var(--gold)] ${props.className || ""}`} style={inputStyle} />; }
function Select(props) {
  const { t } = useLang();
  const options = React.Children.map(props.children, child => {
    if (!React.isValidElement(child) || child.type !== "option" || typeof child.props.children !== "string") return child;
    return React.cloneElement(child, undefined, t(child.props.children));
  });
  return <select {...props} className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[var(--gold)] ${props.className || ""}`} style={inputStyle}>{options}</select>;
}
function TextArea(props) { return <textarea {...props} className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle} />; }

function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  const { t } = useLang();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className={`w-full ${width} rounded-2xl p-6 dh-fade dh-scroll overflow-y-auto max-h-[88vh]`} style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="dh-serif text-xl" style={{ color: "var(--cream)" }}>{typeof title === "string" ? t(title) : title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5"><X size={18} color="var(--gray)" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = ClipboardList, text }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="p-4 rounded-full" style={{ background: "rgba(246,241,231,0.05)" }}><Icon size={26} color="var(--gray)" /></div>
      <p style={{ color: "var(--gray)" }}>{typeof text === "string" ? t(text) : text}</p>
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
  const { t } = useLang();
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
      <div className="p-3 rounded-xl" style={{ background: "rgba(182,144,90,0.14)" }}><Icon size={20} color="var(--gold)" /></div>
      <div>
        <div className="text-2xl dh-serif" style={{ color: "var(--cream)" }}>{value}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--gray)" }}>{typeof label === "string" ? t(label) : label}</div>
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
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem("demo-hotel-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem("demo-hotel-user", JSON.stringify(user));
    } else {
      window.localStorage.removeItem("demo-hotel-user");
    }
  }, [user]);

  return <AuthCtx.Provider value={{ user, setUser }}>{children}</AuthCtx.Provider>;
}

/* =====================================================================================
   PUBLIC WEBSITE
===================================================================================== */
function LangCurrencySwitcher({ compact }) {
  const { state } = useData();
  const { lang, setLang, t } = useLang();
  const { currency, setCurrency } = usePublicCurrency();
  const langs = Object.keys(LANGUAGES);
  const currencies = Object.keys(CURRENCIES);
  const selStyle = { background: "#fff7f8", border: "1px solid rgba(127,33,56,0.22)", color: "var(--cream)" };
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : ""}`}>
      <select value={lang} onChange={e => setLang(e.target.value)} className="rounded-full px-2.5 py-1.5 text-xs outline-none" style={selStyle}>
        {langs.map(l => <option key={l} value={l}>{LANGUAGES[l]}</option>)}
      </select>
      <select value={currency} onChange={e => setCurrency(e.target.value)} className="rounded-full px-2.5 py-1.5 text-xs outline-none" style={selStyle}>
        {currencies.map(c => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
      </select>
    </div>
  );
}

function PublicHeader({ nav, go }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const links = [["nav_home", "home"], ["nav_rooms", "rooms"], ["nav_services", "services"], ["nav_about", "about"], ["nav_gallery", "gallery"], ["nav_contact", "contact"]];
  return (
    <header className="sticky top-0 z-40 backdrop-blur" style={{ background: "rgba(127,33,56,0.97)", borderBottom: "1px solid rgba(255,255,255,0.24)" }}>
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between gap-4">
        <button onClick={() => go("home")} className="flex items-center gap-2 shrink-0">
          <Hotel size={22} color="var(--gold)" />
          <span className="dh-serif text-lg tracking-wide" style={{ color: "var(--cream)" }}>ART AIR</span>
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
            {[Share2, Share2, Share2].map((I, i) => <div key={i} className="p-2 rounded-full" style={{ background: "rgba(246,241,231,0.06)" }}><I size={16} color="var(--gold-soft)" /></div>)}
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
  const { lang } = useLang();
  const [ci, setCi] = useState(todayISO());
  const [co, setCo] = useState(addDays(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const [type, setType] = useState("any");
  return (
    <div className={`dh-booking-bar rounded-2xl p-4 md:p-5 grid md:grid-cols-5 gap-3 items-end ${compact ? "" : "shadow-2xl"}`} style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
      <Field label={t("check_in")}><Input type="date" value={ci} min={todayISO()} onChange={e => setCi(e.target.value)} /></Field>
      <Field label={t("check_out")}><Input type="date" value={co} min={addDays(ci, 1)} onChange={e => setCo(e.target.value)} /></Field>
      <Field label={t("guests")}><Input type="number" min={1} max={8} value={guests} onChange={e => setGuests(+e.target.value)} /></Field>
      <Field label={t("room_type")}>
        <Select value={type} onChange={e => setType(e.target.value)}>
          <option value="any">{t("any_type")}</option>
          {ROOM_TYPES.map(t2 => <option key={t2.id} value={t2.id}>{roomLabel(t2, lang)[0]}</option>)}
        </Select>
      </Field>
      <Btn onClick={() => onSearch({ ci, co, guests, type })} className="w-full"><Search size={16} /> {t("search_availability")}</Btn>
    </div>
  );
}

function RoomCard({ room, onView }) {
  const { t, lang } = useLang();
  const { currency } = usePublicCurrency();
  const roomType = roomTypeFor(room);
  const [roomName] = roomLabel(roomType, lang);
  return (
    <div className="rounded-2xl overflow-hidden group cursor-pointer dh-fade" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }} onClick={() => onView(room)}>
      <div className="h-56 overflow-hidden"><img src={room.img} alt={roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /></div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div><h3 className="dh-serif text-lg" style={{ color: "var(--cream)" }}>{roomName}</h3>{room.number && <div className="text-xs mt-1" style={{ color: "var(--gray)" }}>{t("room_number")} #{room.number}</div>}</div>
          <div className="text-right"><div className="dh-serif text-lg" style={{ color: "var(--gold)" }}>{formatCurrency(room.price, currency)}</div><div className="text-xs" style={{ color: "var(--gray)" }}>{t("per_night")}</div></div>
        </div>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--gray)" }}>{room.size} · {roomBeds(room, lang)} · {roomCapacity(room, lang)}</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {room.amenities.slice(0, 4).map(a => { const I = AMENITY_ICON[a]; return <div key={a} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.06)" }} title={amenityLabel(a, lang)}><I size={13} color="var(--gold-soft)" /></div>; })}
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
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 72% 18%, rgba(196,154,92,0.24), transparent 28%), linear-gradient(135deg, #342a1e 0%, #17140f 48%, #0d0c0a 100%)" }} />
      {list.map((src, idx) => (
        <img key={src + idx} src={src} onError={e => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: idx === i ? 1 : 0 }} alt="" />
      ))}
      {list.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-2 z-10">
          {list.map((_, idx) => <button key={idx} onClick={() => setI(idx)} className="w-2 h-2 rounded-full" style={{ background: idx === i ? "var(--gold)" : "rgba(246,241,231,0.35)" }} />)}
        </div>
      )}
    </>
  );
}

const GUEST_REVIEWS = {
  en: [
    ["Isabelle R.", "The Deluxe King room was quiet, spacious, and the staff remembered our anniversary without being asked."],
    ["Marcus T.", "Best stay I've had this year. Check-in took two minutes and the room was exactly as pictured."],
    ["Amara K.", "The rooftop view from the Executive Suite alone is worth the price. Breakfast service was flawless."],
  ],
  uz: [
    ["Isabelle R.", "Deluxe King xonasi tinch va keng edi. Xodimlarimiz eslatmasak ham yubileyimizni eslab qolishdi."],
    ["Marcus T.", "Bu yilgi eng yaxshi hordiq bo'ldi. Ro'yxatdan o'tish ikki daqiqa oldi, xona esa rasmdagidek edi."],
    ["Amara K.", "Executive Suite tomidagi manzara narxiga arziydi. Nonushta xizmati ham a'lo darajada edi."],
  ],
  ru: [
    ["Isabelle R.", "В номере Deluxe King было тихо и просторно, а сотрудники сами вспомнили о нашей годовщине."],
    ["Marcus T.", "Лучшая поездка в этом году. Заселение заняло две минуты, а номер полностью соответствовал фотографиям."],
    ["Amara K.", "Один только вид с крыши Executive Suite стоит своей цены. Завтрак был безупречным."],
  ],
};

function HomePage({ go, viewRoom }) {
  const { state } = useData();
  const { t, lang } = useLang();
  const latitude = Number(state.settings.latitude);
  const longitude = Number(state.settings.longitude);
  const hasCoordinates = state.settings.latitude !== "" && state.settings.longitude !== "" && Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapQuery = hasCoordinates ? `${latitude},${longitude}` : state.settings.address;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const { currency } = usePublicCurrency();
  const featured = state.rooms.filter(room => room.status === "AVAILABLE").slice(0, 3);
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
          </div>
          <QuickBookingBar onSearch={(search) => go("rooms", { search })} />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div><p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("accommodations")}</p><h2 className="dh-serif text-4xl" style={{ color: "var(--cream)" }}>{t("featured_rooms")}</h2></div>
          <button onClick={() => go("rooms")} className="text-sm flex items-center gap-1" style={{ color: "var(--gold)" }}>{t("view_all_rooms")} <ChevronRight size={15} /></button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {featured.map(room => <RoomCard key={room.id} room={room} onView={() => viewRoom(room)} />)}
        </div>
      </section>

      <section className="py-24" style={{ background: "var(--charcoal2)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-14 items-center">
          <img src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1200&auto=format&fit=crop" className="rounded-2xl w-full h-[420px] object-cover" alt="" />
          <div>
            <p className="text-sm tracking-[0.25em] mb-3" style={{ color: "var(--gold-soft)" }}>{t("experience")}</p>
            <h2 className="dh-serif text-4xl mb-5" style={{ color: "var(--cream)" }}>{t("quiet_luxury")}</h2>
            <p className="leading-relaxed mb-6" style={{ color: "var(--gray)" }}>{t("experience_copy")}</p>
            <div className="grid grid-cols-2 gap-5">
              {[ ["48", t("rooms_suites")], ["12", t("years_hosting")], ["24/7", t("concierge")], ["4.8", t("guest_rating")] ].map(([n, l]) => (
                <div key={l}><div className="dh-serif text-3xl" style={{ color: "var(--gold)" }}>{n}</div><div className="text-sm" style={{ color: "var(--gray)" }}>{l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("services_nav")}</p>
        <h2 className="dh-serif text-4xl mb-10" style={{ color: "var(--cream)" }}>{t("services_title")}</h2>
        <div className="dh-services-grid grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {state.services.slice(0, 8).map(s => (
            <div key={s.id} className="dh-service-card rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <ConciergeBell size={20} color="var(--gold)" className="mb-4" />
              <div style={{ color: "#fff" }} className="mb-1">{serviceLabel(s.name, lang)}</div>
              <div className="text-sm" style={{ color: "#fff" }}>{s.price ? formatCurrency(s.price, currency) : t("complimentary")}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-24">
        <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("nav_gallery")}</p>
        <h2 className="dh-serif text-4xl mb-10" style={{ color: "var(--cream)" }}>{t("gallery_title")}</h2>
        <GalleryGrid />
      </section>

      <section className="py-24" style={{ background: "var(--charcoal2)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-sm tracking-[0.25em] mb-3" style={{ color: "var(--gold-soft)" }}>{t("location")}</p>
            <h2 className="dh-serif text-4xl mb-5" style={{ color: "var(--cream)" }}>{t("location_title")}</h2>
            <p className="leading-relaxed mb-4" style={{ color: "var(--gray)" }}>{state.settings.address}</p>
            {hasCoordinates && <p className="text-sm mb-4" style={{ color: "var(--gray)" }}>{latitude}, {longitude}</p>}
            <p className="flex items-center gap-2 text-sm mb-2" style={{ color: "var(--gray)" }}><Phone size={14} /> {state.settings.phone}</p>
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--gray)" }}><Mail size={14} /> {state.settings.email}</p>
          </div>
          <a href={mapHref} target="_blank" rel="noreferrer" aria-label={t("open_map")} className="relative block overflow-hidden rounded-2xl group" style={{ border: "1px solid var(--line)" }}>
            <iframe title={t("location_title")} src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-80 md:h-[400px]" style={{ pointerEvents: "none" }} />
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg" style={{ background: "var(--gold)", color: "#fff" }}><MapPin size={15} />{t("open_map")}</span>
          </a>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 md:px-8 py-24">
        <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("guest_reviews")}</p>
        <h2 className="dh-serif text-4xl mb-10" style={{ color: "var(--cream)" }}>{t("reviews_title")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(GUEST_REVIEWS[lang] || GUEST_REVIEWS.en).map(([name, quote]) => (
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
          <h2 className="dh-serif text-4xl mb-4" style={{ color: "var(--cream)" }}>{t("ready_stay")}</h2>
          <p className="mb-8" style={{ color: "var(--gray)" }}>{t("reserve_copy")}</p>
          <Btn size="lg" onClick={() => go("booking")}>{t("book_stay")} <ArrowRight size={16} /></Btn>
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

function RoomsPage({ go, viewRoom, search }) {
  const { state } = useData();
  const { t, lang } = useLang();
  const [filter, setFilter] = useState("all");
  const searchCriteria = search || null;

  const roomMatchesSearch = (room) => {
    if (!searchCriteria) return true;
    if (searchCriteria.type !== "any" && room.typeId !== searchCriteria.type) return false;
    if (Number(searchCriteria.guests) > 0 && room.maxGuests < Number(searchCriteria.guests)) return false;
    return isRoomAvailableForStay(room, searchCriteria.ci, searchCriteria.co, state.bookings);
  };

  const availByType = useMemo(() => {
    const map = {};
    ROOM_TYPES.forEach(roomType => {
      const count = state.rooms.filter(r => r.typeId === roomType.id && roomMatchesSearch(r)).length;
      map[roomType.id] = count;
    });
    return map;
  }, [state.rooms, state.bookings, searchCriteria, filter]);

  const filteredRooms = useMemo(() => {
    return state.rooms.filter(room => {
      if (filter !== "all" && room.typeId !== filter) return false;
      return roomMatchesSearch(room);
    });
  }, [state.rooms, state.bookings, searchCriteria, filter]);

  const types = (filter === "all" ? ROOM_TYPES : ROOM_TYPES.filter(t => t.id === filter))
    .filter(roomType => !searchCriteria || (availByType[roomType.id] || 0) > 0);

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16">
      <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("accommodations")}</p>
      <h1 className="dh-serif text-5xl mb-8" style={{ color: "var(--cream)" }}>{t("rooms_suites")}</h1>
      <div className="flex gap-2 mb-10 flex-wrap">
        <button onClick={() => setFilter("all")} className="px-4 py-2 rounded-full text-sm" style={{ background: filter === "all" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === "all" ? "#15130f" : "var(--cream)" }}>{t("all_rooms")}</button>
        {ROOM_TYPES.map(roomType => <button key={roomType.id} onClick={() => setFilter(roomType.id)} className="px-4 py-2 rounded-full text-sm" style={{ background: filter === roomType.id ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === roomType.id ? "#15130f" : "var(--cream)" }}>{roomLabel(roomType, lang)[0]}</button>)}
      </div>

      {searchCriteria ? (
        filteredRooms.length === 0 ? (
          <EmptyState text={lang === "uz" ? "Tanlangan sana va mehmonlar soni uchun bo'sh xona yo'q." : lang === "ru" ? "Для выбранных дат и количества гостей свободных номеров нет." : "No rooms are available for the selected dates and guest count."} />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRooms.map(room => {
              const roomType = roomTypeFor(room);
              const label = roomLabel(roomType, lang)[0];
              const roomWord = lang === "uz" ? "Xona" : lang === "ru" ? "Номер" : "Room";
              const viewWord = lang === "uz" ? "Ko'rish" : lang === "ru" ? "Смотреть" : "View";
              const guestWord = lang === "uz" ? "mehmon" : lang === "ru" ? "гостей" : "guests";
              const nightWord = lang === "uz" ? "kecha" : lang === "ru" ? "ночь" : "night";
              return (
                <div key={room.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
                  <img src={room.img || roomType.img} alt={label} className="w-full h-44 object-cover" />
                  <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--gray)" }}>{label}</div>
                      <div className="dh-serif text-2xl" style={{ color: "var(--cream)" }}>{roomWord} #{room.number}</div>
                    </div>
                    <Badge tone={room.status === "AVAILABLE" ? "good" : "bad"}>{roomStatusLabel(room.status, lang)}</Badge>
                  </div>
                  <div className="text-sm mb-3" style={{ color: "var(--gray)" }}>{room.size} · {roomBeds(room, lang)} · {room.maxGuests} {guestWord}</div>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                    <span style={{ color: "var(--gold-soft)" }}>{formatCurrency(room.price, "USD")}/{nightWord}</span>
                    <button onClick={() => viewRoom(room)} className="rounded-full px-3 py-1.5 text-sm" style={{ background: "rgba(182,144,90,0.12)", color: "var(--gold)" }}>{viewWord}</button>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredRooms.length === 0 ? (
        <EmptyState text={lang === "uz" ? "Bu turdagi xonalar mavjud emas." : lang === "ru" ? "Номеров этого типа нет." : "No rooms match the current filter."} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRooms.map(room => (
            <div key={room.id} className="relative">
              <RoomCard room={room} onView={() => viewRoom(room)} />
              <div className="absolute top-3 right-3"><Badge tone={room.status === "AVAILABLE" ? "good" : "bad"}>{roomStatusLabel(room.status, lang)}</Badge></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomDetailPage({ room, go }) {
  const { state } = useData();
  const { t, lang } = useLang();
  const { currency } = usePublicCurrency();
  const roomType = roomTypeFor(room);
  const [roomName, roomDescription] = roomLabel(roomType, lang);
  const [ci, setCi] = useState(todayISO());
  const [co, setCo] = useState(addDays(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const availableCount = room.number
    ? (room.status === "AVAILABLE" ? 1 : 0)
    : state.rooms.filter(r => r.typeId === room.id && r.status === "AVAILABLE").length;
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-14">
      <button onClick={() => go("rooms")} className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--gray)" }}><ChevronLeft size={15} /> {t("back_to_rooms")}</button>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <img src={room.img || roomType.img} className="rounded-2xl h-[420px] w-full object-cover md:col-span-2" alt={roomName} />
      </div>
      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <h1 className="dh-serif text-4xl mb-3" style={{ color: "var(--cream)" }}>{roomName}{room.number && ` · #${room.number}`}</h1>
          <Badge tone={availableCount > 0 ? "good" : "bad"}>{availableCount > 0 ? `${availableCount} ${t("available")}` : t("fully_booked")}</Badge>
          <p className="leading-relaxed my-6" style={{ color: "var(--gray)" }}>{roomDescription}</p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-sm" style={{ color: "var(--cream2)" }}>
            <div><div style={{ color: "var(--gray)" }}>{t("size")}</div>{room.size}</div>
            <div><div style={{ color: "var(--gray)" }}>{t("beds")}</div>{roomBeds(room, lang)}</div>
            <div><div style={{ color: "var(--gray)" }}>{t("max_guests")}</div>{room.maxGuests}</div>
          </div>
          <h3 className="dh-serif text-xl mb-4" style={{ color: "var(--cream)" }}>{t("amenities")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {room.amenities.map(a => { const I = AMENITY_ICON[a]; return <div key={a} className="flex items-center gap-2 text-sm" style={{ color: "var(--gray)" }}><I size={15} color="var(--gold-soft)" /> {amenityLabel(a, lang)}</div>; })}
          </div>
        </div>
        <div className="rounded-2xl p-6 h-fit sticky top-24" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-2xl mb-1" style={{ color: "var(--gold)" }}>{formatCurrency(room.price, currency)} <span className="text-sm" style={{ color: "var(--gray)" }}>/ {t("per_night")}</span></div>
          <div className="flex flex-col gap-3 mt-5">
            <Field label="Check-in"><Input type="date" value={ci} min={todayISO()} onChange={e => setCi(e.target.value)} /></Field>
            <Field label="Check-out"><Input type="date" value={co} min={addDays(ci, 1)} onChange={e => setCo(e.target.value)} /></Field>
            <Field label="Guests"><Input type="number" min={1} max={room.maxGuests} value={guests} onChange={e => setGuests(+e.target.value)} /></Field>
          </div>
          <div className="my-5 pt-5 text-sm flex justify-between" style={{ borderTop: "1px solid var(--line)", color: "var(--gray)" }}>
            <span>{nightsBetween(ci, co)} {t("nights")} × {formatCurrency(room.price, currency)}</span><span style={{ color: "var(--cream)" }}>{formatCurrency(nightsBetween(ci, co) * room.price, currency)}</span>
          </div>
          <Btn className="w-full" onClick={() => go("booking", { roomId: room.number ? room.id : null, roomTypeId: roomType.id, ci, co, guests })}>Book Now</Btn>
        </div>
      </div>
    </div>
  );
}

function BookingPage({ prefill, go, pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
  const { currency } = usePublicCurrency();
  const [form, setForm] = useState({
    name: "", phone: "", alternatePhone: "", passport: "", email: "", guests: prefill?.guests || 2,
    roomId: prefill?.roomId || "", roomTypeId: prefill?.roomTypeId || ROOM_TYPES[0].id, ci: prefill?.ci || todayISO(), co: prefill?.co || addDays(todayISO(), 2), request: "",
    paymentMethod: "cash", paymentCurrency: "USD",
  });
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const nights = nightsBetween(form.ci, form.co);
  const roomType = ROOM_TYPES.find(t => t.id === form.roomTypeId);
  const selectedRoom = form.roomId ? state.rooms.find(room => room.id === form.roomId) : null;
  const nightlyPrice = selectedRoom?.price || roomType.price;
  const total = nights * nightlyPrice;

  const availableRoom = () => state.rooms.find(r => (form.roomId ? r.id === form.roomId : r.typeId === form.roomTypeId) && r.status === "AVAILABLE" &&
    !state.bookings.some(b => b.roomId === r.id && !["Cancelled", "No-show", "Checked-out"].includes(b.status) && form.ci < b.checkOut && form.co > b.checkIn));

  const submit = () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your full name.");
    if (!form.passport.trim()) return setError("Please enter a passport number.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Please enter a valid email address.");
    if (!/^[+\d][\d\s-]{6,}$/.test(form.phone)) return setError("Please enter a valid phone number.");
    if (form.co <= form.ci) return setError("Check-out date must be after check-in date.");
    const room = availableRoom();
    if (!room) return setError("Sorry — no rooms of this type are available for the selected dates.");
    const id = "DH" + (1000 + state.bookings.length + Math.floor(Math.random() * 90));
    const booking = {
      id, guestId: uid("guest_"), guestName: form.name, phone: form.phone, email: form.email,
      alternatePhone: form.alternatePhone, passport: form.passport, paymentMethod: form.paymentMethod,
      paymentCurrency: form.paymentCurrency, amountUZS: Math.round(total * CURRENCIES[form.paymentCurrency].rate * CURRENCIES[form.paymentCurrency].uzsRate),
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
          ["Total", formatCurrency(confirmation.amount, currency)], ["Status", <Badge tone={statusTone(confirmation.status)}>{confirmation.status}</Badge>]].map(([l, v]) => (
            <div key={l}><div style={{ color: "var(--gray)" }} className="text-xs uppercase mb-1">{l}</div><div style={{ color: "var(--cream)" }}>{v}</div></div>
          ))}
        </div>
        <Btn className="mt-10" onClick={() => go("home")}>Back to home</Btn>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="dh-serif text-4xl mb-2" style={{ color: "var(--cream)" }}>{t("book_stay")}</h1>
      <p style={{ color: "var(--gray)" }} className="mb-10">{t("book_stay_intro")}</p>
      {error && <div className="rounded-xl px-4 py-3 mb-6 text-sm" style={{ background: "rgba(178,72,72,0.15)", color: "#e79a9a" }}>{error}</div>}
      <div className="grid md:grid-cols-2 gap-5">
        <Field label={t("full_name")}><Input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Jane Doe" /></Field>
        <Field label={t("phone")}><Input value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+1 555 000 0000" /></Field>
        <Field label={t("additional_phone")}><Input value={form.alternatePhone} onChange={e => upd("alternatePhone", e.target.value)} placeholder="+998 90 000 00 00" /></Field>
        <Field label={t("passport")}><Input value={form.passport} onChange={e => upd("passport", e.target.value)} placeholder="AA1234567" /></Field>
        <Field label={t("email")}><Input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="jane@email.com" /></Field>
        <Field label={t("number_guests")}><Input type="number" min={1} value={form.guests} onChange={e => upd("guests", +e.target.value)} /></Field>
        <Field label={t("room_type")}>
          <Select value={form.roomTypeId} onChange={e => upd("roomTypeId", e.target.value)}>{ROOM_TYPES.map(roomTypeOption => <option key={roomTypeOption.id} value={roomTypeOption.id}>{roomLabel(roomTypeOption, lang)[0]} — {formatCurrency(roomTypeOption.price, currency)}/{t("per_night")}</option>)}</Select>
        </Field>
        <div />
        <Field label="Check-in"><Input type="date" value={form.ci} min={todayISO()} onChange={e => upd("ci", e.target.value)} /></Field>
        <Field label="Check-out"><Input type="date" value={form.co} min={addDays(form.ci, 1)} onChange={e => upd("co", e.target.value)} /></Field>
        <Field label={t("payment_method")}><Select value={form.paymentMethod} onChange={e => upd("paymentMethod", e.target.value)}><option value="cash">{t("cash")}</option><option value="card">{t("card")}</option></Select></Field>
        <Field label={t("payment_currency")}><Select value={form.paymentCurrency} onChange={e => upd("paymentCurrency", e.target.value)}>{Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}</Select></Field>
        <div className="md:col-span-2"><Field label="Special request (optional)"><TextArea rows={3} value={form.request} onChange={e => upd("request", e.target.value)} placeholder="High floor, quiet room, early check-in..." /></Field></div>
      </div>
      <div className="rounded-2xl p-6 mt-8 flex flex-wrap gap-6 justify-between items-center" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="text-sm" style={{ color: "var(--gray)" }}>{nights} {t("nights")} × {formatCurrency(roomType.price, currency)} = <span style={{ color: "var(--cream)" }}>{formatUZS(total, form.paymentCurrency)}</span></div>
        <Btn onClick={submit} size="lg">{t("confirm_booking")}</Btn>
      </div>
    </div>
  );
}

function ServicesPage({ pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
  const { currency } = usePublicCurrency();
  const [serviceForm, setServiceForm] = useState({ guestName: "", roomNumber: "", serviceId: state.services[0]?.id || "", qty: 1 });
  const [housekeepingForm, setHousekeepingForm] = useState({ roomNumber: "", taskType: "Full cleaning" });
  const selectedService = state.services.find(service => service.id === serviceForm.serviceId);
  const needsPassengerCount = isPassengerCountService(selectedService);

  const orderService = () => {
    if (!serviceForm.guestName.trim() || !serviceForm.roomNumber.trim()) {
      pushToast && pushToast(t("room_number_required"));
      return;
    }
    const svc = selectedService || state.services[0];
    if (!svc) return;
    const passengerCount = Number(serviceForm.qty);
    if (needsPassengerCount && (!Number.isInteger(passengerCount) || passengerCount < 1)) {
      pushToast && pushToast(t("passenger_count_error"));
      return;
    }
    dispatch({ type: "ADD_REQUEST", req: { id: uid("req_"), guestName: serviceForm.guestName.trim(), roomNumber: serviceForm.roomNumber.trim(), service: svc.name, qty: needsPassengerCount ? passengerCount : 1, quantityType: needsPassengerCount ? "passengers" : null, price: svc.price, status: "New", created: new Date().toISOString() } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New service request", detail: `${svc.name} · Room ${serviceForm.roomNumber.trim()}` } });
    dispatch({ type: "ADD_AUDIT", entry: { user: "guest", action: `Guest ordered service ${svc.name} for room ${serviceForm.roomNumber.trim()}` } });
    pushToast && pushToast(t("service_request_sent"));
    setServiceForm(f => ({ ...f, guestName: "", roomNumber: "", qty: 1 }));
  };

  const requestHousekeeping = () => {
    if (!housekeepingForm.roomNumber.trim()) {
      pushToast && pushToast(t("room_required"));
      return;
    }
    dispatch({ type: "ADD_HK", task: { id: uid("hk_"), roomId: state.rooms.find(r => r.number === housekeepingForm.roomNumber.trim())?.id || "", roomNumber: housekeepingForm.roomNumber.trim(), taskType: housekeepingForm.taskType, assignedTo: "Unassigned", status: "Pending", created: new Date().toISOString(), started: null, completed: null } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New housekeeping request", detail: `Room ${housekeepingForm.roomNumber.trim()} · ${housekeepingForm.taskType}` } });
    dispatch({ type: "ADD_AUDIT", entry: { user: "guest", action: `Guest requested housekeeping for room ${housekeepingForm.roomNumber.trim()}` } });
    pushToast && pushToast(t("housekeeping_request_sent"));
    setHousekeepingForm({ roomNumber: "", taskType: "Full cleaning" });
  };

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16">
      <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("services_nav")}</p>
      <h1 className="dh-serif text-5xl mb-10" style={{ color: "var(--cream)" }}>{t("services_title")}</h1>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {state.services.map(s => (
          <div key={s.id} className="rounded-2xl p-6 flex flex-col justify-between min-h-[190px]" style={{ background: "linear-gradient(135deg, rgba(127,33,56,0.95), rgba(90,23,41,0.96))", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 12px 30px rgba(76,16,34,0.12)" }}>
            <div>
              <div className="flex justify-center mb-5"><ConciergeBell size={24} color="var(--gold-soft)" /></div>
              <div className="dh-serif text-xl mb-2 text-center" style={{ color: "var(--cream)" }}>{serviceLabel(s.name, lang)}</div>
              <div className="text-sm text-center" style={{ color: "rgba(255,255,255,0.82)" }}>{s.price ? formatCurrency(s.price, currency) : t("complimentary")}</div>
            </div>
            <button onClick={() => setServiceForm(f => ({ ...f, serviceId: s.id }))} className="mt-5 text-sm rounded-full px-3 py-2 w-full" style={{ background: "rgba(246,241,231,0.10)", border: "1px solid rgba(255,255,255,0.2)", color: "var(--cream)" }}>{t("select_service")}</button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-12">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-2xl mb-5" style={{ color: "var(--cream)" }}>{t("service_order")}</div>
          <div className="grid gap-4">
            <Field label={t("guest_name")}><Input value={serviceForm.guestName} onChange={e => setServiceForm(f => ({ ...f, guestName: e.target.value }))} placeholder="John Doe" /></Field>
            <Field label={t("Room number")}><Input value={serviceForm.roomNumber} onChange={e => setServiceForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="204" /></Field>
            <Field label={t("service")}><Select value={serviceForm.serviceId} onChange={e => setServiceForm(f => ({ ...f, serviceId: e.target.value }))}>{state.services.map(s => <option key={s.id} value={s.id}>{serviceLabel(s.name, lang)}</option>)}</Select></Field>
            {needsPassengerCount && <Field label={t("passengers")}><Input type="number" min={1} step={1} value={serviceForm.qty} onChange={e => setServiceForm(f => ({ ...f, qty: e.target.value }))} /></Field>}
            <Btn onClick={orderService}>{t("order_service")}</Btn>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-2xl mb-5" style={{ color: "var(--cream)" }}>{t("housekeeping_request")}</div>
          <div className="grid gap-4">
            <Field label={t("Room number")}><Input value={housekeepingForm.roomNumber} onChange={e => setHousekeepingForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="507" /></Field>
            <Field label={t("task_type")}><Select value={housekeepingForm.taskType} onChange={e => setHousekeepingForm(f => ({ ...f, taskType: e.target.value }))}>{HOUSEKEEPING_TASK_TYPES.map(taskType => <option key={taskType} value={taskType}>{t(HOUSEKEEPING_TASK_LABELS[taskType])}</option>)}</Select></Field>
            <Btn onClick={requestHousekeeping}>{t("send_housekeeping_request")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  const { t, lang } = useLang();
  const copy = {
    en: [
      "Demo Hotel opened its doors twelve years ago with a simple idea: hospitality should feel personal, not performative. Since then we've hosted travelers from over sixty countries across our 48 rooms and suites.",
      "Our team of reception, housekeeping, and concierge staff work from a single shared system, so whether you book online, call the front desk, or walk in — everyone already knows who you are and what you need."
    ],
    uz: [
      "Demo Hotel o'z eshiklarini o'n ikki yil oldin oddiy g'oya bilan ochdi: mehmondo'stlik shaxsiy va samimiy bo'lishi kerak, emaski teatrga o'xshab qilingan bo'lsin. O'shandan beri biz 48 ta xona va suitda oltmishdan ortiq mamlakatdan kelgan mehmonlarni qabul qildik.",
      "Qabulxona, tozalash va konsyerj xodimlarimiz bitta umumiy tizimda ishlaydi. Xoh onlayn buyurtma qilsangiz, xoh qabulxonaga qo'ng'iroq qilsangiz yoki bevosita kelib tashrif buyursangiz — hamma siz haqingizda va sizga nimaga muhtojligingiz haqida biladi."
    ],
    ru: [
      "Demo Hotel открыл свои двери двенадцать лет назад с простой идеей: гостеприимство должно быть личным, а не показным. С тех пор мы приняли путешественников более чем из шестидесяти стран в наших 48 номерах и люксах.",
      "Наша команда ресепшена, уборки и консьержа работает в единой системе, поэтому независимо от того, бронируете ли вы онлайн, звоните на ресепшен или просто заходите — все уже знают, кто вы и что вам нужно."
    ],
  };

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 py-20">
      <p className="text-sm tracking-[0.25em] mb-2" style={{ color: "var(--gold-soft)" }}>{t("about_us")}</p>
      <h1 className="dh-serif text-5xl mb-8" style={{ color: "var(--cream)" }}>{t("our_story")}</h1>
      <p className="leading-relaxed mb-5" style={{ color: "var(--gray)" }}>{copy[lang]?.[0] || copy.en[0]}</p>
      <p className="leading-relaxed" style={{ color: "var(--gray)" }}>{copy[lang]?.[1] || copy.en[1]}</p>
    </div>
  );
}
function GalleryPage() { const { t } = useLang(); return <div className="max-w-7xl mx-auto px-5 md:px-8 py-20"><h1 className="dh-serif text-5xl mb-10" style={{ color: "var(--cream)" }}>{t("gallery")}</h1><GalleryGrid /></div>; }

function ContactPage({ pushToast }) {
  const { t } = useLang();
  const { state, dispatch } = useData();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", category: "suggestion", message: "" });
  const [error, setError] = useState("");
  const submit = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const message = form.message.trim();
    if (!name || !email || !phone || !message || !email.includes("@")) {
      setError(t("feedback_error"));
      return;
    }
    const contactMessage = { id: uid("contact_"), name, email, phone, category: form.category, message, created: new Date().toISOString(), read: false };
    dispatch({ type: "ADD_CONTACT_MESSAGE", message: contactMessage });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New contact message", detail: `${name} · ${email}` } });
    setError("");
    setSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-20">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="text-sm tracking-[0.25em] mb-3" style={{ color: "var(--gold-soft)" }}>{t("contact_us")}</p>
        <h1 className="dh-serif text-5xl mb-4" style={{ color: "var(--cream)" }}>{t("feedback_title")}</h1>
        <p style={{ color: "var(--gray)" }} className="text-lg">{t("feedback_intro")}</p>
      </div>

      {sent ? (
        <div className="rounded-2xl px-6 py-5 max-w-2xl mx-auto text-center" style={{ background: "rgba(182,144,90,0.15)", border: "1px solid rgba(182,144,90,0.28)", color: "var(--gold-soft)" }}>
          {t("feedback_success")}
        </div>
      ) : (
        <div className="rounded-3xl p-6 md:p-8 max-w-3xl mx-auto" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2"><Field label={t("feedback_type")}><Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}><option value="suggestion">{t("suggestion")}</option><option value="complaint">{t("complaint")}</option><option value="other">{t("other")}</option></Select></Field></div>
            <Field label={t("name")}><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("name")} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" /></Field>
            <div className="md:col-span-2"><Field label={t("phone")}><Input type="tel" autoComplete="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998 90 123 45 67" /></Field></div>
            <div className="md:col-span-2"><Field label={t("message")}><TextArea rows={6} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder={t("message")} /></Field></div>
          </div>
          {error && <p role="alert" className="text-sm mt-4" style={{ color: "#b24848" }}>{error}</p>}
          <div className="mt-6 flex justify-center">
            <Btn onClick={submit} size="lg" className="min-w-[220px]">{t("send_message")}</Btn>
          </div>
        </div>
      )}
      {state.settings.phone && (
        <div className="mt-8 text-center">
          <p className="text-sm mb-2" style={{ color: "var(--gray)" }}>{t("hotel_phone")}</p>
          <a href={`tel:${state.settings.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 text-base font-medium" style={{ color: "var(--gold)" }}><Phone size={16} />{state.settings.phone}</a>
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
    const identifier = username.trim();
    const passwordValue = password.trim();
    const emp = state.employees.find(e => {
      const usernameMatch = (e.username || "").trim().toLowerCase() === identifier.toLowerCase();
      const emailMatch = (e.email || "").trim().toLowerCase() === identifier.toLowerCase();
      return (usernameMatch || emailMatch) && e.password === passwordValue;
    });
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
  const [roomSearch, setRoomSearch] = useState(null);
  const go = (key, payload) => {
    if (key === "booking") setBookingPrefill(payload || null);
    if (key === "rooms") setRoomSearch(payload?.search || null);
    setPage(key);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const viewRoom = (t) => { setSelectedRoom(t); setPage("roomDetail"); window.scrollTo(0, 0); };
  return (
    <div>
      <PublicHeader nav={page} go={go} />
      {page === "home" && <HomePage go={go} viewRoom={viewRoom} />}
      {page === "rooms" && <RoomsPage go={go} viewRoom={viewRoom} search={roomSearch} />}
      {page === "roomDetail" && <RoomDetailPage room={selectedRoom} go={go} />}
      {page === "booking" && <BookingPage prefill={bookingPrefill} go={go} pushToast={pushToast} />}
      {page === "services" && <ServicesPage pushToast={pushToast} />}
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
    <PublicCurrencyProvider availableCurrencies={state.settings.enabledCurrencies}>
      <PublicSiteInner pushToast={pushToast} />
    </PublicCurrencyProvider>
  );
}

/* =====================================================================================
   SHARED DASHBOARD SHELL
===================================================================================== */
function DashboardShell({ role, items, active, setActive, children, onExit }) {
  const { user, setUser } = useAuth();
  const { state, dispatch } = useData();
  const { t, lang, setLang } = useLang();
  const [panelCurrency, setPanelCurrency] = useState(() => {
    const savedCurrency = localStorage.getItem("demo-hotel-panel-currency");
    return CURRENCIES[savedCurrency] ? savedCurrency : state.settings.currency || "UZS";
  });
  _adminCurrency = panelCurrency;
  useEffect(() => { localStorage.setItem("demo-hotel-panel-currency", panelCurrency); }, [panelCurrency]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = state.notifications.filter(n => !n.read).length;
  const localizedChildren = React.Children.map(children, child => React.isValidElement(child)
    ? React.cloneElement(child, { panelLang: lang, panelCurrency })
    : child);
  return (
    <div className="min-h-screen flex" style={{ background: "var(--charcoal)" }}>
      <aside className={`fixed lg:static z-40 top-0 left-0 h-full w-64 p-5 flex flex-col transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} style={{ background: "var(--charcoal2)", borderRight: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2 px-2 mb-8"><Hotel size={20} color="var(--gold)" /><span className="dh-serif text-base" style={{ color: "var(--cream)" }}>{state.settings.name}</span></div>
        <div className="text-xs uppercase tracking-wider px-2 mb-3" style={{ color: "var(--gray)" }}>{role === "ADMIN" || role === "MANAGER" ? t("admin_panel") : t("reception_desk")}</div>
        <nav className="flex flex-col gap-1 flex-1 dh-scroll overflow-y-auto">
          {items.map(({ key, label, labelKey, icon: I }) => (
            <button key={key} onClick={() => { setActive(key); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ background: active === key ? "rgba(182,144,90,0.14)" : "transparent", color: active === key ? "var(--gold)" : "var(--cream2)" }}>
              <I size={16} /> {t(labelKey || label)}
            </button>
          ))}
        </nav>
        <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="text-xs mb-2 px-2" style={{ color: "var(--gray)" }}>{t("signed_in_as")} <span style={{ color: "var(--cream)" }}>{user?.name}</span> · {user?.role}</div>
          <button onClick={() => { setUser(null); onExit(); }} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm w-full" style={{ color: "#e79a9a" }}><LogOut size={16} /> {t("logout")}</button>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileOpen(false)} />}
      <div className="flex-1 min-w-0">
        <div className="h-16 flex items-center justify-between px-5 lg:px-8 sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(255,255,255,0.94)", borderBottom: "1px solid rgba(127,33,56,0.2)" }}>
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(true)}><Menu color="var(--cream)" /></button>
          <div className="hidden lg:block dh-serif text-lg" style={{ color: "var(--cream)" }}>{t(items.find(i => i.key === active)?.labelKey || items.find(i => i.key === active)?.label)}</div>
          <div className="flex items-center gap-3">
            <Select value={lang} onChange={e => setLang(e.target.value)} className="!w-auto !py-1.5 text-xs">
              {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </Select>
            <Select aria-label={t("panel_currency")} title={t("panel_currency")} value={panelCurrency} onChange={e => setPanelCurrency(e.target.value)} className="!w-auto !py-1.5 text-xs">
              {Object.keys(CURRENCIES).map(code => <option key={code} value={code}>{code}</option>)}
            </Select>
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
        </div>
        <div className="p-5 lg:p-8 dh-scroll">{localizedChildren}</div>
      </div>
    </div>
  );
}

function DataTable({ columns, rows, renderRow, empty, headerColor = "var(--gray)", headerBackground = "var(--charcoal2)", rowBackground }) {
  const { t } = useLang();
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--line)" }}>
      <table className="w-full text-sm">
        <thead><tr style={{ background: headerBackground }}>{columns.map(c => <th key={c} className="text-left px-4 py-3 font-medium" style={{ color: headerColor }}>{t(c)}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id || i} style={{ borderTop: "1px solid var(--line)", background: rowBackground }} className="hover:bg-white/[0.02]">{renderRow(r)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* =====================================================================================
   ADMIN APP
===================================================================================== */
const ADMIN_NAV = [
  { key: "dashboard", labelKey: "dashboard", icon: BarChart3 },
  { key: "rooms", labelKey: "rooms", icon: Bed },
  { key: "bookings", labelKey: "bookings", icon: CalendarDays },
  { key: "guests", labelKey: "guests_nav", icon: Users },
  { key: "contact_messages", labelKey: "contact_messages", icon: Mail },
  { key: "housekeeping", labelKey: "housekeeping", icon: Sparkles },
  { key: "services", labelKey: "services_nav", icon: ConciergeBell },
  { key: "employees", labelKey: "employees", icon: UserCog },
  { key: "reports", labelKey: "reports", icon: FileText },
  { key: "audit", labelKey: "audit", icon: ClipboardCheck },
  { key: "settings", labelKey: "settings", icon: SettingsIcon },
];

function DashboardHome({ role }) {
  const { state } = useData();
  const { t } = useLang();
  const rooms = state.rooms;
  const counts = ROOM_STATUSES.reduce((a, s) => ({ ...a, [s]: rooms.filter(r => r.status === s).length }), {});
  const todaysBookings = state.bookings.filter(b => b.checkIn === todayISO() || b.created === todayISO());
  const todaysCheckins = state.bookings.filter(b => b.checkIn === todayISO() && ["Pending", "Confirmed"].includes(b.status));
  const todaysCheckouts = state.bookings.filter(b => b.checkOut === todayISO() && b.status === "Checked-in");
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
            <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Revenue — last 7 days")}</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="day" stroke="var(--gray)" fontSize={12} /><YAxis stroke="var(--gray)" fontSize={12} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Line type="monotone" dataKey="revenue" stroke="var(--gold)" strokeWidth={2.5} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
            <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Occupancy by room type")}</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={occByType}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="name" stroke="var(--gray)" fontSize={11} /><YAxis stroke="var(--gray)" fontSize={12} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Bar dataKey="occupied" fill="var(--gold)" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Today's arrivals")}</div>
          {todaysCheckins.length === 0 ? <EmptyState text="No arrivals today." /> : todaysCheckins.map(b => (
            <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>{t("Room")} {b.roomNumber}</span></div>
          ))}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Today's departures")}</div>
          {todaysCheckouts.length === 0 ? <EmptyState text="No departures today." /> : todaysCheckouts.map(b => (
            <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>{t("Room")} {b.roomNumber}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactMessagesPage({ pushToast }) {
  const { state, dispatch, deleteContactMessage } = useData();
  const { lang, t } = useLang();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const messages = [...(state.contactMessages || [])].sort((a, b) => new Date(b.created) - new Date(a.created));
  const dateLocale = { en: "en-US", uz: "uz-UZ", ru: "ru-RU" }[lang] || "en-US";
  const removeMessage = async () => {
    try {
      await deleteContactMessage(confirmDelete.id);
      pushToast(t("contact_message_deleted"));
      setConfirmDelete(null);
    } catch (error) {
      console.error("Contact message deletion failed:", error);
      pushToast(t("contact_message_delete_failed"));
    }
  };
  return (
    <div className="flex flex-col gap-4">
      {!messages.length ? <EmptyState text={t("no_contact_messages")} /> : messages.map(message => (
        <article key={message.id} className="rounded-xl p-5" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="dh-serif text-lg" style={{ color: "var(--cream)" }}>{message.name}</h2>
              <a href={`mailto:${message.email}`} className="text-sm underline" style={{ color: "var(--gold)" }}>{message.email}</a>
              {message.phone && <div><a href={`tel:${message.phone.replace(/[^\d+]/g, "")}`} className="text-sm underline" style={{ color: "var(--gold)" }}>{message.phone}</a></div>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={message.category === "complaint" ? "bad" : "info"}>{t(message.category || "other")}</Badge>
              <Badge tone={message.read ? "neutral" : "warn"}>{message.read ? t("read_message") : t("new_message")}</Badge>
              <time className="text-xs" style={{ color: "var(--gray)" }}>
                {t("sent_at")}: {new Date(message.created).toLocaleString(dateLocale)}
              </time>
              <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(message)}><Trash2 size={14} /> {t("delete_action")}</Btn>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-4" style={{ color: "var(--gray)" }}>{message.message}</p>
          {!message.read && <Btn size="sm" variant="ghost" onClick={() => dispatch({ type: "UPDATE_CONTACT_MESSAGE", id: message.id, patch: { read: true } })}><Check size={14} /> {t("mark_message_read")}</Btn>}
        </article>
      ))}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t("confirm_delete_contact_message")}>
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>{t("contact_message_delete_warning")}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={removeMessage} disabled={!confirmDelete}>{t("delete_action")}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function RoomsAdmin({ readOnly, pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
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
  const del = async () => {
    if (!confirmDel) return;
    if (state.bookings.some(booking => booking.roomId === confirmDel.id)) {
      pushToast(lang === "uz" ? "Bandlovlari bor xonani o'chirib bo'lmaydi." : lang === "ru" ? "Номер с бронированиями нельзя удалить." : "This room cannot be removed because it has bookings.");
      setConfirmDel(null);
      return;
    }
    try {
      if (db) await deleteDoc(doc(db, "rooms", String(confirmDel.id)));
      dispatch({ type: "DELETE_ROOM", id: confirmDel.id });
      dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Deleted room ${confirmDel.number}` } });
      pushToast("Room deleted.");
      setConfirmDel(null);
    } catch (error) {
      console.error("Room deletion failed:", error);
      pushToast("Room could not be deleted.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("all")} className="px-3.5 py-1.5 rounded-full text-xs" style={{ background: filter === "all" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === "all" ? "#15130f" : "var(--cream)" }}>{t("All")} ({state.rooms.length})</button>
          {ROOM_STATUSES.map(s => <button key={s} onClick={() => setFilter(s)} className="px-3.5 py-1.5 rounded-full text-xs" style={{ background: filter === s ? "var(--gold)" : "rgba(246,241,231,0.06)", color: filter === s ? "#15130f" : "var(--cream)" }}>{t(s)} ({state.rooms.filter(r => r.status === s).length})</button>)}
        </div>
        {!readOnly && <Btn onClick={() => setModal("new")}><Plus size={15} /> Add Room</Btn>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map(r => {
          const booking = state.bookings.find(b => b.roomId === r.id && ["Confirmed", "Checked-in"].includes(b.status));
          return (
            <div key={r.id} className="rounded-2xl p-5" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div className="flex justify-between items-start mb-2">
                <div><div className="dh-serif text-xl" style={{ color: "var(--cream)" }}>#{r.number}</div><div className="text-xs" style={{ color: "var(--gray)" }}>{roomLabel(roomTypeFor(r), lang)[0]}</div></div>
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
  const { lang } = useLang();
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
        <Field label="Room type"><Select value={form.typeId} onChange={e => upd("typeId", e.target.value)}>{ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{roomLabel(t, lang)[0]}</option>)}</Select></Field>
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

function BookingsAdmin({ role, pushToast, receptionMode = "all" }) {
  const { state, dispatch } = useData();
  const { t } = useLang();
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [payment, setPayment] = useState("all");
  const [viewB, setViewB] = useState(null); const [editB, setEditB] = useState(null); const [confirmDel, setConfirmDel] = useState(null);
  const canDelete = role === "ADMIN";
  const rows = state.bookings.filter(b =>
    (receptionMode === "check-in"
      ? ["Pending", "Confirmed"].includes(b.status) && b.checkIn <= todayISO()
      : receptionMode === "check-out"
        ? b.status === "Checked-in" && b.checkOut <= todayISO()
        : true) &&
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
  const setPaymentStatusFor = (booking, paymentStatus) => {
    if (booking.paymentStatus === paymentStatus) return;
    dispatch({ type: "UPDATE_BOOKING", id: booking.id, patch: { paymentStatus } });
    dispatch({ type: "ADD_AUDIT", entry: {
      user: role.toLowerCase(),
      action: `${booking.id} payment marked as ${paymentStatus}`,
    } });
    dispatch({ type: "ADD_NOTIF", notif: {
      title: `Payment ${paymentStatus === "Paid" ? "confirmed" : "not confirmed"}`,
      detail: `${booking.guestName} · ${booking.id}`,
    } });
    pushToast(t(paymentStatus === "Paid" ? "payment_confirmed_toast" : "payment_unconfirmed_toast"));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Search guest, booking ID, room...")} className="pl-9" /></div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="!w-auto"><option value="all">All statuses</option>{BOOKING_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
        <Select value={payment} onChange={e => setPayment(e.target.value)} className="!w-auto"><option value="all">All payments</option>{PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}</Select>
      </div>
      <DataTable columns={["Booking", "Guest", "Room", "Dates", "Amount", "Payment", "Status", "Actions"]} rows={rows} empty="No bookings found."
        renderRow={(b) => (<>
          <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{b.id}</td>
          <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{b.guestName}<div className="text-xs" style={{ color: "var(--gray)" }}>{b.phone}</div></td>
          <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>#{b.roomNumber}</td>
          <td className="px-4 py-3 text-xs" style={{ color: "var(--gray)" }}>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}<div>{b.nights} {t("nights")}</div></td>
          <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{fmtMoney(b.amount)}</td>
          <td className="px-4 py-3">
            <div className="flex flex-col items-start gap-2">
              <Badge tone={statusTone(b.paymentStatus)}>{t(b.paymentStatus)}</Badge>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPaymentStatusFor(b, "Paid")}
                  disabled={b.paymentStatus === "Paid"}
                  className="p-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "rgba(93,138,86,0.2)" }}
                  title={t("payment_confirmed")}
                  aria-label={`${t("payment_confirmed")}: ${b.id}`}
                ><Check size={13} color="#4c9b56" /></button>
                {b.paymentStatus !== "Refunded" && <button
                  onClick={() => setPaymentStatusFor(b, "Pending")}
                  disabled={b.paymentStatus === "Pending"}
                  className="p-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "rgba(178,72,72,0.15)" }}
                  title={t("payment_unconfirmed")}
                  aria-label={`${t("payment_unconfirmed")}: ${b.id}`}
                ><X size={13} color="#c34b5e" /></button>}
              </div>
            </div>
          </td>
          <td className="px-4 py-3"><Badge tone={statusTone(b.status)}>{t(b.status)}</Badge></td>
          <td className="px-4 py-3">
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setViewB(b)} className="p-1.5 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }} title={t("View")}><Eye size={13} color="var(--cream)" /></button>
              <button onClick={() => setEditB(b)} className="p-1.5 rounded-lg" style={{ background: "rgba(246,241,231,0.06)" }} title={t("Edit")}><Pencil size={13} color="var(--cream)" /></button>
              {b.status === "Pending" && <button onClick={() => setStatusFor(b, "Confirmed")} className="p-1.5 rounded-lg" style={{ background: "rgba(90,130,182,0.18)" }} title={t("Confirm")}><Check size={13} color="#a9c6ec" /></button>}
              {["Confirmed", "Pending"].includes(b.status) && b.checkIn <= todayISO() && <button onClick={() => setStatusFor(b, "Checked-in")} className="p-1.5 rounded-lg" style={{ background: "rgba(93,138,86,0.2)" }} title={t("Check-in")}><DoorOpen size={13} color="#9fd39a" /></button>}
              {b.status === "Checked-in" && b.checkOut <= todayISO() && <button onClick={() => setStatusFor(b, "Checked-out")} className="p-1.5 rounded-lg" style={{ background: "rgba(182,144,90,0.2)" }} title={t("Check-out")}><DoorClosed size={13} color="var(--gold-soft)" /></button>}
              {! ["Cancelled", "Checked-out"].includes(b.status) && <button onClick={() => setStatusFor(b, "Cancelled")} className="p-1.5 rounded-lg" style={{ background: "rgba(178,72,72,0.15)" }} title={t("Cancel")}><X size={13} color="#e79a9a" /></button>}
              {canDelete && <button onClick={() => setConfirmDel(b)} className="p-1.5 rounded-lg" style={{ background: "rgba(178,72,72,0.15)" }} title="Delete"><Trash2 size={13} color="#e79a9a" /></button>}
            </div>
          </td>
        </>)} />
      <Modal open={!!viewB} onClose={() => setViewB(null)} title={`${t("Booking")} ${viewB?.id}`}>
        {viewB && <div className="grid grid-cols-2 gap-4 text-sm">
          {[["Guest", viewB.guestName], ["Phone", viewB.phone], ["Email", viewB.email], ["Room", `#${viewB.roomNumber} · ${viewB.roomType}`], ["Check-in", fmtDate(viewB.checkIn)], ["Check-out", fmtDate(viewB.checkOut)], ["Guests", viewB.guests], ["Amount", fmtMoney(viewB.amount)], ["Special request", viewB.request || "—"]].map(([l, v]) => (
            <div key={l}><div className="text-xs uppercase" style={{ color: "var(--gray)" }}>{t(l)}</div><div style={{ color: "var(--cream)" }}>{v}</div></div>
          ))}
        </div>}
      </Modal>
      <Modal open={!!editB} onClose={() => setEditB(null)} title={`${t("Edit")} ${t("Booking")} ${editB?.id}`}>
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
  const { t } = useLang();
  const [q, setQ] = useState(""); const [profile, setProfile] = useState(null);
  const rows = state.guests.filter(g => g.name.toLowerCase().includes(q.toLowerCase()) || g.email.toLowerCase().includes(q.toLowerCase()));
  const guestBookings = (id, name) => state.bookings.filter(b => b.guestId === id || b.guestName === name);
  return (
    <div>
      <div className="relative mb-6 max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Search guests...")} className="pl-9" /></div>
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
          <div className="dh-serif text-lg mb-3" style={{ color: "var(--cream)" }}>{t("Booking history")}</div>
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
  const { t } = useLang();
  const staff = state.employees.filter(e => e.role === "HOUSEKEEPING");
  const cols = ["Pending", "In progress", "Completed"];
  const assign = (task, name) => { dispatch({ type: "UPDATE_HK", id: task.id, patch: { assignedTo: name } }); pushToast(t("hk_task_assigned")); };
  const advance = (task) => {
    const next = task.status === "Pending" ? "In progress" : task.status === "In progress" ? "Completed" : "Completed";
    dispatch({ type: "UPDATE_HK", id: task.id, patch: { status: next, completed: next === "Completed" ? new Date().toISOString() : task.completed } });
    if (next === "Completed") { dispatch({ type: "SET_ROOM_STATUS", id: task.roomId, status: "AVAILABLE" }); dispatch({ type: "ADD_NOTIF", notif: { title: "Room cleaning completed", detail: `Room ${task.roomNumber}` } }); }
    pushToast(t(next === "Completed" ? "hk_task_moved_completed" : "hk_task_moved_progress"));
  };
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-5">
        {cols.map(col => {
          const columnTasks = state.housekeeping.filter(task => task.status === col);
          return (
            <div key={col} className="rounded-2xl p-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div className="flex items-center justify-between mb-4"><span className="text-sm" style={{ color: "var(--cream)" }}>{t(col)}</span><Badge>{columnTasks.length}</Badge></div>
              <div className="flex flex-col gap-3 dh-scroll overflow-y-auto max-h-[560px]">
                {columnTasks.map(task => (
                  <div key={task.id} className="rounded-xl p-4" style={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }}>
                    <div className="flex justify-between mb-1"><span className="dh-serif text-base" style={{ color: "var(--cream)" }}>{t("Room")} {task.roomNumber}</span></div>
                    <div className="text-xs mb-2" style={{ color: "var(--gray)" }}>{t(HOUSEKEEPING_TASK_LABELS[task.taskType] || task.taskType)}</div>
                    {role === "ADMIN" ? (
                      <Select value={task.assignedTo} onChange={e => assign(task, e.target.value)} className="!py-1.5 text-xs mb-2">
                        {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </Select>
                    ) : <div className="text-xs mb-2" style={{ color: "var(--gold-soft)" }}>{task.assignedTo || t("hk_unassigned")}</div>}
                    {col !== "Completed" && <Btn size="sm" variant="subtle" onClick={() => advance(task)} className="w-full">{t(col === "Pending" ? "hk_move_to_progress" : "hk_move_to_completed")}</Btn>}
                  </div>
                ))}
                {columnTasks.length === 0 && <p className="text-xs text-center py-6" style={{ color: "var(--gray)" }}>{t("hk_no_tasks")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServicesAdmin({ pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
  const statuses = [
    { value: "New", label: t("status_new") },
    { value: "Accepted", label: t("status_accepted") },
    { value: "In progress", label: t("status_in_progress") },
    { value: "Completed", label: t("status_completed") },
    { value: "Cancelled", label: t("status_cancelled") },
  ];
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("service_catalog")}</div>
        <div className="grid sm:grid-cols-2 gap-4">
          {state.services.map(s => (
            <div key={s.id} className="rounded-xl p-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div style={{ color: "var(--cream)" }}>{serviceLabel(s.name, lang)}</div>
              <div className="text-sm" style={{ color: "var(--gold)" }}>{s.price ? fmtMoney(s.price) : t("free")}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("service_requests")}</div>
        <div className="flex flex-col gap-3">
          {state.requests.length === 0 && <EmptyState text={t("no_service_requests")} />}
          {state.requests.map(r => (
            <div key={r.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
              <div><div style={{ color: "var(--cream)" }}>{serviceLabel(r.service, lang)}{requestHasPassengerCount(r) ? ` · ${r.qty} ${t("Passengers")}` : ""}</div><div className="text-xs" style={{ color: "var(--gray)" }}>{r.guestName} · {t("Room")} {r.roomNumber}</div></div>
              <Select value={r.status} onChange={e => { dispatch({ type: "UPDATE_REQUEST", id: r.id, patch: { status: e.target.value } }); pushToast(t("request_updated")); }} className="!w-auto !py-1.5 text-xs">
                {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
  const { lang, t } = useLang();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const [period, setPeriod] = useState("monthly");
  const [periodLength, setPeriodLength] = useState(1);
  const periodLengths = Array.from({ length: period === "yearly" ? 6 : 36 }, (_, index) => index + 1);
  const locale = { en: "en-US", uz: "uz-UZ", ru: "ru-RU" }[lang] || "en-US";
  const labels = {
    en: { monthly: "Monthly", yearly: "Yearly", monthCount: "Months", yearCount: "Years", paidRevenue: "Paid revenue", expectedRevenue: "Expected revenue", bookings: "Bookings", monthlyRevenue: "Revenue by period", bookingStatus: "Booking status", serviceUsage: "Service usage and revenue", service: "Service", requests: "Requests", completed: "Completed units", revenue: "Revenue", noServices: "No completed service revenue for this period.", exportBookings: "Export bookings", exportServices: "Export services", periodLabel: "Report period" },
    uz: { monthly: "Oylik", yearly: "Yillik", monthCount: "Oy soni", yearCount: "Yil soni", paidRevenue: "To'langan tushum", expectedRevenue: "Kutilayotgan tushum", bookings: "Bandlovlar", monthlyRevenue: "Davr bo'yicha tushum", bookingStatus: "Bandlov holati", serviceUsage: "Xizmatlardan foydalanish va tushum", service: "Xizmat turi", requests: "So'rovlar", completed: "Bajarilgan miqdor", revenue: "Tushum", noServices: "Bu davrda bajarilgan xizmatlar tushumi yo'q.", exportBookings: "Bandlovlarni yuklab olish", exportServices: "Xizmatlar hisobotini yuklab olish", periodLabel: "Hisobot davri" },
    ru: { monthly: "По месяцам", yearly: "По годам", monthCount: "Месяцев", yearCount: "Лет", paidRevenue: "Оплаченная выручка", expectedRevenue: "Ожидаемая выручка", bookings: "Бронирования", monthlyRevenue: "Выручка за период", bookingStatus: "Статусы бронирований", serviceUsage: "Использование услуг и выручка", service: "Услуга", requests: "Запросы", completed: "Выполнено единиц", revenue: "Выручка", noServices: "За этот период нет выручки по выполненным услугам.", exportBookings: "Экспорт бронирований", exportServices: "Экспорт услуг", periodLabel: "Период отчёта" },
  }[lang] || {};
  let start;
  let end;
  let chartRows;
  if (period === "monthly") {
    start = new Date(currentYear, currentMonth - periodLength + 1, 1);
    end = new Date(currentYear, currentMonth, now.getDate() + 1);
    chartRows = Array.from({ length: periodLength }, (_, index) => {
      const date = new Date(currentYear, currentMonth - periodLength + 1 + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(locale, { month: "short", year: "2-digit" }),
        paid: 0,
        expected: 0,
      };
    });
  } else {
    start = new Date(currentYear - periodLength + 1, 0, 1);
    end = new Date(currentYear, currentMonth, now.getDate() + 1);
    chartRows = Array.from({ length: periodLength }, (_, index) => {
      const chartYear = currentYear - periodLength + 1 + index;
      return { key: chartYear, label: String(chartYear), paid: 0, expected: 0 };
    });
  }
  const inRange = (value) => {
    if (!value) return false;
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date >= start && date < end;
  };
  const periodBookings = state.bookings.filter(booking => inRange(booking.checkIn));
  const periodRequests = (state.requests || []).filter(request => inRange(request.created));
  const activeBookings = periodBookings.filter(booking => !["Cancelled", "No-show"].includes(booking.status));
  const paidRevenue = activeBookings.filter(booking => booking.paymentStatus === "Paid").reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  const expectedRevenue = activeBookings.filter(booking => booking.paymentStatus !== "Paid").reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
  activeBookings.forEach(booking => {
    const date = new Date(`${String(booking.checkIn).slice(0, 10)}T00:00:00`);
    const key = period === "monthly" ? `${date.getFullYear()}-${date.getMonth()}` : date.getFullYear();
    const row = chartRows.find(item => item.key === key);
    if (!row) return;
    const amount = Number(booking.amount || 0);
    if (booking.paymentStatus === "Paid") row.paid += amount;
    else row.expected += amount;
  });
  const bookingStats = BOOKING_STATUSES.map(status => ({ name: status, value: periodBookings.filter(booking => booking.status === status).length })).filter(item => item.value > 0);
  const serviceReport = state.services.map(service => {
    const requests = periodRequests.filter(request => request.service === service.name);
    const activeRequests = requests.filter(request => request.status !== "Cancelled");
    const completedRequests = requests.filter(request => request.status === "Completed");
    return {
      id: service.id,
      name: service.name,
      requests: activeRequests.length,
      completed: completedRequests.reduce((sum, request) => sum + (requestHasPassengerCount(request) ? Number(request.qty || 1) : 1), 0),
      revenue: completedRequests.reduce((sum, request) => sum + Number(request.price ?? service.price ?? 0) * (requestHasPassengerCount(request) ? Number(request.qty || 1) : 1), 0),
    };
  });
  const serviceRevenue = serviceReport.filter(service => service.revenue > 0).map(service => ({ name: serviceLabel(service.name, lang), revenue: service.revenue }));
  const colors = ["#b6905a", "#8fbf87", "#a9c6ec", "#8f897c", "#c26b6b", "#d8c19a"];
  const downloadCSV = (filename, rows) => {
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportBookings = () => downloadCSV("bookings-report.csv", [
    ["Booking ID", "Guest", "Room", "Check In", "Check Out", "Amount", "Payment", "Status"],
    ...periodBookings.map(booking => [booking.id, booking.guestName, booking.roomNumber, booking.checkIn, booking.checkOut, booking.amount, booking.paymentStatus, booking.status]),
  ]);
  const exportServices = () => downloadCSV("service-revenue-report.csv", [
    [labels.service, labels.requests, labels.completed, labels.revenue],
    ...serviceReport.map(service => [serviceLabel(service.name, lang), service.requests, service.completed, service.revenue]),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>{labels.periodLabel}</div>
            <div className="inline-flex gap-1 rounded-full p-1" style={{ background: "var(--charcoal3)" }}>
              {[["monthly", labels.monthly], ["yearly", labels.yearly]].map(([value, label]) => <button key={value} onClick={() => { setPeriod(value); setPeriodLength(length => Math.min(length, value === "yearly" ? 6 : 36)); }} className="px-3 py-2 rounded-full text-sm" style={{ background: period === value ? "var(--gold)" : "transparent", color: period === value ? "#fff" : "var(--cream)" }}>{label}</button>)}
            </div>
          </div>
          <Field label={period === "monthly" ? labels.monthCount : labels.yearCount}>
            <Select value={periodLength} onChange={event => setPeriodLength(Number(event.target.value))} className="!w-24">
              {periodLengths.map(value => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={exportBookings}><Download size={15} /> {labels.exportBookings}</Btn>
          <Btn variant="ghost" onClick={exportServices}><Download size={15} /> {labels.exportServices}</Btn>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Wallet} label={labels.paidRevenue} value={fmtMoney(paidRevenue)} />
        <Stat icon={CalendarDays} label={labels.expectedRevenue} value={fmtMoney(expectedRevenue)} />
        <Stat icon={Bed} label={labels.bookings} value={periodBookings.length} />
        <Stat icon={ConciergeBell} label={labels.revenue} value={fmtMoney(serviceReport.reduce((sum, service) => sum + service.revenue, 0))} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{labels.monthlyRevenue}</div>
          <ResponsiveContainer width="100%" height={260}><BarChart data={chartRows}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="label" stroke="var(--gray)" fontSize={12} /><YAxis stroke="var(--gray)" fontSize={12} /><RTooltip formatter={value => fmtMoney(value)} contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Legend wrapperStyle={{ fontSize: 12, color: "var(--gray)" }} /><Bar dataKey="paid" name={labels.paidRevenue} fill="var(--gold)" radius={[4, 4, 0, 0]} /><Bar dataKey="expected" name={labels.expectedRevenue} fill="#8fbf87" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{labels.bookingStatus}</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={bookingStats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>{bookingStats.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Legend wrapperStyle={{ fontSize: 12, color: "var(--gray)" }} /><RTooltip contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <section className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{labels.serviceUsage}</div>
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] gap-6 items-start">
          <DataTable columns={[labels.service, labels.requests, labels.completed, labels.revenue]} rows={serviceReport} empty={labels.noServices} headerColor="#fff" headerBackground="#68283b" rowBackground="#68283b" renderRow={service => (<>
            <td className="px-4 py-3" style={{ color: "#fff" }}>{serviceLabel(service.name, lang)}</td>
            <td className="px-4 py-3" style={{ color: "#fff" }}>{service.requests}</td>
            <td className="px-4 py-3" style={{ color: "#fff" }}>{service.completed}</td>
            <td className="px-4 py-3" style={{ color: "#fff" }}>{fmtMoney(service.revenue)}</td>
          </>)} />
          {serviceRevenue.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={serviceRevenue} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid stroke="var(--line)" horizontal={false} /><XAxis type="number" stroke="var(--gray)" fontSize={11} /><YAxis type="category" dataKey="name" width={100} stroke="var(--gray)" fontSize={11} /><RTooltip formatter={value => fmtMoney(value)} contentStyle={{ background: "var(--charcoal3)", border: "1px solid var(--line)" }} /><Bar dataKey="revenue" name={labels.revenue} fill="var(--gold)" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <EmptyState text={labels.noServices} />}
        </div>
      </section>
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

function ImageListEditor({ title, images, onChange, pushToast, folder }) {
  const { lang } = useLang();
  const fileInputRef = useRef(null);
  const replaceIndexRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const labels = {
    en: { choose: "Choose image", replace: "Replace image", uploading: "Uploading...", hint: "JPG, PNG or WEBP. Maximum size: 5 MB.", empty: "No images yet — choose an image above.", heroDescription: "Choose images for the homepage slideshow.", galleryDescription: "These images appear in the homepage gallery and the Gallery page.", invalid: "Please choose an image file.", tooLarge: "Image must be smaller than 5 MB.", failed: "Image upload failed. Please try again." },
    uz: { choose: "Rasm tanlash", replace: "Rasmni almashtirish", uploading: "Yuklanmoqda...", hint: "JPG, PNG yoki WEBP. Maksimal hajm: 5 MB.", empty: "Hali rasm yo'q — yuqoridan rasm tanlang.", heroDescription: "Bosh sahifa slayderi uchun rasmlarni tanlang.", galleryDescription: "Bu rasmlar bosh sahifa galereyasi va Galereya sahifasida ko'rsatiladi.", invalid: "Rasm faylini tanlang.", tooLarge: "Rasm hajmi 5 MB dan kichik bo'lishi kerak.", failed: "Rasm yuklanmadi. Qayta urinib ko'ring." },
    ru: { choose: "Выбрать изображение", replace: "Заменить изображение", uploading: "Загрузка...", hint: "JPG, PNG или WEBP. Максимальный размер: 5 МБ.", empty: "Изображений пока нет — выберите файл выше.", heroDescription: "Выберите изображения для слайд-шоу на главной странице.", galleryDescription: "Эти изображения показываются в галерее на главной и на странице Галерея.", invalid: "Выберите файл изображения.", tooLarge: "Размер изображения должен быть меньше 5 МБ.", failed: "Не удалось загрузить изображение. Попробуйте ещё раз." },
  }[lang] || {};
  const openFilePicker = (index = null) => {
    replaceIndexRef.current = index;
    fileInputRef.current?.click();
  };
  const addImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      pushToast(labels.invalid);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      pushToast(labels.tooLarge);
      return;
    }
    setUploading(true);
    try {
      let imageUrl;
      if (storage) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await uploadBytes(storageRef(storage, `settings/${folder}/${Date.now()}-${safeName}`), file);
        imageUrl = await getDownloadURL(uploaded.ref);
      } else {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const nextImages = [...images];
      if (replaceIndexRef.current === null) nextImages.push(imageUrl);
      else nextImages[replaceIndexRef.current] = imageUrl;
      onChange(nextImages);
    } catch (error) {
      console.error("Image upload failed:", error);
      pushToast(labels.failed);
    } finally {
      replaceIndexRef.current = null;
      setUploading(false);
    }
  };
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
      <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>{folder === "hero" ? labels.heroDescription : labels.galleryDescription}</p>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={addImage} className="hidden" />
        <Btn onClick={() => openFilePicker()} disabled={uploading}><Plus size={15} /> {uploading ? labels.uploading : labels.choose}</Btn>
        <span className="text-xs" style={{ color: "var(--gray)" }}>{labels.hint}</span>
      </div>
      {images.length === 0 ? <EmptyState text={labels.empty} /> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((src, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden relative group" style={{ border: "1px solid var(--line)" }}>
              <img src={src} className="w-full h-28 object-cover" alt="" />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                <button aria-label={labels.replace} title={labels.replace} onClick={() => openFilePicker(idx)} disabled={uploading} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.15)" }}><Pencil size={13} color="#fff" /></button>
                {idx > 0 && <button onClick={() => move(idx, -1)} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.15)" }}><ChevronLeft size={13} color="#fff" /></button>}
                {idx < images.length - 1 && <button onClick={() => move(idx, 1)} className="p-1.5 rounded-full" style={{ background: "rgba(246,241,231,0.15)" }}><ChevronRight size={13} color="#fff" /></button>}
                <button onClick={() => remove(idx)} className="p-1.5 rounded-full" style={{ background: "rgba(178,72,72,0.5)" }}><Trash2 size={13} color="#fff" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomPhotoSettings({ pushToast }) {
  const { state, dispatch } = useData();
  const { lang } = useLang();
  const [roomId, setRoomId] = useState(state.rooms[0]?.id || "");
  const [deleteRoomId, setDeleteRoomId] = useState("");
  const [newRoom, setNewRoom] = useState({ number: "", typeId: ROOM_TYPES[0].id, price: ROOM_TYPES[0].price });
  const [editRoom, setEditRoom] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const room = state.rooms.find(item => item.id === roomId);
  const deleteRoom = state.rooms.find(item => item.id === deleteRoomId);
  const labels = {
    en: { title: "Room Photos", hint: "Choose a room and upload a photo from your computer. The image will be used on the public room cards and room detail page.", room: "Room", addRoom: "Add room", removeRoom: "Remove room", roomToRemove: "Choose room to remove", selectRoom: "Select a room by number", updateRoom: "Update room", saveChanges: "Save changes", sort: "Sort rooms", number: "Room number", type: "Room type", price: "Price per night", choose: "Choose image file", fileHint: "JPG, PNG or WEBP. Maximum size: 5 MB.", addSuccess: "Room added.", removeSuccess: "Room removed.", updateSuccess: "Room updated.", booked: "This room cannot be removed because it has bookings.", numberRequired: "Enter a room number.", duplicateNumber: "That room number already exists.", invalidPrice: "Enter a price greater than zero.", confirmRemove: "Remove this room?", cancel: "Cancel", deleteFailed: "Room could not be deleted." },
    uz: { title: "Xona rasmlari", hint: "Xonani tanlang va kompyuteringizdan rasm yuklang. Rasm public xona kartalari va xona tafsilotlarida ko'rsatiladi.", room: "Xona", addRoom: "Xona qo'shish", removeRoom: "Xonani o'chirish", roomToRemove: "O'chiriladigan xonani tanlang", selectRoom: "Xonani raqami bo'yicha tanlang", updateRoom: "Xonani yangilash", saveChanges: "O'zgarishlarni saqlash", sort: "Xonalarni saralash", number: "Xona raqami", type: "Xona turi", price: "Bir kecha narxi", choose: "Rasm faylini tanlash", fileHint: "JPG, PNG yoki WEBP. Maksimal hajm: 5 MB.", addSuccess: "Xona qo'shildi.", removeSuccess: "Xona o'chirildi.", updateSuccess: "Xona yangilandi.", booked: "Bu xonani bandlovlari borligi sababli o'chirib bo'lmaydi.", numberRequired: "Xona raqamini kiriting.", duplicateNumber: "Bu xona raqami allaqachon mavjud.", invalidPrice: "Noldan katta narx kiriting.", confirmRemove: "Bu xona o'chirilsinmi?", cancel: "Bekor qilish", deleteFailed: "Xonani o'chirib bo'lmadi." },
    ru: { title: "Фотографии номеров", hint: "Выберите номер и загрузите фотографию с компьютера. Она будет показана в карточке и на странице номера.", room: "Номер", addRoom: "Добавить номер", removeRoom: "Удалить номер", roomToRemove: "Выберите номер для удаления", selectRoom: "Выберите номер комнаты", updateRoom: "Обновить номер", saveChanges: "Сохранить изменения", sort: "Сортировка номеров", number: "Номер комнаты", type: "Тип номера", price: "Цена за ночь", choose: "Выбрать файл изображения", fileHint: "JPG, PNG или WEBP. Максимальный размер: 5 МБ.", addSuccess: "Номер добавлен.", removeSuccess: "Номер удалён.", updateSuccess: "Номер обновлён.", booked: "Номер нельзя удалить, потому что у него есть бронирования.", numberRequired: "Введите номер комнаты.", duplicateNumber: "Этот номер комнаты уже существует.", invalidPrice: "Укажите цену больше нуля.", confirmRemove: "Удалить этот номер?", cancel: "Отмена", deleteFailed: "Не удалось удалить номер." },
  }[lang] || {};
  const sortedRooms = [...state.rooms].sort((a, b) =>
    String(a.number ?? "").localeCompare(String(b.number ?? ""), undefined, { numeric: true })
  );

  useEffect(() => {
    setEditRoom(room ? { number: room.number, typeId: room.typeId, price: room.price ?? roomTypeFor(room).price } : null);
  }, [roomId]);

  const addRoom = () => {
    if (!newRoom.number.trim()) {
      pushToast(labels.numberRequired);
      return;
    }
    if (state.rooms.some(item => item.number.trim().toLowerCase() === newRoom.number.trim().toLowerCase())) {
      pushToast(labels.duplicateNumber);
      return;
    }
    const price = Number(newRoom.price);
    if (!Number.isFinite(price) || price <= 0) {
      pushToast(labels.invalidPrice);
      return;
    }
    const type = ROOM_TYPES.find(item => item.id === newRoom.typeId) || ROOM_TYPES[0];
    const roomToAdd = {
      id: uid("room_"), number: newRoom.number.trim(), typeId: type.id, typeName: type.name,
      price, size: type.size, beds: type.beds,
      maxGuests: type.maxGuests, amenities: type.amenities, img: type.img, desc: type.desc, status: "AVAILABLE",
    };
    dispatch({ type: "UPSERT_ROOM", room: roomToAdd });
    dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Created room ${roomToAdd.number}` } });
    setRoomId(roomToAdd.id);
    setNewRoom({ number: "", typeId: ROOM_TYPES[0].id, price: ROOM_TYPES[0].price });
    pushToast(labels.addSuccess);
  };

  const saveRoomDetails = () => {
    if (!room || !editRoom) return;
    if (!editRoom.number.trim()) {
      pushToast(labels.numberRequired);
      return;
    }
    if (state.rooms.some(item => item.id !== room.id && item.number.trim().toLowerCase() === editRoom.number.trim().toLowerCase())) {
      pushToast(labels.duplicateNumber);
      return;
    }
    const price = Number(editRoom.price);
    if (!Number.isFinite(price) || price <= 0) {
      pushToast(labels.invalidPrice);
      return;
    }
    const type = ROOM_TYPES.find(item => item.id === editRoom.typeId) || ROOM_TYPES[0];
    dispatch({ type: "UPSERT_ROOM", room: {
      ...room, number: editRoom.number.trim(), typeId: type.id, typeName: type.name, price,
      size: type.size, beds: type.beds, maxGuests: type.maxGuests, amenities: type.amenities, desc: type.desc,
    } });
    dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Updated room ${editRoom.number.trim()}` } });
    pushToast(labels.updateSuccess);
  };

  const removeRoom = async () => {
    if (!deleteRoom) return;
    if (state.bookings.some(booking => booking.roomId === deleteRoom.id)) {
      pushToast(labels.booked);
      setConfirmRemove(false);
      return;
    }
    try {
      if (db) await deleteDoc(doc(db, "rooms", String(deleteRoom.id)));
      dispatch({ type: "DELETE_ROOM", id: deleteRoom.id });
      dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Deleted room ${deleteRoom.number}` } });
      if (roomId === deleteRoom.id) setRoomId(state.rooms.find(item => item.id !== deleteRoom.id)?.id || "");
      setDeleteRoomId("");
      setConfirmRemove(false);
      pushToast(labels.removeSuccess);
    } catch (error) {
      console.error("Room deletion failed:", error);
      pushToast(labels.deleteFailed);
    }
  };

  const updatePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file || !room) return;
    if (!file.type.startsWith("image/")) {
      pushToast("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      pushToast("Image must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const updatedRoom = { ...room, img: reader.result };
      dispatch({ type: "UPSERT_ROOM", room: updatedRoom });
      dispatch({ type: "ADD_AUDIT", entry: { user: "admin", action: `Updated photo for room ${room.number}` } });
      pushToast(`Room ${room.number} photo updated.`);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-2xl p-6 lg:col-span-2" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
      <div className="dh-serif text-lg mb-1" style={{ color: "var(--cream)" }}>{labels.title}</div>
      <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>{labels.hint}</p>
      {!state.rooms.length ? <EmptyState text="Add a room before uploading room photos." /> : (
        <div className="grid md:grid-cols-[minmax(0,1fr)_220px] gap-5 items-start">
          <div className="flex flex-col gap-4">
            <Field label={labels.room}>
              <Select value={roomId} onChange={e => setRoomId(e.target.value)}>
                {sortedRooms.map(item => <option key={item.id} value={item.id}>#{item.number} · {roomLabel(roomTypeFor(item), lang)[0]}</option>)}
              </Select>
            </Field>
            {room && editRoom && <>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label={labels.number}><Input value={editRoom.number} onChange={e => setEditRoom(form => ({ ...form, number: e.target.value }))} /></Field>
                <Field label={labels.type}><Select value={editRoom.typeId} onChange={e => { const type = ROOM_TYPES.find(item => item.id === e.target.value) || ROOM_TYPES[0]; setEditRoom(form => ({ ...form, typeId: type.id, price: type.price })); }}>{ROOM_TYPES.map(type => <option key={type.id} value={type.id}>{roomLabel(type, lang)[0]}</option>)}</Select></Field>
                <Field label={labels.price}><Input type="number" min={0} value={editRoom.price} onChange={e => setEditRoom(form => ({ ...form, price: e.target.value }))} /></Field>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Btn size="sm" onClick={saveRoomDetails}>{labels.saveChanges}</Btn>
              </div>
            </>}
            <label className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium cursor-pointer" style={{ background: "var(--gold)", color: "#fff" }}>
              <input type="file" accept="image/*" onChange={updatePhoto} className="hidden" />
              <Plus size={16} /> {labels.choose}
            </label>
            <p className="text-xs" style={{ color: "var(--gray)" }}>{labels.fileHint}</p>
          </div>
          {room && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
              <img src={room.img || roomTypeFor(room).img} alt={`Room ${room.number}`} className="w-full h-36 object-cover" />
              <div className="px-3 py-2 text-sm" style={{ color: "var(--cream)" }}>Room #{room.number}</div>
            </div>
          )}
        </div>
      )}
      <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="text-sm mb-3" style={{ color: "var(--cream)" }}>{labels.addRoom}</div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label={labels.number}><Input value={newRoom.number} onChange={e => setNewRoom(form => ({ ...form, number: e.target.value }))} placeholder="701" /></Field>
          <Field label={labels.type}><Select value={newRoom.typeId} onChange={e => { const type = ROOM_TYPES.find(item => item.id === e.target.value) || ROOM_TYPES[0]; setNewRoom(form => ({ ...form, typeId: type.id, price: type.price })); }}>{ROOM_TYPES.map(type => <option key={type.id} value={type.id}>{roomLabel(type, lang)[0]}</option>)}</Select></Field>
          <Field label={labels.price}><Input type="number" min={0} value={newRoom.price} onChange={e => setNewRoom(form => ({ ...form, price: e.target.value }))} /></Field>
        </div>
        <Btn className="mt-4" onClick={addRoom}><Plus size={15} /> {labels.addRoom}</Btn>
      </div>
      <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="text-sm mb-3" style={{ color: "var(--cream)" }}>{labels.roomToRemove}</div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-full">
            <Field label={labels.number}>
              <Select value={deleteRoomId} onChange={e => setDeleteRoomId(e.target.value)}>
                <option value="">{labels.selectRoom}</option>
                {sortedRooms.map(item => <option key={item.id} value={item.id}>#{item.number} · {roomLabel(roomTypeFor(item), lang)[0]}</option>)}
              </Select>
            </Field>
          </div>
          <Btn variant="ghost" className="shrink-0" disabled={!deleteRoomId} onClick={() => setConfirmRemove(true)}><Trash2 size={14} /> {labels.removeRoom}</Btn>
        </div>
      </div>
      <Modal open={confirmRemove} onClose={() => setConfirmRemove(false)} title={labels.removeRoom}>
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>{labels.confirmRemove} {deleteRoom ? `#${deleteRoom.number}` : ""}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="ghost" onClick={() => setConfirmRemove(false)}>{labels.cancel}</Btn>
          <Btn variant="danger" onClick={removeRoom}><Trash2 size={14} /> {labels.removeRoom}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function SettingsAdmin({ pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang, setLang } = useLang();
  const { user } = useAuth();
  const [form, setForm] = useState(state.settings);
  const [pw, setPw] = useState({ current: "", adminNext: "", receptionNext: "" });
  const securityLabels = {
    en: { current: "Current Admin code", admin: "New Admin code", reception: "New Reception code", changeAdmin: "Change Admin code", changeReception: "Change Reception code", invalid: "Current Admin code is incorrect.", requiredAdmin: "Enter a new Admin code.", requiredReception: "Enter a new Reception code.", missingReception: "Reception account was not found.", adminUpdated: "Admin code updated.", receptionUpdated: "Reception code updated." },
    uz: { current: "Joriy Admin kodi", admin: "Yangi Admin kodi", reception: "Yangi Reception kodi", changeAdmin: "Admin kodini o'zgartirish", changeReception: "Reception kodini o'zgartirish", invalid: "Joriy Admin kodi noto'g'ri.", requiredAdmin: "Yangi Admin kodini kiriting.", requiredReception: "Yangi Reception kodini kiriting.", missingReception: "Reception hisobi topilmadi.", adminUpdated: "Admin kodi yangilandi.", receptionUpdated: "Reception kodi yangilandi." },
    ru: { current: "Текущий код Admin", admin: "Новый код Admin", reception: "Новый код Reception", changeAdmin: "Изменить код Admin", changeReception: "Изменить код Reception", invalid: "Текущий код Admin указан неверно.", requiredAdmin: "Введите новый код Admin.", requiredReception: "Введите новый код Reception.", missingReception: "Учётная запись Reception не найдена.", adminUpdated: "Код Admin обновлён.", receptionUpdated: "Код Reception обновлён." },
  }[lang] || {};
  const adminEmployee = state.employees.find(employee => employee.id === user?.id && employee.role === "ADMIN")
    || state.employees.find(employee => employee.username === user?.username && employee.role === "ADMIN");
  const changeAdminCode = () => {
    if (!adminEmployee || adminEmployee.password !== pw.current) return pushToast(securityLabels.invalid);
    if (!pw.adminNext.trim()) return pushToast(securityLabels.requiredAdmin);
    dispatch({ type: "UPSERT_EMPLOYEE", emp: { ...adminEmployee, password: pw.adminNext.trim() } });
    dispatch({ type: "ADD_AUDIT", entry: { user: adminEmployee.username, action: "Changed Admin access code" } });
    pushToast(securityLabels.adminUpdated);
    setPw({ current: "", adminNext: "", receptionNext: "" });
  };
  const changeReceptionCode = () => {
    if (!adminEmployee || adminEmployee.password !== pw.current) return pushToast(securityLabels.invalid);
    if (!pw.receptionNext.trim()) return pushToast(securityLabels.requiredReception);
    const receptionEmployee = state.employees.find(employee => employee.role === "RECEPTION");
    if (!receptionEmployee) return pushToast(securityLabels.missingReception);
    dispatch({ type: "UPSERT_EMPLOYEE", emp: { ...receptionEmployee, password: pw.receptionNext.trim() } });
    dispatch({ type: "ADD_AUDIT", entry: { user: adminEmployee.username, action: "Changed Reception access code" } });
    pushToast(securityLabels.receptionUpdated);
    setPw({ current: "", adminNext: "", receptionNext: "" });
  };
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-5" style={{ color: "var(--cream)" }}>{t("hotel_information")}</div>
        <div className="flex flex-col gap-4">
          <Field label={t("hotel_name")}><Input value={form.name} onChange={e => upd("name", e.target.value)} /></Field>
          <Field label={t("phone")}><Input value={form.phone} onChange={e => upd("phone", e.target.value)} /></Field>
          <Field label={t("email")}><Input value={form.email} onChange={e => upd("email", e.target.value)} /></Field>
          <Field label={t("address")}><Input value={form.address} onChange={e => upd("address", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("check_in_time")}><Input type="time" value={form.checkIn} onChange={e => upd("checkIn", e.target.value)} /></Field>
            <Field label={t("check_out_time")}><Input type="time" value={form.checkOut} onChange={e => upd("checkOut", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("map_latitude")}><Input type="number" min="-90" max="90" step="any" value={form.latitude ?? ""} onChange={e => upd("latitude", e.target.value)} /></Field>
            <Field label={t("map_longitude")}><Input type="number" min="-180" max="180" step="any" value={form.longitude ?? ""} onChange={e => upd("longitude", e.target.value)} /></Field>
          </div>
          <Field label={t("interface_language")}>
            <Select value={lang} onChange={e => setLang(e.target.value)}>
              {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </Select>
          </Field>
          <Field label={t("base_currency")}><Select value={form.currency} onChange={e => upd("currency", e.target.value)}>{Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Btn onClick={() => { dispatch({ type: "UPDATE_SETTINGS", patch: form }); pushToast("Settings saved."); }}>{t("save_settings")}</Btn>
        </div>
      </div>

      <div className="rounded-2xl p-6 h-fit" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-2" style={{ color: "var(--cream)" }}>{t("guest_website_languages")}</div>
        <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>{t("choose_guest_options")} {t("admin_panel") === "Admin paneli" ? "Bu sozlamalar Admin/Qabulxonaga ta'sir qilmaydi." : "These do not affect Admin/Reception."}</p>
        <div className="mb-5">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>{t("languages")}</div>
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
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>{t("currencies")}</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(CURRENCIES).map(code => {
              const active = (form.enabledCurrencies || []).includes(code);
              return (
                <button key={code} onClick={() => upd("enabledCurrencies", active ? form.enabledCurrencies.filter(c => c !== code) : [...(form.enabledCurrencies || []), code])}
                  className="px-3 py-1.5 rounded-full text-xs" style={{ background: active ? "var(--gold)" : "rgba(246,241,231,0.06)", color: active ? "#15130f" : "var(--cream)" }}>{code}</button>
              );
            })}
          </div>
          <Btn size="sm" variant="ghost" onClick={() => { dispatch({ type: "UPDATE_SETTINGS", patch: form }); pushToast("Settings saved."); }}>{t("save_choices")}</Btn>
            <div className="mt-4 pt-4 text-xs" style={{ borderTop: "1px solid var(--line)", color: "var(--gray)" }}>
              <div className="uppercase tracking-wider mb-2">{t("exchange_rates")}</div>
              <div className="grid grid-cols-2 gap-2">{Object.entries(CURRENCIES).map(([code, currency]) => <span key={code}>1 {code} = {currency.uzsRate.toLocaleString()} so'm</span>)}</div>
            </div>
        </div>
      </div>

      <ImageListEditor
        title={t("homepage_hero")}
        folder="hero"
        images={form.heroImages || []}
        pushToast={pushToast}
        onChange={(imgs) => { const next = { ...form, heroImages: imgs }; setForm(next); dispatch({ type: "UPDATE_SETTINGS", patch: { heroImages: imgs } }); }}
      />
      <ImageListEditor
        title={t("gallery_photos")}
        folder="gallery"
        images={form.galleryImages || []}
        pushToast={pushToast}
        onChange={(imgs) => { const next = { ...form, galleryImages: imgs }; setForm(next); dispatch({ type: "UPDATE_SETTINGS", patch: { galleryImages: imgs } }); }}
      />
      <RoomPhotoSettings pushToast={pushToast} />

      <div className="rounded-2xl p-6 h-fit" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-5" style={{ color: "var(--cream)" }}>{t("security")}</div>
        <div className="flex flex-col gap-4">
          <Field label={securityLabels.current}><Input type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} /></Field>
          <Field label={securityLabels.admin}><Input type="password" autoComplete="new-password" value={pw.adminNext} onChange={e => setPw(p => ({ ...p, adminNext: e.target.value }))} /></Field>
          <Btn variant="ghost" onClick={changeAdminCode} disabled={!pw.current || !pw.adminNext}><Lock size={14} /> {securityLabels.changeAdmin}</Btn>
          <Field label={securityLabels.reception}><Input type="password" autoComplete="new-password" value={pw.receptionNext} onChange={e => setPw(p => ({ ...p, receptionNext: e.target.value }))} /></Field>
          <Btn variant="ghost" onClick={changeReceptionCode} disabled={!pw.current || !pw.receptionNext}><Lock size={14} /> {securityLabels.changeReception}</Btn>
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
      {active === "contact_messages" && user.role === "ADMIN" && <ContactMessagesPage pushToast={pushToast} />}
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
  { key: "dashboard", labelKey: "dashboard", icon: BarChart3 },
  { key: "bookings", labelKey: "bookings", icon: CalendarDays },
  { key: "rooms", labelKey: "rooms", icon: Bed },
  { key: "guests", labelKey: "guests_nav", icon: Users },
  { key: "contact_messages", labelKey: "contact_messages", icon: Mail },
  { key: "housekeeping", labelKey: "housekeeping", icon: Sparkles },
  { key: "services", labelKey: "services_nav", icon: ConciergeBell },
];

function ReceptionDashboard({ openBookings }) {
  const { state } = useData();
  const { t } = useLang();
  const arrivals = state.bookings.filter(b => b.checkIn === todayISO() && ["Pending", "Confirmed"].includes(b.status));
  const departures = state.bookings.filter(b => b.checkOut === todayISO() && b.status === "Checked-in");
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
        <Btn onClick={() => openBookings("new")}><Plus size={15} /> New Booking</Btn>
        <Btn variant="ghost" onClick={() => openBookings("check-in")}><DoorOpen size={15} /> Check-in ({arrivals.length})</Btn>
        <Btn variant="ghost" onClick={() => openBookings("check-out")}><DoorClosed size={15} /> Check-out ({departures.length})</Btn>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Search Guest")}</div>
        <div className="relative max-w-md mb-4"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--gray)" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Type a guest name..." )} className="pl-9" /></div>
        {q && (found.length === 0 ? <EmptyState text="No guests found." /> : found.map(g => (
          <div key={g.id} className="flex justify-between py-2 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{g.name}</span><span style={{ color: "var(--gray)" }}>{g.phone}</span></div>
        )))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Today's arrivals")}</div>
          {arrivals.length === 0 ? <EmptyState text="No arrivals today." /> : arrivals.map(b => <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>{t("Room")} {b.roomNumber}</span><button className="text-xs underline" style={{ color: "var(--gold)" }} onClick={() => openBookings("check-in")}>{t("Check-in")}</button></div>)}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("Today's departures")}</div>
          {departures.length === 0 ? <EmptyState text="No departures today." /> : departures.map(b => <div key={b.id} className="flex justify-between py-2.5 text-sm" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: "var(--cream)" }}>{b.guestName}</span><span style={{ color: "var(--gray)" }}>{t("Room")} {b.roomNumber}</span><button className="text-xs underline" style={{ color: "var(--gold)" }} onClick={() => openBookings("check-out")}>{t("Check-out")}</button></div>)}
        </div>
      </div>
    </div>
  );
}

function ReceptionNewBooking({ pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
  const [form, setForm] = useState({ name: "", phone: "", alternatePhone: "", passport: "", email: "", guests: 2, roomTypeId: ROOM_TYPES[0].id, ci: todayISO(), co: addDays(todayISO(), 1), request: "", paymentMethod: "cash", paymentCurrency: "USD" });
  const [error, setError] = useState("");
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const nights = nightsBetween(form.ci, form.co);
  const roomType = ROOM_TYPES.find(t => t.id === form.roomTypeId);
  const submit = () => {
    setError("");
    if (!form.name.trim()) return setError(t("Guest name is required."));
    if (!form.passport.trim()) return setError(t("Passport number is required."));
    if (form.co <= form.ci) return setError(t("Check-out must be after check-in."));
    const room = state.rooms.find(r => r.typeId === form.roomTypeId && r.status === "AVAILABLE" &&
      !state.bookings.some(b => b.roomId === r.id && !["Cancelled", "No-show", "Checked-out"].includes(b.status) && form.ci < b.checkOut && form.co > b.checkIn));
    if (!room) return setError(t("No rooms of this type are available for those dates."));
    const id = "DH" + (1000 + state.bookings.length + Math.floor(Math.random() * 90));
    const amount = nights * roomType.price;
    const booking = { id, guestId: uid("guest_"), guestName: form.name, phone: form.phone, alternatePhone: form.alternatePhone, passport: form.passport, email: form.email, roomId: room.id, roomNumber: room.number, roomType: room.typeName, checkIn: form.ci, checkOut: form.co, nights, guests: form.guests, request: form.request, amount, amountUZS: Math.round(amount * CURRENCIES[form.paymentCurrency].rate * CURRENCIES[form.paymentCurrency].uzsRate), paymentMethod: form.paymentMethod, paymentCurrency: form.paymentCurrency, status: "Confirmed", paymentStatus: "Pending", created: todayISO() };
    dispatch({ type: "ADD_BOOKING", booking });
    dispatch({ type: "SET_ROOM_STATUS", id: room.id, status: "RESERVED" });
    dispatch({ type: "ADD_AUDIT", entry: { user: "reception", action: `Created booking ${id} for ${form.name}` } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New booking (reception)", detail: `${form.name} · Room ${room.number}` } });
    pushToast(`${t("Booking")} ${id} ${t("created")} — ${t("Room")} #${room.number}.`);
    setForm({ name: "", phone: "", alternatePhone: "", passport: "", email: "", guests: 2, roomTypeId: ROOM_TYPES[0].id, ci: todayISO(), co: addDays(todayISO(), 1), request: "", paymentMethod: "cash", paymentCurrency: "USD" });
  };
  return (
    <div className="max-w-2xl">
      {error && <div className="rounded-lg px-4 py-3 mb-5 text-sm" style={{ background: "rgba(178,72,72,0.15)", color: "#e79a9a" }}>{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Full name"><Input value={form.name} onChange={e => upd("name", e.target.value)} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={e => upd("phone", e.target.value)} /></Field>
        <Field label="Additional phone"><Input value={form.alternatePhone} onChange={e => upd("alternatePhone", e.target.value)} /></Field>
        <Field label="Passport number"><Input value={form.passport} onChange={e => upd("passport", e.target.value)} /></Field>
        <Field label="Email"><Input value={form.email} onChange={e => upd("email", e.target.value)} /></Field>
        <Field label="Guests"><Input type="number" min={1} value={form.guests} onChange={e => upd("guests", +e.target.value)} /></Field>
        <Field label="Room type"><Select value={form.roomTypeId} onChange={e => upd("roomTypeId", e.target.value)}>{ROOM_TYPES.map(roomType => <option key={roomType.id} value={roomType.id}>{roomLabel(roomType, lang)[0]} — {fmtMoney(roomType.price)}/{t("per_night")}</option>)}</Select></Field>
        <div />
        <Field label="Check-in"><Input type="date" value={form.ci} onChange={e => upd("ci", e.target.value)} /></Field>
        <Field label="Check-out"><Input type="date" value={form.co} onChange={e => upd("co", e.target.value)} /></Field>
        <Field label="Payment method"><Select value={form.paymentMethod} onChange={e => upd("paymentMethod", e.target.value)}><option value="cash">Cash / Naqd</option><option value="card">Card / Karta</option></Select></Field>
        <Field label="Payment currency"><Select value={form.paymentCurrency} onChange={e => upd("paymentCurrency", e.target.value)}>{Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}</Select></Field>
        <div className="md:col-span-2"><Field label="Special request"><TextArea rows={2} value={form.request} onChange={e => upd("request", e.target.value)} /></Field></div>
      </div>
      <div className="flex justify-between items-center mt-6 rounded-xl p-4" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <span className="text-sm" style={{ color: "var(--gray)" }}>{nights} {t("nights")} × {fmtMoney(roomType.price)} = {formatUZS(nights * roomType.price, form.paymentCurrency)}</span>
        <Btn onClick={submit}>Create Booking</Btn>
      </div>
    </div>
  );
}

function ReceptionBookings({ pushToast, initialMode = "new" }) {
  const { t } = useLang();
  const [tab, setTab] = useState(initialMode === "new" ? "new" : "manage");
  const [receptionMode, setReceptionMode] = useState(["check-in", "check-out"].includes(initialMode) ? initialMode : "all");
  useEffect(() => {
    setTab(initialMode === "new" ? "new" : "manage");
    setReceptionMode(["check-in", "check-out"].includes(initialMode) ? initialMode : "all");
  }, [initialMode]);
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("new")} className="px-4 py-2 rounded-full text-sm" style={{ background: tab === "new" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: tab === "new" ? "#15130f" : "var(--cream)" }}>{t("New Booking")}</button>
        <button onClick={() => { setTab("manage"); setReceptionMode("all"); }} className="px-4 py-2 rounded-full text-sm" style={{ background: tab === "manage" ? "var(--gold)" : "rgba(246,241,231,0.06)", color: tab === "manage" ? "#15130f" : "var(--cream)" }}>{t("Manage Bookings")}</button>
      </div>
      {tab === "new" ? <ReceptionNewBooking pushToast={pushToast} /> : <BookingsAdmin role="RECEPTION" pushToast={pushToast} receptionMode={receptionMode} />}
    </div>
  );
}

function ReceptionRooms() {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {state.rooms.map(r => (
        <div key={r.id} className="rounded-2xl p-5" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
          <div className="flex justify-between mb-2"><div className="dh-serif text-xl" style={{ color: "var(--cream)" }}>#{r.number}</div><Badge tone={statusTone(r.status)}>{r.status}</Badge></div>
          <div className="text-xs" style={{ color: "var(--gray)" }}>{roomLabel(roomTypeFor(r), lang)[0]}</div>
        </div>
      ))}
    </div>
  );
}

function ReceptionHousekeeping({ pushToast }) {
  const { state, dispatch } = useData();
  const { t } = useLang();
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
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("New Housekeeping Request")}</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Room"><Select value={roomId} onChange={e => setRoomId(e.target.value)}>{state.rooms.map(r => <option key={r.id} value={r.id}>#{r.number}</option>)}</Select></Field>
          <Field label="Task type"><Select value={taskType} onChange={e => setTaskType(e.target.value)}>{HOUSEKEEPING_TASK_TYPES.map(type => <option key={type} value={type}>{t(HOUSEKEEPING_TASK_LABELS[type])}</option>)}</Select></Field>
        </div>
        <Btn onClick={create}>Submit Request</Btn>
      </div>
      <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>{t("All Requests")}</div>
      <DataTable columns={["Room", "Task", "Assigned", "Status"]} rows={state.housekeeping} empty={t("hk_no_tasks")} renderRow={(task) => (<>
        <td className="px-4 py-3" style={{ color: "var(--cream)" }}>#{task.roomNumber}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{t(HOUSEKEEPING_TASK_LABELS[task.taskType] || task.taskType)}</td>
        <td className="px-4 py-3" style={{ color: "var(--gray)" }}>{task.assignedTo || t("hk_unassigned")}</td>
        <td className="px-4 py-3"><Badge tone={task.status === "Completed" ? "good" : "warn"}>{t(task.status)}</Badge></td>
      </>)} />
    </div>
  );
}

function ReceptionServices({ pushToast }) {
  const { state, dispatch } = useData();
  const { t, lang } = useLang();
  const [guestName, setGuestName] = useState(""); const [roomNumber, setRoomNumber] = useState(""); const [serviceId, setServiceId] = useState(state.services[0]?.id); const [qty, setQty] = useState(1);
  const selectedService = state.services.find(service => service.id === serviceId);
  const needsPassengerCount = isPassengerCountService(selectedService);
  const create = () => {
    if (!guestName.trim() || !roomNumber.trim() || !selectedService) return;
    const passengerCount = Number(qty);
    if (needsPassengerCount && (!Number.isInteger(passengerCount) || passengerCount < 1)) {
      pushToast(t("passenger_count_error"));
      return;
    }
    const serviceQuantity = needsPassengerCount ? passengerCount : 1;
    dispatch({ type: "ADD_REQUEST", req: { id: uid("req_"), guestName: guestName.trim(), roomNumber: roomNumber.trim(), service: selectedService.name, qty: serviceQuantity, quantityType: needsPassengerCount ? "passengers" : null, price: selectedService.price, status: "New", created: new Date().toISOString() } });
    dispatch({ type: "ADD_NOTIF", notif: { title: "New service request", detail: `${selectedService.name} · Room ${roomNumber.trim()}` } });
    pushToast(t("Service request created."));
    setGuestName(""); setRoomNumber("");
    setQty(1);
  };
  return (
    <div>
      <div className="rounded-2xl p-6 mb-8 max-w-xl" style={{ background: "var(--charcoal2)", border: "1px solid var(--line)" }}>
        <div className="dh-serif text-lg mb-4" style={{ color: "var(--cream)" }}>New Service Request</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Guest name"><Input value={guestName} onChange={e => setGuestName(e.target.value)} /></Field>
          <Field label="Room number"><Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} /></Field>
          <Field label="Service"><Select value={serviceId} onChange={e => setServiceId(e.target.value)}>{state.services.map(s => <option key={s.id} value={s.id}>{serviceLabel(s.name, lang)}</option>)}</Select></Field>
          {needsPassengerCount && <Field label={t("Guests")}><Input type="number" min={1} step={1} value={qty} onChange={e => setQty(e.target.value)} /></Field>}
        </div>
        <Btn onClick={create}>Submit Request</Btn>
      </div>
      <DataTable columns={["Guest", "Room", "Service", "Qty", "Status"]} rows={state.requests} empty="No service requests." renderRow={(r) => (<>
        <td className="px-4 py-3" style={{ color: "var(--cream)" }}>{r.guestName}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>#{r.roomNumber}</td>
        <td className="px-4 py-3" style={{ color: "var(--cream2)" }}>{serviceLabel(r.service, lang)}</td>
        <td className="px-4 py-3" style={{ color: "var(--gray)" }}>{requestHasPassengerCount(r) ? `${r.qty} ${t("Guests").toLowerCase()}` : "—"}</td>
        <td className="px-4 py-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
      </>)} />
    </div>
  );
}

function ReceptionApp({ pushToast, exit }) {
  const { user } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [bookingMode, setBookingMode] = useState("new");
  const openBookings = (mode) => {
    setBookingMode(mode);
    setActive("bookings");
  };
  return (
    <DashboardShell role={user.role} items={RECEPTION_NAV} active={active} setActive={setActive} onExit={exit}>
      {active === "dashboard" && <ReceptionDashboard openBookings={openBookings} />}
      {active === "bookings" && <ReceptionBookings key={bookingMode} initialMode={bookingMode} pushToast={pushToast} />}
      {active === "rooms" && <ReceptionRooms />}
      {active === "guests" && <GuestsAdmin />}
      {active === "contact_messages" && <ContactMessagesPage pushToast={pushToast} />}
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
    <LangProvider availableLangs={["en", "uz", "ru"]}>
      <DataProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </DataProvider>
    </LangProvider>
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
