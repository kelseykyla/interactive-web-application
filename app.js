/*
  USIU-A Event Booking Dashboard Script
  Requirements covered:
  - External JS only
  - Register button: decrement slots, success message, disable at 0 -> "Fully Booked"
  - Form submit: validate fields + Student ID format, show confirmation with Name/ID/Event
  - Persistence via localStorage (events + bookings)
*/

// ----- Utilities -----
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const byId = (id) => document.getElementById(id);

const STORAGE_KEYS = {
  EVENTS: 'usiu_events_v1',
  BOOKINGS: 'usiu_bookings_v1',
};

// Default sample events (used on first load, then persisted)
const DEFAULT_EVENTS = [
  { id: 'evt-1', name: 'Freshers Welcome Fair', date: '2025-09-05', venue: 'Auditorium A', slots: 25 },
  { id: 'evt-2', name: 'AI & Data Science Talk', date: '2025-09-12', venue: 'Tech Lab 3', slots: 15 },
  { id: 'evt-3', name: 'Cultural Night', date: '2025-09-20', venue: 'Main Quad', slots: 40 },
  { id: 'evt-4', name: 'Career Expo', date: '2025-10-02', venue: 'Hall B', slots: 30 },
  { id: 'evt-5', name: 'Mental Health Workshop', date: '2025-10-10', venue: 'Counseling Center', slots: 12 },
];

function loadEvents() {
  const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
  if (!raw) return DEFAULT_EVENTS;
  try { return JSON.parse(raw); } catch { return DEFAULT_EVENTS; }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

function loadBookings() {
  const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
}

// ----- Render helpers -----
function renderEventsTable(events) {
  const tbody = byId('events-body');
  tbody.innerHTML = '';

  events.forEach(evt => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = evt.name;

    const tdDate = document.createElement('td');
    tdDate.textContent = new Date(evt.date).toLocaleDateString();

    const tdVenue = document.createElement('td');
    tdVenue.textContent = evt.venue;

    const tdSlots = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge ' + (evt.slots > 0 ? 'ok' : 'none');
    badge.textContent = evt.slots > 0 ? `${evt.slots} available` : 'Fully Booked';
    tdSlots.appendChild(badge);

    const tdBtn = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = evt.slots > 0 ? 'Register' : 'Fully Booked';
    btn.disabled = evt.slots <= 0;
    btn.setAttribute('data-id', evt.id);
    btn.addEventListener('click', () => handleQuickRegister(evt.id));
    tdBtn.appendChild(btn);

    tr.append(tdName, tdDate, tdVenue, tdSlots, tdBtn);
    tbody.appendChild(tr);
  });
}

function renderEventDropdown(events) {
  const select = byId('eventSelect');
  select.innerHTML = '<option value="" disabled selected>Select an event…</option>';
  events.forEach(evt => {
    const opt = document.createElement('option');
    opt.value = evt.id;
    opt.textContent = `${evt.name} — ${new Date(evt.date).toLocaleDateString()}`;
    select.appendChild(opt);
  });
}

function showToast(message) {
  const toast = byId('toast');
  toast.innerHTML = `<span class="toast-msg">${message}</span>`;
  setTimeout(() => (toast.innerHTML = ''), 3200);
}

function setYear() { byId('year').textContent = new Date().getFullYear(); }

// ----- Core handlers -----
function updateEventsAndUI(mutator) {
  const events = loadEvents();
  mutator(events);
  saveEvents(events);
  renderEventsTable(events);
  renderEventDropdown(events);
}

function handleQuickRegister(eventId) {
  updateEventsAndUI(events => {
    const evt = events.find(e => e.id === eventId);
    if (!evt) return;
    if (evt.slots > 0) {
      evt.slots -= 1;
      showToast(`Success! Reserved 1 slot for “${evt.name}”.`);
      if (evt.slots === 0) showToast(`“${evt.name}” is now Fully Booked.`);
    }
  });
}

// Accepts IDs like: USIU-123456, USIU123456, SIS-2025001, AB-12345
const STUDENT_ID_REGEX = /^[A-Z]{2,5}-?\d{4,8}$/;

function validateForm({ name, studentId, eventId }) {
  let valid = true;

  if (!name || name.trim().length < 2) {
    byId('name-error').textContent = 'Please enter your full name.';
    valid = false;
  } else byId('name-error').textContent = '';

  if (!studentId || !STUDENT_ID_REGEX.test(studentId.trim().toUpperCase())) {
    byId('id-error').textContent = 'Enter a valid Student ID (e.g., USIU-123456).';
    valid = false;
  } else byId('id-error').textContent = '';

  if (!eventId) {
    byId('event-error').textContent = 'Please choose an event.';
    valid = false;
  } else byId('event-error').textContent = '';

  return valid;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const name = byId('name').value;
  const studentId = byId('studentId').value.toUpperCase();
  const eventId = byId('eventSelect').value;

  if (!validateForm({ name, studentId, eventId })) return;

  // Decrement selected event slot if available
  let success = false;
  let chosenEvent = null;

  updateEventsAndUI(events => {
    const evt = events.find(e => e.id === eventId);
    if (!evt) return;
    chosenEvent = evt;
    if (evt.slots > 0) {
      evt.slots -= 1;
      success = true;
    }
  });

  if (!success) {
    byId('confirmation').innerHTML =
      `<strong>Sorry!</strong> That event is already <em>Fully Booked</em>.`;
    return;
  }

  // Save booking
  const bookings = loadBookings();
  const record = { id: crypto.randomUUID(), name, studentId, eventId, ts: Date.now() };
  bookings.push(record);
  saveBookings(bookings);

  // Show confirmation below form
  byId('confirmation').innerHTML = `
    <strong>Registration Confirmed</strong><br/>
    Name: ${name}<br/>
    ID: ${studentId}<br/>
    Event: ${chosenEvent?.name ?? eventId}
  `;

  showToast(`Booked “${chosenEvent?.name ?? 'Selected Event'}” for ${name}.`);

  // Reset form and restore placeholder option
  byId('register-form').reset();
  const select = byId('eventSelect');
  if (select.options.length) select.selectedIndex = 0;
}

// ----- Bootstrap -----
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    saveEvents(DEFAULT_EVENTS);
  }
  setYear();
  const events = loadEvents();
  renderEventsTable(events);
  renderEventDropdown(events);

  byId('register-form').addEventListener('submit', handleFormSubmit);
});
