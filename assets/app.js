/* ============================================================================
   MANAJEMEN UANG IBRA — aplikasi keuangan pribadi 100% lokal
   ----------------------------------------------------------------------------
   KONFIGURASI UTAMA
   Ubah nilai di bawah ini sesuai kebutuhanmu, lalu simpan file.
   PIN bawaan dapat diubah langsung dari sini ATAU lewat menu Pengaturan.
============================================================================ */
const APP_CONFIG = Object.freeze({
  appName: 'MANAJEMEN UANG IBRA',
  ownerName: 'Ibra',
  ownerInitials: 'IB',
  defaultPIN: '2611',          // ← PIN 4 digit bawaan aplikasi
  currency: 'IDR',
  storageKey: 'mui_state_v1',
  pinKey: 'mui_pin_v1',
  themeKey: 'mui_theme_v1',
  version: '1.0.0',
  defaultBudgets: {
    weekly: 350000,
    monthly: 1200000
  },
  quickAdds: [
    { label: 'Bensin', amount: 20000, category: 'Bensin', note: 'Bensin', icon: 'fuel' },
    { label: 'Makan Kampus', amount: 15000, category: 'Jajan & Makan Kampus', note: 'Makan kampus', icon: 'utensils' },
    { label: 'Kopi / Jajan', amount: 10000, category: 'Jajan & Makan Kampus', note: 'Kopi / jajan', icon: 'coffee' },
    { label: 'Laundry', amount: 8000, category: 'Lainnya', note: 'Laundry', icon: 'shirt' }
  ]
});

/* ----------------------------------------------------------------------------
   KATEGORI
---------------------------------------------------------------------------- */
const EXPENSE_CATEGORIES = [
  { name: 'Bensin', icon: 'fuel', color: '#D97706' },
  { name: 'Jajan & Makan Kampus', icon: 'utensils', color: '#EF4444' },
  { name: 'Kuota & Pulsa', icon: 'smartphone', color: '#2563EB' },
  { name: 'Langganan', icon: 'repeat-2', color: '#7C3AED' },
  { name: 'Nongkrong & Hiburan', icon: 'coffee', color: '#DB2777' },
  { name: 'Kebutuhan Kuliah', icon: 'book-open', color: '#0D9488' },
  { name: 'Lainnya', icon: 'shapes', color: '#64748B' }
];

const INCOME_CATEGORIES = [
  { name: 'Uang Jajan', icon: 'wallet', color: '#10B981' },
  { name: 'Kiriman Orang Tua', icon: 'gift', color: '#059669' },
  { name: 'Freelance', icon: 'briefcase', color: '#0EA5E9' },
  { name: 'Lainnya', icon: 'shapes', color: '#84CC16' }
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const numberFormatter = new Intl.NumberFormat('id-ID');

/* ----------------------------------------------------------------------------
   STATE
---------------------------------------------------------------------------- */
function createDefaultState() {
  return {
    version: 1,
    transactions: [],
    subscriptions: [],
    budgets: { ...APP_CONFIG.defaultBudgets },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeState(input) {
  const fresh = createDefaultState();
  if (!input || typeof input !== 'object') return fresh;

  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const subscriptions = Array.isArray(input.subscriptions) ? input.subscriptions : [];
  const budgets = input.budgets && typeof input.budgets === 'object' ? input.budgets : {};

  return {
    version: 1,
    transactions: transactions
      .filter((t) => t && (t.type === 'income' || t.type === 'expense') && Number(t.amount) > 0 && isDateKey(t.date))
      .map((t) => ({
        id: String(t.id || uid()),
        type: t.type,
        amount: Math.round(Number(t.amount)),
        category: String(t.category || 'Lainnya'),
        note: String(t.note || ''),
        date: t.date,
        createdAt: t.createdAt || new Date().toISOString()
      })),
    subscriptions: subscriptions
      .filter((s) => s && String(s.name || '').trim() && Number(s.amount) > 0 && isDateKey(s.nextDue))
      .map((s) => ({
        id: String(s.id || uid()),
        name: String(s.name),
        amount: Math.round(Number(s.amount)),
        cycle: s.cycle === 'weekly' ? 'weekly' : 'monthly',
        nextDue: s.nextDue,
        note: String(s.note || ''),
        active: s.active !== false,
        createdAt: s.createdAt || new Date().toISOString()
      })),
    budgets: {
      weekly: Math.max(0, Math.round(Number(budgets.weekly) || APP_CONFIG.defaultBudgets.weekly)),
      monthly: Math.max(0, Math.round(Number(budgets.monthly) || APP_CONFIG.defaultBudgets.monthly))
    },
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn('State lokal tidak dapat dibaca.', error);
    return createDefaultState();
  }
}

function saveState() {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Gagal menyimpan data.', error);
    showToast('Data gagal disimpan. Penyimpanan browser mungkin penuh.', 'error');
    return false;
  }
}

let state = loadState();

/* ----------------------------------------------------------------------------
   UTILITAS UMUM
---------------------------------------------------------------------------- */
function uid() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRupiah(value) {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '-' : '';
  return `${sign}Rp ${numberFormatter.format(Math.abs(number))}`;
}

function formatCompact(value) {
  const n = Math.abs(Number(value) || 0);
  if (n >= 1000000000) return `${(n / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (n >= 1000000) return `${(n / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (n >= 1000) return `${Math.round(n / 1000)} rb`;
  return String(Math.round(n));
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '#64748B').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseAmount(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function formatAmountInput(value) {
  const digits = String(value || '').replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
  return digits ? numberFormatter.format(Number(digits)) : '';
}

/* ----------------------------------------------------------------------------
   UTILITAS TANGGAL (selalu memakai waktu lokal)
---------------------------------------------------------------------------- */
function toDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDateKey(value).getTime());
}

function parseDateKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function addMonthsClamped(date, amount) {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function startOfWeek(date) {
  const copy = dateOnly(date);
  const offset = (copy.getDay() + 6) % 7; // Senin = awal minggu
  return addDays(copy, -offset);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function diffDays(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

function formatDateLong(date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateMedium(key) {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(key) {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function formatDateTime(date = new Date()) {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()} · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function dayGreeting() {
  const hour = new Date().getHours();
  if (hour < 4) return 'Selamat malam';
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

/* ----------------------------------------------------------------------------
   PERHITUNGAN KEUANGAN
---------------------------------------------------------------------------- */
function sumTransactions(list) {
  return list.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

function transactionsInRange(startKey, endKey, type = null) {
  return state.transactions.filter((t) =>
    t.date >= startKey &&
    t.date <= endKey &&
    (!type || t.type === type)
  );
}

function totalBalance() {
  return state.transactions.reduce((total, t) => total + (t.type === 'income' ? t.amount : -t.amount), 0);
}

function statsForRange(startKey, endKey) {
  const list = transactionsInRange(startKey, endKey);
  const income = sumTransactions(list.filter((t) => t.type === 'income'));
  const expense = sumTransactions(list.filter((t) => t.type === 'expense'));
  return { income, expense, net: income - expense, count: list.length };
}

function currentMonthStats() {
  const now = new Date();
  return statsForRange(toDateKey(startOfMonth(now)), toDateKey(now));
}

function currentWeekStats() {
  const now = new Date();
  return statsForRange(toDateKey(startOfWeek(now)), toDateKey(now));
}

function todayStats() {
  const key = toDateKey();
  return statsForRange(key, key);
}

function activeSubscriptions() {
  return state.subscriptions
    .filter((s) => s.active !== false)
    .slice()
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

function reservedSubscriptionsThisMonth() {
  const end = toDateKey(endOfMonth(new Date()));
  return activeSubscriptions().filter((s) => s.nextDue <= end);
}

function safeToSpendInfo() {
  const now = new Date();
  const balance = totalBalance();
  const reservedList = reservedSubscriptionsThisMonth();
  const reserved = sumTransactions(reservedList);
  const daysRemaining = Math.max(1, endOfMonth(now).getDate() - now.getDate() + 1);
  const available = balance - reserved;
  const daily = Math.max(0, Math.floor(available / daysRemaining));
  const spentToday = todayStats().expense;
  return {
    balance,
    reserved,
    reservedCount: reservedList.length,
    daysRemaining,
    available,
    daily,
    spentToday
  };
}

function budgetState(percent) {
  if (percent >= 100) return 'danger';
  if (percent >= 75) return 'warning';
  return 'safe';
}

function getBudgetSnapshot() {
  const week = currentWeekStats();
  const month = currentMonthStats();
  const weeklyLimit = Number(state.budgets.weekly) || 0;
  const monthlyLimit = Number(state.budgets.monthly) || 0;
  const weeklyPct = weeklyLimit > 0 ? (week.expense / weeklyLimit) * 100 : 0;
  const monthlyPct = monthlyLimit > 0 ? (month.expense / monthlyLimit) * 100 : 0;
  return {
    week: {
      spent: week.expense,
      limit: weeklyLimit,
      percent: weeklyPct,
      state: budgetState(weeklyPct),
      remaining: Math.max(0, weeklyLimit - week.expense),
      over: Math.max(0, week.expense - weeklyLimit)
    },
    month: {
      spent: month.expense,
      limit: monthlyLimit,
      percent: monthlyPct,
      state: budgetState(monthlyPct),
      remaining: Math.max(0, monthlyLimit - month.expense),
      over: Math.max(0, month.expense - monthlyLimit)
    }
  };
}

function getCurrentAlerts() {
  const snapshot = getBudgetSnapshot();
  const alerts = [];
  if (snapshot.month.over > 0) {
    alerts.push({
      tone: 'danger',
      title: 'Budget bulanan terlampaui',
      message: `Kamu sudah lewat ${formatRupiah(snapshot.month.over)} dari limit bulan ini. Waktunya rem pengeluaran.`
    });
  } else if (snapshot.month.percent >= 100 && snapshot.month.limit > 0) {
    alerts.push({
      tone: 'danger',
      title: 'Limit bulanan sudah habis',
      message: 'Semua jatah bulan ini terpakai. Hindari pengeluaran non-esensial sampai bulan depan.'
    });
  }
  if (snapshot.week.over > 0) {
    alerts.push({
      tone: 'danger',
      title: 'Budget mingguan terlampaui',
      message: `Pengeluaran minggu ini lewat ${formatRupiah(snapshot.week.over)}. Coba tahan jajan sampai minggu depan.`
    });
  }
  if (!alerts.length) {
    if (snapshot.month.state === 'warning' && snapshot.month.limit > 0) {
      alerts.push({
        tone: 'warning',
        title: 'Budget bulanan mendekati limit',
        message: `Sudah ${Math.round(snapshot.month.percent)}% terpakai. Sisa ${formatRupiah(snapshot.month.remaining)} untuk bulan ini.`
      });
    } else if (snapshot.week.state === 'warning' && snapshot.week.limit > 0) {
      alerts.push({
        tone: 'warning',
        title: 'Budget mingguan mendekati limit',
        message: `Sudah ${Math.round(snapshot.week.percent)}% terpakai. Sisa ${formatRupiah(snapshot.week.remaining)} untuk minggu ini.`
      });
    }
  }
  return alerts;
}

function isDayOverBudget(day) {
  const dayKey = toDateKey(day);
  const weeklyLimit = Number(state.budgets.weekly) || 0;
  const monthlyLimit = Number(state.budgets.monthly) || 0;
  if (weeklyLimit > 0) {
    const weekSpent = sumTransactions(transactionsInRange(toDateKey(startOfWeek(day)), dayKey, 'expense'));
    if (weekSpent > weeklyLimit) return true;
  }
  if (monthlyLimit > 0) {
    const monthSpent = sumTransactions(transactionsInRange(toDateKey(startOfMonth(day)), dayKey, 'expense'));
    if (monthSpent > monthlyLimit) return true;
  }
  return false;
}

function computeStreak() {
  const today = dateOnly(new Date());
  const statuses = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    statuses.push({ date: day, safe: !isDayOverBudget(day) });
  }

  if (state.transactions.length === 0) {
    return { days: 0, statuses, overToday: false, noData: true };
  }

  let days = 0;
  let cursor = today;
  const earliest = state.transactions.reduce((min, t) => (t.date < min ? t.date : min), toDateKey(today));
  for (let i = 0; i < 365; i += 1) {
    if (isDayOverBudget(cursor)) break;
    days += 1;
    if (toDateKey(cursor) <= earliest) break;
    cursor = addDays(cursor, -1);
  }

  return {
    days,
    statuses,
    overToday: isDayOverBudget(today),
    noData: false
  };
}

/* ----------------------------------------------------------------------------
   KATEGORI & LABEL
---------------------------------------------------------------------------- */
function categoryMeta(name, type = 'expense') {
  const pool = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return pool.find((c) => c.name === name) || {
    name,
    icon: type === 'income' ? 'wallet' : 'shapes',
    color: type === 'income' ? '#10B981' : '#64748B'
  };
}

function categoryIcon(name, type = 'expense', className = 'h-4 w-4') {
  const meta = categoryMeta(name, type);
  return `<i data-lucide="${meta.icon}" class="${className}"></i>`;
}

function currentMonthCategoryTotals() {
  const start = toDateKey(startOfMonth(new Date()));
  const end = toDateKey(new Date());
  const totals = {};
  transactionsInRange(start, end, 'expense').forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value, ...categoryMeta(name) }))
    .sort((a, b) => b.value - a.value);
}

function subscriptionDaysLeft(sub) {
  return diffDays(dateOnly(new Date()), parseDateKey(sub.nextDue));
}

function subscriptionDueLabel(sub) {
  const days = subscriptionDaysLeft(sub);
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`;
  if (days === 0) return 'Jatuh tempo hari ini';
  if (days === 1) return 'Besok';
  return `${days} hari lagi`;
}

function subscriptionDueTone(sub) {
  const days = subscriptionDaysLeft(sub);
  if (days < 0) return 'danger';
  if (days <= 3) return 'warning';
  return 'neutral';
}

function sortedTransactions() {
  return state.transactions.slice().sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

function getAvailableMonths() {
  const keys = new Set(state.transactions.map((t) => t.date.slice(0, 7)));
  keys.add(monthKey());
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

/* ----------------------------------------------------------------------------
   KOMPONEN HTML DASAR
---------------------------------------------------------------------------- */
function cardOpen(className = '', tag = 'article', attrs = '') {
  return `<${tag} class="surface-card ${className}" ${attrs}>`;
}

function sectionHeading(kicker, title, subtitle = '', action = '') {
  return `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="eyebrow">${esc(kicker)}</p>
        <h1 class="page-title">${title}</h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
      </div>
      ${action ? `<div class="shrink-0">${action}</div>` : ''}
    </div>`;
}

function iconButton(icon, action, label, extraClass = '') {
  return `<button type="button" class="icon-btn ${extraClass}" data-action="${action}" aria-label="${esc(label)}" title="${esc(label)}"><i data-lucide="${icon}" class="h-4 w-4"></i></button>`;
}

function emptyState(icon, title, description, actionHtml = '') {
  return `
    <div class="empty-state">
      <span class="empty-icon"><i data-lucide="${icon}" class="h-5 w-5"></i></span>
      <p class="mt-3 text-[13px] font-bold text-ink">${esc(title)}</p>
      <p class="mx-auto mt-1 max-w-[280px] text-[11.5px] leading-relaxed text-muted">${esc(description)}</p>
      ${actionHtml ? `<div class="mt-4">${actionHtml}</div>` : ''}
    </div>`;
}

function transactionRow(t, options = {}) {
  const meta = categoryMeta(t.category, t.type);
  const income = t.type === 'income';
  const actions = options.hideActions ? '' : `
    <div class="tx-actions">
      <button type="button" class="mini-icon-btn" data-action="edit-transaction" data-id="${esc(t.id)}" aria-label="Edit transaksi ${esc(t.note || t.category)}">
        <i data-lucide="pencil" class="h-3.5 w-3.5"></i>
      </button>
      <button type="button" class="mini-icon-btn mini-icon-btn-danger" data-action="delete-transaction" data-id="${esc(t.id)}" aria-label="Hapus transaksi ${esc(t.note || t.category)}">
        <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
      </button>
    </div>`;
  return `
    <div class="tx-row">
      <span class="category-badge" style="color:${meta.color};background:${hexToRgba(meta.color, 0.12)}">
        ${categoryIcon(t.category, t.type, 'h-4 w-4')}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-[12.5px] font-bold text-ink">${esc(t.note || t.category)}</p>
        <p class="mt-0.5 truncate text-[10.5px] font-medium text-faint">
          ${esc(t.category)}${options.showDate ? ` · ${formatDateMedium(t.date)}` : ''}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <p class="money text-[12px] font-semibold ${income ? 'text-primary' : 'text-ink'}">
          ${income ? '+' : '−'}${formatRupiah(t.amount)}
        </p>
        ${actions}
      </div>
    </div>`;
}

/* ----------------------------------------------------------------------------
   DASHBOARD
---------------------------------------------------------------------------- */
function renderAlertBanner(alert) {
  const isDanger = alert.tone === 'danger';
  return `
    <div class="alert-banner alert-${isDanger ? 'danger' : 'warning'}">
      <span class="alert-icon"><i data-lucide="${isDanger ? 'circle-alert' : 'triangle-alert'}" class="h-4 w-4"></i></span>
      <div class="min-w-0 flex-1">
        <p class="text-[12px] font-extrabold tracking-tight">${esc(alert.title)}</p>
        <p class="mt-0.5 text-[11px] leading-relaxed opacity-80">${esc(alert.message)}</p>
      </div>
      <button type="button" class="alert-link" data-action="open-settings" data-tab="budget">Atur limit</button>
    </div>`;
}

function budgetBar(label, data) {
  const colorMap = { safe: '#10B981', warning: '#F59E0B', danger: '#EF4444' };
  const color = colorMap[data.state];
  const percent = Math.max(0, Math.min(100, data.percent));
  const detail = data.over > 0
    ? `Lewat ${formatRupiah(data.over)}`
    : data.remaining < 0
      ? 'Limit habis'
      : `Sisa ${formatRupiah(data.remaining)}`;
  return `
    <div>
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-[11px] font-bold text-ink">${esc(label)}</p>
          <p class="mt-0.5 text-[10px] font-medium text-faint">${formatRupiah(data.spent)} <span class="text-faint/70">dari</span> ${formatRupiah(data.limit)}</p>
        </div>
        <span class="text-[11px] font-extrabold tabular-nums" style="color:${color}">${Math.round(data.percent)}%</span>
      </div>
      <div class="progress-track mt-2.5" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(data.percent)}" data-action="open-settings" data-tab="budget">
        <span class="progress-fill" style="width:${percent}%;background:${color}"></span>
      </div>
      <div class="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold">
        <span style="color:${color}">${data.state === 'danger' ? (data.over > 0 ? 'Over budget' : 'Limit habis') : data.state === 'warning' ? 'Hampir habis' : 'Terkendali'}</span>
        <span class="text-faint">${detail}</span>
      </div>
    </div>`;
}

function renderDashboard() {
  const now = new Date();
  const safe = safeToSpendInfo();
  const alerts = getCurrentAlerts();
  const budgets = getBudgetSnapshot();
  const streak = computeStreak();
  const monthStats = currentMonthStats();
  const categories = currentMonthCategoryTotals();
  const topCategory = categories[0];
  const upcoming = activeSubscriptions().slice(0, 3);
  const recent = sortedTransactions().slice(0, 5);
  const hasData = state.transactions.length > 0 || state.subscriptions.length > 0;
  const noIncome = monthStats.income === 0;
  const weeklyData = lastSevenDays();
  const weeklyTotal = weeklyData.reduce((sum, d) => sum + d.value, 0);

  const safeMessage = safe.available < 0
    ? 'Saldo belum cukup untuk menutup tagihan rutin bulan ini.'
    : safe.daily === 0
      ? 'Jatah harian habis. Tahan pengeluaran sampai ada uang masuk.'
      : 'Angka ini sudah memperhitungkan tagihan rutin yang belum dibayar.';

  const alertHtml = alerts.map(renderAlertBanner).join('');

  return `
  <section class="page-enter">
    ${sectionHeading(
      `DASHBOARD · ${formatDateLong(now).toUpperCase()}`,
      `${dayGreeting()}, ${APP_CONFIG.ownerName}.`,
      'Ini kondisi uangmu hari ini. Tenang, semuanya tercatat.',
      `<button type="button" class="btn-primary" data-route="add">
        <i data-lucide="plus" class="h-4 w-4"></i> Catat transaksi
      </button>`
    )}

    ${alertHtml}

    ${!hasData ? `
      <div class="onboarding-strip">
        <span class="onboarding-icon"><i data-lucide="sparkles" class="h-5 w-5"></i></span>
        <div class="min-w-0 flex-1">
          <p class="text-[12.5px] font-extrabold text-ink">Mulai dari satu catatan kecil.</p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-muted">Masukkan uang jajan bulan ini, atur limit, lalu catat pengeluaran pertamamu. Dashboard akan hidup otomatis.</p>
        </div>
        <button type="button" class="btn-secondary shrink-0" data-route="add" data-add-type="income">
          Catat uang masuk <i data-lucide="arrow-right" class="h-3.5 w-3.5"></i>
        </button>
      </div>` : ''}

    <div class="bento-grid">
      <!-- HERO: Jatah aman -->
      <article class="hero-card col-span-12 xl:col-span-8">
        <div class="hero-grid-deco" aria-hidden="true"></div>
        <div class="hero-orb" aria-hidden="true"></div>
        <div class="relative z-10 flex h-full flex-col justify-between gap-7">
          <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div class="max-w-[480px]">
              <div class="flex items-center gap-2">
                <span class="hero-pulse"></span>
                <p class="text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-300/80">Jatah aman hari ini</p>
                <button type="button" class="hero-info" data-action="safe-info" aria-label="Cara menghitung jatah aman">
                  <i data-lucide="info" class="h-3.5 w-3.5"></i>
                </button>
              </div>
              <p class="hero-amount mt-4">${formatRupiah(safe.daily)}</p>
              <p class="mt-3 max-w-[410px] text-[12px] leading-relaxed text-white/55">${esc(safeMessage)}</p>
              <div class="mt-6 flex flex-wrap gap-2.5">
                <button type="button" class="hero-cta" data-route="add">
                  <i data-lucide="plus" class="h-4 w-4"></i> Catat pengeluaran
                </button>
                <button type="button" class="hero-secondary-cta" data-route="subscriptions">
                  Lihat tagihan <i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i>
                </button>
              </div>
            </div>

            <div class="hero-receipt">
              <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">Rincian hari ini</p>
              <div class="mt-3 space-y-2.5">
                <div class="hero-receipt-row">
                  <span>Sisa saldo</span>
                  <span>${formatRupiah(safe.balance)}</span>
                </div>
                <div class="hero-receipt-row">
                  <span>Cadangan tagihan</span>
                  <span class="text-amber-300/90">−${formatRupiah(safe.reserved)}</span>
                </div>
                <div class="hero-receipt-row">
                  <span>Sisa hari</span>
                  <span>${safe.daysRemaining} hari</span>
                </div>
                <div class="border-t border-white/10 pt-2.5">
                  <div class="hero-receipt-row">
                    <span class="text-white/60">Terpakai hari ini</span>
                    <span class="text-white">${formatRupiah(safe.spentToday)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[10px] font-semibold text-white/38">
            <span class="flex items-center gap-1.5"><i data-lucide="shield-check" class="h-3.5 w-3.5 text-emerald-400/70"></i> Data lokal</span>
            <span class="flex items-center gap-1.5"><i data-lucide="repeat-2" class="h-3.5 w-3.5 text-emerald-400/70"></i> ${safe.reservedCount} tagihan dicadangkan</span>
            <span class="ml-auto hidden font-mono text-[9px] tracking-wide text-white/25 sm:inline">SALDO − TAGIHAN ÷ HARI</span>
          </div>
        </div>
      </article>

      <!-- Kolom kanan hero -->
      <div class="col-span-12 flex flex-col gap-4 xl:col-span-4">
        <article class="surface-card streak-card flex-1">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="eyebrow">STREAK HEMAT</p>
              <div class="mt-2 flex items-end gap-2">
                <p class="text-[38px] font-extrabold leading-none tracking-[-0.06em] tabular-nums text-ink">${streak.days}</p>
                <span class="pb-1 text-[11px] font-bold text-muted">hari</span>
              </div>
              <p class="mt-1.5 text-[11px] font-semibold text-muted">tanpa over-budget</p>
            </div>
            <span class="streak-flame ${streak.days > 0 ? '' : 'streak-flame-muted'}">
              <i data-lucide="flame" class="h-5 w-5"></i>
            </span>
          </div>
          <div class="mt-5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              ${streak.statuses.map((s) => `
                <span class="streak-day ${s.safe ? 'is-safe' : 'is-over'}" title="${DAY_NAMES[s.date.getDay()]}, ${s.date.getDate()} ${MONTH_SHORT[s.date.getMonth()]}"></span>
              `).join('')}
            </div>
            <span class="text-[9px] font-bold uppercase tracking-[0.12em] text-faint">7 hari terakhir</span>
          </div>
          <p class="mt-3.5 text-[10.5px] leading-relaxed text-faint">
            ${streak.noData ? 'Catat transaksi pertamamu untuk mulai membangun streak.' : streak.days > 0 ? 'Pertahankan ritme belanja yang sehat minggu ini.' : 'Tetap pelan. Besok adalah hari baru untuk mulai lagi.'}
          </p>
        </article>

        <article class="surface-card flex-1">
          <div class="flex items-start justify-between">
            <div>
              <p class="eyebrow">ARUS KAS</p>
              <p class="mt-1.5 text-[11px] font-bold text-ink">${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}</p>
            </div>
            <span class="mini-badge">Bulan ini</span>
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 text-[11px] font-semibold text-muted"><span class="flow-dot bg-emerald-500"></span> Uang masuk</span>
              <span class="money text-[12px] font-semibold text-primary">${formatRupiah(monthStats.income)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 text-[11px] font-semibold text-muted"><span class="flow-dot bg-[#EF4444]"></span> Uang keluar</span>
              <span class="money text-[12px] font-semibold text-ink">${formatRupiah(monthStats.expense)}</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-line pt-3.5">
            <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">Arus bersih</span>
            <span class="money text-[13px] font-bold ${monthStats.net >= 0 ? 'text-primary' : 'text-danger'}">${monthStats.net >= 0 ? '+' : ''}${formatRupiah(monthStats.net)}</span>
          </div>
          ${noIncome ? `<button type="button" class="mt-3 flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2 text-left text-[10px] font-semibold text-muted transition hover:text-primary" data-route="add" data-add-type="income">Belum ada uang masuk bulan ini <i data-lucide="arrow-right" class="h-3 w-3"></i></button>` : ''}
        </article>
      </div>

      <!-- Budget -->
      <article class="surface-card col-span-12 lg:col-span-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">KENDALI BUDGET</p>
            <h2 class="card-title mt-1.5">Batas pengeluaran</h2>
          </div>
          <button type="button" class="text-link" data-action="open-settings" data-tab="budget">Atur limit <i data-lucide="arrow-up-right" class="h-3 w-3"></i></button>
        </div>
        <div class="mt-5 space-y-5">
          ${budgetBar('Minggu ini', budgets.week)}
          ${budgetBar('Bulan ini', budgets.month)}
        </div>
        <div class="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5">
          <i data-lucide="${budgets.month.state === 'danger' ? 'circle-alert' : budgets.month.state === 'warning' ? 'triangle-alert' : 'badge-check'}" class="h-3.5 w-3.5 shrink-0 ${budgets.month.state === 'danger' ? 'text-danger' : budgets.month.state === 'warning' ? 'text-warning' : 'text-primary'}"></i>
          <p class="text-[10px] leading-relaxed text-muted">
            ${budgets.month.state === 'danger'
              ? 'Kamu sudah menyentuh batas bulanan. Prioritaskan kebutuhan pokok.'
              : budgets.month.state === 'warning'
                ? `Sisa ${formatRupiah(budgets.month.remaining)} untuk ${safe.daysRemaining} hari ke depan.`
                : 'Ritme belanja masih aman. Jaga terus, ya.'}
          </p>
        </div>
      </article>

      <!-- Quick add -->
      <article class="surface-card col-span-12 lg:col-span-7">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">CATAT KILAT</p>
            <h2 class="card-title mt-1.5">Sekali ketuk, langsung tercatat.</h2>
          </div>
          <span class="quick-badge"><i data-lucide="zap" class="h-3 w-3"></i> 1 tap</span>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          ${APP_CONFIG.quickAdds.map((preset, index) => {
            const meta = categoryMeta(preset.category);
            return `
              <button type="button" class="quick-add" data-action="quick-add" data-preset="${index}">
                <span class="quick-add-icon" style="color:${meta.color};background:${hexToRgba(meta.color, 0.11)}">
                  <i data-lucide="${preset.icon}" class="h-4 w-4"></i>
                </span>
                <span class="mt-3 block text-left text-[10.5px] font-bold leading-tight text-ink">${esc(preset.label)}</span>
                <span class="mt-1 block text-left font-mono text-[10px] font-semibold tabular-nums text-faint">${formatRupiah(preset.amount)}</span>
              </button>`;
          }).join('')}
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p class="text-[10px] leading-relaxed text-faint">Pengeluaran rutin langsung masuk kategori yang tepat.</p>
          <button type="button" class="text-link" data-route="add">Catat manual <i data-lucide="arrow-right" class="h-3 w-3"></i></button>
        </div>
      </article>

      <!-- Tren 7 hari -->
      <article class="surface-card col-span-12 lg:col-span-7">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">TREN PENGELUARAN</p>
            <h2 class="card-title mt-1.5">Tujuh hari terakhir</h2>
          </div>
          <div class="text-right">
            <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Total</p>
            <p class="money mt-0.5 text-[13px] font-bold text-ink">${formatRupiah(weeklyTotal)}</p>
          </div>
        </div>
        <div class="chart-box mt-4">
          ${weeklyTotal > 0
            ? '<canvas id="chart-spending" aria-label="Grafik pengeluaran tujuh hari terakhir" role="img"></canvas>'
            : emptyState('chart-column', 'Belum ada grafik', 'Pengeluaran tujuh hari terakhir akan tampil di sini.')}
        </div>
      </article>

      <!-- Donut -->
      <article class="surface-card col-span-12 lg:col-span-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">KEBOCORAN TERBESAR</p>
            <h2 class="card-title mt-1.5">Ke mana uang pergi?</h2>
          </div>
          <span class="mini-badge">${MONTH_SHORT[now.getMonth()]}</span>
        </div>
        ${categories.length ? `
          <div class="mt-2 flex items-center justify-center">
            <div class="donut-wrap">
              <canvas id="chart-categories" aria-label="Grafik donut pengeluaran per kategori" role="img"></canvas>
              <div class="donut-center">
                <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Bulan ini</span>
                <span class="money mt-0.5 block text-[15px] font-extrabold text-ink">${formatRupiah(monthStats.expense)}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 space-y-2">
            ${categories.slice(0, 3).map((cat) => `
              <div class="flex items-center gap-2.5">
                <span class="h-2 w-2 shrink-0 rounded-full" style="background:${cat.color}"></span>
                <span class="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-muted">${esc(cat.name)}</span>
                <span class="money text-[10.5px] font-semibold text-ink">${formatRupiah(cat.value)}</span>
                <span class="w-8 text-right text-[9.5px] font-bold text-faint">${Math.round((cat.value / monthStats.expense) * 100)}%</span>
              </div>`).join('')}
          </div>
          ${topCategory ? `<p class="mt-3 border-t border-line pt-3 text-[10px] leading-relaxed text-faint">Terbesar: <span class="font-bold text-muted">${esc(topCategory.name)}</span>. Cek apakah porsinya masih masuk akal.</p>` : ''}
        ` : emptyState('chart-pie', 'Belum ada pengeluaran', 'Catat pengeluaran pertamamu untuk melihat pola kebocoran.')}
      </article>

      <!-- Langganan -->
      <article class="surface-card col-span-12 lg:col-span-7">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">RADAR LANGGANAN</p>
            <h2 class="card-title mt-1.5">Tagihan mendatang</h2>
          </div>
          <button type="button" class="text-link" data-route="subscriptions">Semua <i data-lucide="arrow-up-right" class="h-3 w-3"></i></button>
        </div>
        ${upcoming.length ? `
          <div class="mt-4 divide-y divide-line">
            ${upcoming.map((sub) => {
              const tone = subscriptionDueTone(sub);
              return `
                <div class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span class="sub-initial">${esc(sub.name.slice(0, 2).toUpperCase())}</span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[12px] font-bold text-ink">${esc(sub.name)}</p>
                    <p class="mt-0.5 text-[10px] font-medium text-faint">${sub.cycle === 'weekly' ? 'Mingguan' : 'Bulanan'} · ${formatDateMedium(sub.nextDue)}</p>
                  </div>
                  <div class="text-right">
                    <p class="money text-[11.5px] font-semibold text-ink">${formatRupiah(sub.amount)}</p>
                    <p class="due-label mt-0.5 ${tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-faint'}">${subscriptionDueLabel(sub)}</p>
                  </div>
                </div>`;
            }).join('')}
          </div>
          <div class="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface2 p-3">
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Total tagihan bulan ini</p>
              <p class="money mt-1 text-[12px] font-extrabold text-ink">${formatRupiah(safe.reserved)}</p>
            </div>
            <button type="button" class="text-link" data-route="subscriptions">Kelola tagihan <i data-lucide="arrow-up-right" class="h-3 w-3"></i></button>
          </div>
        ` : emptyState('refresh-cw', 'Belum ada langganan', 'Catat kuota, Spotify, atau bensin rutin agar tagihan tak terlewat.', `<button type="button" class="btn-secondary btn-sm" data-route="subscriptions">Tambah langganan</button>`)}
      </article>

      <!-- Transaksi terbaru -->
      <article class="surface-card col-span-12 lg:col-span-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">AKTIVITAS</p>
            <h2 class="card-title mt-1.5">Transaksi terbaru</h2>
          </div>
          <button type="button" class="text-link" data-route="history">Riwayat <i data-lucide="arrow-up-right" class="h-3 w-3"></i></button>
        </div>
        ${recent.length ? `
          <div class="mt-4 divide-y divide-line">
            ${recent.map((t) => transactionRow(t)).join('')}
          </div>
        ` : emptyState('receipt-text', 'Masih rapi dan kosong', 'Setiap transaksi yang kamu catat akan muncul di sini.', `<button type="button" class="btn-secondary btn-sm" data-route="add">Catat sekarang</button>`)}
      </article>
    </div>
  </section>`;
}

function lastSevenDays() {
  const today = dateOnly(new Date());
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = toDateKey(day);
    const value = sumTransactions(transactionsInRange(key, key, 'expense'));
    days.push({ date: day, key, label: DAY_SHORT[day.getDay()], value, isToday: i === 0 });
  }
  return days;
}

/* ----------------------------------------------------------------------------
   HALAMAN CATAT TRANSAKSI
---------------------------------------------------------------------------- */
function categoryButtonsHtml(type, selected) {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.map((cat) => `
    <button type="button" class="category-option ${cat.name === selected ? 'is-selected' : ''}" data-action="select-category" data-category="${esc(cat.name)}">
      <span class="category-option-icon" style="color:${cat.color};background:${hexToRgba(cat.color, 0.11)}">
        <i data-lucide="${cat.icon}" class="h-4 w-4"></i>
      </span>
      <span class="min-w-0 flex-1 text-left text-[10px] font-bold leading-[1.22]">${esc(cat.name)}</span>
    </button>`).join('');
}

function renderAddPage() {
  const addType = APP_UI.addType;
  const categories = addType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const selectedCategory = APP_UI.addCategory[addType] || categories[0].name;
  const safe = safeToSpendInfo();
  const today = todayStats();
  const recent = sortedTransactions().slice(0, 4);

  return `
  <section class="page-enter">
    ${sectionHeading('CATAT TRANSAKSI', 'Uang keluar, uang masuk.', 'Satu menit mencatat, sebulan lebih tenang.')}
    <div class="bento-grid mt-1">
      <article class="surface-card col-span-12 overflow-hidden lg:col-span-7">
        <form id="transaction-form" novalidate>
          <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div class="segmented" role="group" aria-label="Jenis transaksi">
              <button type="button" class="${addType === 'expense' ? 'is-active is-expense' : ''}" data-action="entry-type" data-type="expense">
                <i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i> Uang keluar
              </button>
              <button type="button" class="${addType === 'income' ? 'is-active is-income' : ''}" data-action="entry-type" data-type="income">
                <i data-lucide="arrow-down-left" class="h-3.5 w-3.5"></i> Uang masuk
              </button>
            </div>
            <span class="hidden items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-faint sm:flex">
              <i data-lucide="shield-check" class="h-3 w-3"></i> Tersimpan lokal
            </span>
          </div>

          <div class="space-y-6 px-5 py-6 sm:px-6">
            <div>
              <label for="transaction-amount" class="field-label">Nominal</label>
              <div class="amount-input-wrap mt-2" id="amount-wrap">
                <span class="amount-currency">Rp</span>
                <input id="transaction-amount" name="amount" data-money-input inputmode="numeric" autocomplete="off"
                  class="amount-input" placeholder="0" maxlength="16" aria-describedby="amount-error" />
              </div>
              <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Cepat:</span>
                ${[10000, 15000, 20000, 50000].map((amount) => `
                  <button type="button" class="amount-chip" data-action="quick-amount" data-amount="${amount}">+ ${formatRupiah(amount)}</button>
                `).join('')}
              </div>
              <p id="amount-error" class="form-error" role="alert"></p>
            </div>

            <div>
              <div class="flex items-center justify-between">
                <label class="field-label">Kategori</label>
                <span class="text-[9px] font-semibold text-faint">Pilih satu</span>
              </div>
              <div id="category-options" class="mt-2 grid grid-cols-2 gap-2">
                ${categoryButtonsHtml(addType, selectedCategory)}
              </div>
              <p id="category-error" class="form-error" role="alert"></p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="transaction-date" class="field-label">Tanggal</label>
                <div class="input-icon-wrap mt-2">
                  <i data-lucide="calendar-days" class="input-icon"></i>
                  <input id="transaction-date" name="date" type="date" class="text-input pl-10" value="${toDateKey()}" max="${toDateKey()}" aria-describedby="date-error" />
                </div>
                <p id="date-error" class="form-error" role="alert"></p>
              </div>
              <div>
                <label for="transaction-note" class="field-label">Keterangan</label>
                <input id="transaction-note" name="note" type="text" class="text-input mt-2" maxlength="80"
                  placeholder="${addType === 'income' ? 'mis. Uang jajan dari Mama' : 'mis. Makan siang di kantin'}" aria-describedby="note-error" />
                <p id="note-error" class="form-error" role="alert"></p>
              </div>
            </div>

            <input type="hidden" name="type" id="entry-type" value="${addType}" />
            <input type="hidden" name="category" id="entry-category" value="${esc(selectedCategory)}" />
            <p id="form-error" class="form-error" role="alert"></p>

            <div class="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-[10px] leading-relaxed text-faint">Nominal tidak boleh minus. Data langsung tersimpan.</p>
              <button type="submit" class="btn-primary btn-submit" id="submit-transaction">
                <i data-lucide="check" class="h-4 w-4"></i>
                <span>${addType === 'income' ? 'Simpan uang masuk' : 'Simpan pengeluaran'}</span>
              </button>
            </div>
          </div>
        </form>
      </article>

      <div class="col-span-12 flex flex-col gap-4 lg:col-span-5">
        <article class="surface-card overflow-hidden bg-[#0C2E24] !border-[#163f33] text-white">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/75">JATAH AMAN HARI INI</p>
              <p class="mt-2 font-mono text-[28px] font-bold leading-none tabular-nums tracking-[-0.04em]">${formatRupiah(safe.daily)}</p>
            </div>
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-300"><i data-lucide="shield-check" class="h-4 w-4"></i></span>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <p class="text-[9px] font-semibold text-white/35">Terpakai hari ini</p>
              <p class="money mt-1 text-[11.5px] font-semibold text-white">${formatRupiah(today.expense)}</p>
            </div>
            <div>
              <p class="text-[9px] font-semibold text-white/35">Sisa hari</p>
              <p class="money mt-1 text-[11.5px] font-semibold text-white">${safe.daysRemaining} hari</p>
            </div>
          </div>
          <p class="mt-4 text-[10px] leading-relaxed text-white/40">Jatah aman menyesuaikan otomatis setelah transaksi tersimpan.</p>
        </article>

        <article class="surface-card">
          <div class="flex items-center justify-between">
            <div>
              <p class="eyebrow">PRESET RUTIN</p>
              <h3 class="mt-1 text-[13px] font-extrabold text-ink">Sekali ketuk</h3>
            </div>
            <i data-lucide="zap" class="h-4 w-4 text-warning"></i>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2">
            ${APP_CONFIG.quickAdds.slice(0, 4).map((preset, index) => `
              <button type="button" class="preset-row" data-action="quick-add" data-preset="${index}">
                <span class="preset-icon"><i data-lucide="${preset.icon}" class="h-3.5 w-3.5"></i></span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-left text-[10px] font-bold text-ink">${esc(preset.label)}</span>
                  <span class="mt-0.5 block text-left font-mono text-[9px] font-semibold text-faint">${formatRupiah(preset.amount)}</span>
                </span>
                <i data-lucide="plus" class="h-3 w-3 shrink-0 text-faint"></i>
              </button>`).join('')}
          </div>
        </article>

        <article class="surface-card flex-1">
          <div class="flex items-center justify-between">
            <div>
              <p class="eyebrow">TERAKHIR DICATAT</p>
              <h3 class="mt-1 text-[13px] font-extrabold text-ink">Transaksi terbaru</h3>
            </div>
            <button type="button" class="text-link" data-route="history">Semua <i data-lucide="arrow-up-right" class="h-3 w-3"></i></button>
          </div>
          ${recent.length
            ? `<div class="mt-3 divide-y divide-line">${recent.map((t) => transactionRow(t, { hideActions: true })).join('')}</div>`
            : emptyState('receipt-text', 'Belum ada transaksi', 'Catatan pertamamu akan muncul di sini.')}
        </article>
      </div>
    </div>
  </section>`;
}

/* ----------------------------------------------------------------------------
   HALAMAN LANGGANAN
---------------------------------------------------------------------------- */
const SUB_COLORS = ['#0F766E', '#B45309', '#4338CA', '#BE123C', '#0369A1', '#4D7C0F'];

function subscriptionColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SUB_COLORS[hash % SUB_COLORS.length];
}

function subscriptionCard(sub) {
  const tone = subscriptionDueTone(sub);
  const color = subscriptionColor(sub.name);
  const monthlyEquivalent = sub.cycle === 'weekly' ? sub.amount * 4.33 : sub.amount;
  return `
    <article class="sub-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="sub-logo" style="color:${color};background:${hexToRgba(color, 0.1)}">${esc(sub.name.slice(0, 2).toUpperCase())}</span>
          <div class="min-w-0">
            <h3 class="truncate text-[13px] font-extrabold tracking-tight text-ink">${esc(sub.name)}</h3>
            <p class="mt-0.5 text-[10px] font-medium text-faint">${sub.cycle === 'weekly' ? 'Mingguan' : 'Bulanan'} · ±${formatRupiah(monthlyEquivalent)}/bln</p>
          </div>
        </div>
        <div class="flex shrink-0 gap-0.5">
          <button type="button" class="mini-icon-btn" data-action="edit-subscription" data-id="${esc(sub.id)}" aria-label="Edit langganan ${esc(sub.name)}" title="Edit"><i data-lucide="pencil" class="h-3.5 w-3.5"></i></button>
          <button type="button" class="mini-icon-btn mini-icon-btn-danger" data-action="delete-subscription" data-id="${esc(sub.id)}" aria-label="Hapus langganan ${esc(sub.name)}" title="Hapus"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i></button>
        </div>
      </div>

      <div class="mt-5 flex items-end justify-between gap-3">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Nominal</p>
          <p class="money mt-1 text-[20px] font-extrabold tracking-tight text-ink">${formatRupiah(sub.amount)}</p>
        </div>
        <span class="cycle-badge"><i data-lucide="${sub.cycle === 'weekly' ? 'calendar-range' : 'calendar-days'}" class="h-3 w-3"></i> ${sub.cycle === 'weekly' ? 'Tiap minggu' : 'Tiap bulan'}</span>
      </div>

      <div class="mt-4 rounded-xl bg-surface2 p-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-faint">Jatuh tempo</p>
            <p class="mt-1 text-[11px] font-bold text-ink">${formatDateMedium(sub.nextDue)}</p>
          </div>
          <span class="due-pill ${tone === 'danger' ? 'due-danger' : tone === 'warning' ? 'due-warning' : 'due-neutral'}">${subscriptionDueLabel(sub)}</span>
        </div>
      </div>

      <button type="button" class="btn-pay mt-4" data-action="pay-subscription" data-id="${esc(sub.id)}">
        <i data-lucide="check-circle-2" class="h-4 w-4"></i>
        Bayar &amp; catat
        <span class="ml-auto font-mono text-[10px] font-semibold opacity-60">${formatRupiah(sub.amount)}</span>
      </button>
    </article>`;
}

function renderSubscriptionsPage() {
  const now = new Date();
  const subs = activeSubscriptions();
  const dueMonth = reservedSubscriptionsThisMonth();
  const dueMonthTotal = sumTransactions(dueMonth);
  const monthlyEstimate = subs.reduce((sum, s) => sum + (s.cycle === 'weekly' ? s.amount * 4.33 : s.amount), 0);
  const nearest = subs[0];
  const overdueCount = subs.filter((s) => subscriptionDaysLeft(s) < 0).length;

  return `
  <section class="page-enter">
    ${sectionHeading(
      'LANGGANAN & RUTINITAS',
      'Radar tagihan.',
      'Catat yang berulang sekali saja. Sisanya biar aplikasi mengingatkan.',
      `<button type="button" class="btn-primary" data-action="add-subscription"><i data-lucide="plus" class="h-4 w-4"></i> Tambah langganan</button>`
    )}

    <div class="bento-grid mt-1">
      <article class="surface-card col-span-12 lg:col-span-8">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">RINGKASAN RUTINITAS</p>
            <h2 class="card-title mt-1.5">Beban bulan ini</h2>
          </div>
          <span class="mini-badge">${MONTH_SHORT[now.getMonth()]} ${now.getFullYear()}</span>
        </div>
        <div class="mt-5 grid grid-cols-3 gap-3">
          <div class="subscription-metric">
            <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-faint">Belum dibayar</p>
            <p class="money mt-2 text-[13px] font-extrabold leading-tight text-ink sm:text-[16px]">${formatRupiah(dueMonthTotal)}</p>
            <p class="mt-1.5 text-[9px] font-medium text-faint">${dueMonth.length} tagihan</p>
          </div>
          <div class="subscription-metric">
            <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-faint">Estimasi / bulan</p>
            <p class="money mt-2 text-[13px] font-extrabold leading-tight text-ink sm:text-[16px]">${formatRupiah(monthlyEstimate)}</p>
            <p class="mt-1.5 text-[9px] font-medium text-faint">semua rutinitas</p>
          </div>
          <div class="subscription-metric">
            <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-faint">Langganan aktif</p>
            <p class="money mt-2 text-[13px] font-extrabold leading-tight text-ink sm:text-[16px]">${subs.length}</p>
            <p class="mt-1.5 text-[9px] font-medium ${overdueCount ? 'text-danger' : 'text-faint'}">${overdueCount ? `${overdueCount} terlambat` : 'semua terpantau'}</p>
          </div>
        </div>
        <div class="mt-5 flex items-start gap-2 rounded-xl border border-dashed border-line p-3">
          <i data-lucide="info" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted"></i>
          <p class="text-[10px] leading-relaxed text-muted">Total tagihan bulan ini otomatis dicadangkan dari perhitungan <span class="font-bold text-ink">Jatah Aman Hari Ini</span>, jadi uang jajanmu tidak akan terpakai untuk tagihan.</p>
        </div>
      </article>

      <article class="surface-card col-span-12 flex flex-col justify-between lg:col-span-4">
        <div>
          <div class="flex items-center justify-between">
            <p class="eyebrow">TAGIHAN TERDEKAT</p>
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary"><i data-lucide="bell" class="h-4 w-4"></i></span>
          </div>
          ${nearest ? `
            <div class="mt-4 flex items-center gap-3">
              <span class="sub-logo" style="color:${subscriptionColor(nearest.name)};background:${hexToRgba(subscriptionColor(nearest.name), 0.1)}">${esc(nearest.name.slice(0, 2).toUpperCase())}</span>
              <div>
                <p class="text-[13px] font-extrabold text-ink">${esc(nearest.name)}</p>
                <p class="mt-0.5 text-[10px] font-medium ${subscriptionDueTone(nearest) === 'danger' ? 'text-danger' : subscriptionDueTone(nearest) === 'warning' ? 'text-warning' : 'text-muted'}">${subscriptionDueLabel(nearest)} · ${formatDateMedium(nearest.nextDue)}</p>
              </div>
            </div>
            <p class="money mt-4 text-[24px] font-extrabold tracking-tight text-ink">${formatRupiah(nearest.amount)}</p>
            <button type="button" class="btn-secondary btn-sm mt-4 w-full justify-center" data-action="pay-subscription" data-id="${esc(nearest.id)}">
              <i data-lucide="check" class="h-3.5 w-3.5"></i> Bayar sekarang
            </button>
          ` : emptyState('bell-off', 'Tidak ada tagihan', 'Tambahkan langganan pertamamu untuk mulai memantau.')}
        </div>
        <p class="mt-4 border-t border-line pt-3 text-[9.5px] leading-relaxed text-faint">Pembayaran otomatis tercatat di riwayat dan menggeser jatuh tempo berikutnya.</p>
      </article>

      <div class="col-span-12">
        ${subs.length ? `
          <div class="flex items-end justify-between gap-3 pb-1">
            <div>
              <p class="eyebrow">DAFTAR RUTINITAS</p>
              <h2 class="card-title mt-1.5">${subs.length} langganan aktif</h2>
            </div>
            <p class="hidden text-[10px] font-medium text-faint sm:block">Diurutkan dari jatuh tempo terdekat</p>
          </div>
          <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            ${subs.map(subscriptionCard).join('')}
          </div>
        ` : `
          <article class="surface-card">
            ${emptyState(
              'refresh-cw',
              'Belum ada langganan',
              'Mulai dari yang paling sering: kuota, musik, atau bensin mingguan. Aplikasi akan mengingatkanmu sebelum jatuh tempo.',
              `<div class="flex flex-wrap justify-center gap-2">
                <button type="button" class="btn-primary btn-sm" data-action="add-subscription"><i data-lucide="plus" class="h-3.5 w-3.5"></i> Tambah langganan</button>
              </div>`
            )}
            <div class="mx-auto max-w-xl border-t border-line px-5 py-5">
              <p class="text-center text-[9px] font-bold uppercase tracking-[0.12em] text-faint">Atau mulai dari contoh</p>
              <div class="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" class="suggestion-chip" data-action="add-subscription" data-suggestion="kuota"><i data-lucide="smartphone" class="h-3.5 w-3.5"></i> Kuota internet</button>
                <button type="button" class="suggestion-chip" data-action="add-subscription" data-suggestion="musik"><i data-lucide="music-2" class="h-3.5 w-3.5"></i> Spotify</button>
                <button type="button" class="suggestion-chip" data-action="add-subscription" data-suggestion="bensin"><i data-lucide="fuel" class="h-3.5 w-3.5"></i> Bensin mingguan</button>
              </div>
            </div>
          </article>
        `}
      </div>
    </div>
  </section>`;
}

/* ----------------------------------------------------------------------------
   HALAMAN RIWAYAT, ANALISIS & BACKUP
---------------------------------------------------------------------------- */
function getFilteredTransactions() {
  const filters = APP_UI.historyFilters;
  const q = filters.q.trim().toLowerCase();
  return sortedTransactions().filter((t) => {
    if (filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.category !== 'all' && t.category !== filters.category) return false;
    if (filters.month !== 'all' && !t.date.startsWith(filters.month)) return false;
    if (q && !`${t.note} ${t.category} ${formatRupiah(t.amount)}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function groupTransactionsByDate(list) {
  const groups = new Map();
  list.forEach((t) => {
    if (!groups.has(t.date)) groups.set(t.date, []);
    groups.get(t.date).push(t);
  });
  return Array.from(groups.entries());
}

function dateGroupLabel(key) {
  const today = toDateKey();
  const yesterday = toDateKey(addDays(new Date(), -1));
  if (key === today) return 'Hari ini';
  if (key === yesterday) return 'Kemarin';
  const date = parseDateKey(key);
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function renderHistoryPage() {
  const filtered = getFilteredTransactions();
  const filteredStats = {
    income: sumTransactions(filtered.filter((t) => t.type === 'income')),
    expense: sumTransactions(filtered.filter((t) => t.type === 'expense'))
  };
  filteredStats.net = filteredStats.income - filteredStats.expense;
  const groups = groupTransactionsByDate(filtered);
  const months = getAvailableMonths();
  const filters = APP_UI.historyFilters;
  const isFiltered = filters.q || filters.type !== 'all' || filters.category !== 'all' || filters.month !== 'all';
  const categories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.some((e) => e.name === c.name))];
  const monthExpense = currentMonthStats().expense;
  const categoriesData = currentMonthCategoryTotals();
  const monthlyTotal = categoriesData.reduce((sum, c) => sum + c.value, 0);
  const backupCount = state.transactions.length + state.subscriptions.length;

  return `
  <section class="page-enter">
    ${sectionHeading(
      'RIWAYAT & BACKUP',
      'Semua jejak uangmu.',
      `${state.transactions.length} transaksi dan ${state.subscriptions.length} langganan tersimpan lokal.`,
      `<div class="flex gap-2">
        <button type="button" class="btn-secondary hidden sm:inline-flex" data-action="export-csv"><i data-lucide="file-spreadsheet" class="h-4 w-4"></i> Export CSV</button>
        <button type="button" class="btn-primary" data-route="add"><i data-lucide="plus" class="h-4 w-4"></i> Catat</button>
      </div>`
    )}

    <div class="bento-grid mt-1">
      <article class="surface-card col-span-12 md:col-span-4">
        <div class="flex items-center justify-between">
          <p class="eyebrow">TOTAL MASUK</p>
          <span class="flow-icon flow-icon-income"><i data-lucide="arrow-down-left" class="h-3.5 w-3.5"></i></span>
        </div>
        <p class="money mt-3 text-[20px] font-extrabold tracking-tight text-ink">${formatRupiah(filteredStats.income)}</p>
        <p class="mt-1.5 text-[10px] font-medium text-faint">${isFiltered ? 'sesuai filter aktif' : 'dari semua catatan'}</p>
      </article>
      <article class="surface-card col-span-12 md:col-span-4">
        <div class="flex items-center justify-between">
          <p class="eyebrow">TOTAL KELUAR</p>
          <span class="flow-icon flow-icon-expense"><i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i></span>
        </div>
        <p class="money mt-3 text-[20px] font-extrabold tracking-tight text-ink">${formatRupiah(filteredStats.expense)}</p>
        <p class="mt-1.5 text-[10px] font-medium text-faint">${isFiltered ? 'sesuai filter aktif' : 'dari semua catatan'}</p>
      </article>
      <article class="surface-card col-span-12 md:col-span-4">
        <div class="flex items-center justify-between">
          <p class="eyebrow">ARUS BERSIH</p>
          <span class="flow-icon ${filteredStats.net >= 0 ? 'flow-icon-income' : 'flow-icon-expense'}"><i data-lucide="${filteredStats.net >= 0 ? 'trending-up' : 'trending-down'}" class="h-3.5 w-3.5"></i></span>
        </div>
        <p class="money mt-3 text-[20px] font-extrabold tracking-tight ${filteredStats.net >= 0 ? 'text-primary' : 'text-danger'}">${filteredStats.net >= 0 ? '+' : ''}${formatRupiah(filteredStats.net)}</p>
        <p class="mt-1.5 text-[10px] font-medium text-faint">${isFiltered ? 'sesuai filter aktif' : 'pemasukan − pengeluaran'}</p>
      </article>

      <article class="surface-card col-span-12 lg:col-span-7">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">ANALISIS</p>
            <h2 class="card-title mt-1.5">Tren pengeluaran</h2>
          </div>
          <span class="mini-badge">7 hari</span>
        </div>
        <div class="chart-box mt-4">
          ${lastSevenDays().some((d) => d.value > 0)
            ? '<canvas id="chart-spending" aria-label="Grafik tren pengeluaran" role="img"></canvas>'
            : emptyState('chart-column', 'Belum ada data', 'Tren akan terbentuk setelah ada pengeluaran.')}
        </div>
      </article>

      <article class="surface-card col-span-12 lg:col-span-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow">ANALISIS</p>
            <h2 class="card-title mt-1.5">Kategori terbesar</h2>
          </div>
          <span class="mini-badge">Bulan ini</span>
        </div>
        ${categoriesData.length ? `
          <div class="mt-2 flex items-center justify-center">
            <div class="donut-wrap donut-wrap-sm">
              <canvas id="chart-categories" aria-label="Grafik kategori pengeluaran" role="img"></canvas>
              <div class="donut-center">
                <span class="text-[8px] font-bold uppercase tracking-[0.1em] text-faint">Total</span>
                <span class="money mt-0.5 block text-[13px] font-extrabold text-ink">${formatCompact(monthExpense)}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            ${categoriesData.slice(0, 4).map((cat) => `
              <div class="flex min-w-0 items-center gap-1.5">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" style="background:${cat.color}"></span>
                <span class="min-w-0 flex-1 truncate text-[9.5px] font-semibold text-muted">${esc(cat.name)}</span>
                <span class="text-[9px] font-bold text-faint">${Math.round((cat.value / monthlyTotal) * 100)}%</span>
              </div>`).join('')}
          </div>
        ` : emptyState('chart-pie', 'Belum ada data', 'Kategori pengeluaran bulan ini akan muncul di sini.')}
      </article>

      <!-- Riwayat transaksi -->
      <article class="surface-card col-span-12" id="transaction-history-card">
        <div class="flex flex-col gap-4 border-b border-line pb-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="eyebrow">CATATAN LENGKAP</p>
              <h2 class="card-title mt-1.5">Riwayat transaksi</h2>
            </div>
            <span class="mini-badge">${filtered.length} hasil</span>
          </div>

          <div class="grid gap-2.5 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] md:items-end">
            <div>
              <label for="history-search" class="sr-only">Cari transaksi</label>
              <div class="input-icon-wrap">
                <i data-lucide="search" class="input-icon"></i>
                <input id="history-search" type="search" class="text-input pl-10" placeholder="Cari keterangan atau kategori…" value="${esc(filters.q)}" autocomplete="off" />
              </div>
            </div>
            <div>
              <label for="filter-type" class="sr-only">Jenis transaksi</label>
              <select id="filter-type" class="text-input select-input">
                <option value="all" ${filters.type === 'all' ? 'selected' : ''}>Semua jenis</option>
                <option value="expense" ${filters.type === 'expense' ? 'selected' : ''}>Uang keluar</option>
                <option value="income" ${filters.type === 'income' ? 'selected' : ''}>Uang masuk</option>
              </select>
            </div>
            <div>
              <label for="filter-category" class="sr-only">Kategori</label>
              <select id="filter-category" class="text-input select-input">
                <option value="all" ${filters.category === 'all' ? 'selected' : ''}>Semua kategori</option>
                ${categories.map((cat) => `<option value="${esc(cat.name)}" ${filters.category === cat.name ? 'selected' : ''}>${esc(cat.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="filter-month" class="sr-only">Bulan</label>
              <select id="filter-month" class="text-input select-input">
                <option value="all" ${filters.month === 'all' ? 'selected' : ''}>Semua bulan</option>
                ${months.map((key) => `<option value="${key}" ${filters.month === key ? 'selected' : ''}>${monthLabel(key)}</option>`).join('')}
              </select>
            </div>
            <button type="button" class="filter-reset ${isFiltered ? '' : 'invisible'}" data-action="reset-filters" title="Reset filter" aria-label="Reset semua filter">
              <i data-lucide="x" class="h-4 w-4"></i>
            </button>
          </div>
        </div>

        <div class="pt-2">
          ${groups.length ? groups.map(([date, items]) => {
            const dayNet = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
            return `
              <div class="transaction-group">
                <div class="flex items-center justify-between gap-3 py-3">
                  <p class="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted">${dateGroupLabel(date)}</p>
                  <p class="money text-[9.5px] font-semibold text-faint">${dayNet >= 0 ? '+' : ''}${formatRupiah(dayNet)}</p>
                </div>
                <div class="divide-y divide-line border-t border-line">
                  ${items.map((t) => transactionRow(t)).join('')}
                </div>
              </div>`;
          }).join('') : emptyState('search-x', isFiltered ? 'Tidak ada yang cocok' : 'Belum ada transaksi', isFiltered ? 'Coba ubah kata kunci atau reset filter.' : 'Mulai catat pemasukan dan pengeluaran pertamamu.', isFiltered ? `<button type="button" class="btn-secondary btn-sm" data-action="reset-filters">Reset filter</button>` : `<button type="button" class="btn-primary btn-sm" data-route="add">Catat transaksi</button>`)}
        </div>
      </article>

      <!-- Backup -->
      <article class="surface-card col-span-12 scroll-mt-24" id="backup-section">
        <div class="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="eyebrow">PUSAT DATA</p>
            <h2 class="card-title mt-1.5">Backup & pindah perangkat</h2>
            <p class="mt-1.5 max-w-[560px] text-[11px] leading-relaxed text-muted">Pindahkan catatan antara Mac dan HP lewat file JSON. Tidak perlu akun cloud, cukup kirim file lewat AirDrop atau aplikasi chat.</p>
          </div>
          <span class="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-primary"><i data-lucide="shield-check" class="h-3 w-3"></i> Lokal</span>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-3">
          <button type="button" class="backup-action" data-action="export-json">
            <span class="backup-icon"><i data-lucide="download" class="h-4 w-4"></i></span>
            <span class="mt-3 block text-[11.5px] font-extrabold text-ink">Backup lengkap</span>
            <span class="mt-1 block text-[10px] leading-relaxed text-faint">Export semua transaksi, langganan, dan limit ke file <span class="font-mono">.json</span>.</span>
            <span class="mt-3 flex items-center gap-1 text-[9.5px] font-bold text-primary">Unduh JSON <i data-lucide="arrow-down-to-line" class="h-3 w-3"></i></span>
          </button>
          <button type="button" class="backup-action" data-action="trigger-import">
            <span class="backup-icon backup-icon-amber"><i data-lucide="upload" class="h-4 w-4"></i></span>
            <span class="mt-3 block text-[11.5px] font-extrabold text-ink">Pulihkan data</span>
            <span class="mt-1 block text-[10px] leading-relaxed text-faint">Import file backup <span class="font-mono">.json</span> dari perangkat lain.</span>
            <span class="mt-3 flex items-center gap-1 text-[9.5px] font-bold text-warning">Pilih file <i data-lucide="arrow-up-from-line" class="h-3 w-3"></i></span>
          </button>
          <button type="button" class="backup-action" data-action="export-csv">
            <span class="backup-icon backup-icon-sky"><i data-lucide="file-spreadsheet" class="h-4 w-4"></i></span>
            <span class="mt-3 block text-[11.5px] font-extrabold text-ink">Laporan CSV</span>
            <span class="mt-1 block text-[10px] leading-relaxed text-faint">Buka di Numbers atau Excel untuk analisis lebih lanjut.</span>
            <span class="mt-3 flex items-center gap-1 text-[9.5px] font-bold text-[#0EA5E9]">Export laporan <i data-lucide="arrow-down-to-line" class="h-3 w-3"></i></span>
          </button>
        </div>

        <div class="mt-4 flex flex-col gap-3 rounded-xl bg-surface2 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted shadow-soft"><i data-lucide="database" class="h-4 w-4"></i></span>
            <div>
              <p class="text-[10.5px] font-bold text-ink">${backupCount} data tersimpan di LocalStorage</p>
              <p class="mt-0.5 text-[9px] font-medium text-faint">Terakhir diperbarui ${formatDateTime(new Date(state.updatedAt))}</p>
            </div>
          </div>
          <button type="button" class="danger-link" data-action="reset-data"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i> Hapus semua data</button>
        </div>

        <input type="file" id="import-file" class="hidden" accept="application/json,.json" />
      </article>
    </div>
  </section>`;
}

/* ----------------------------------------------------------------------------
   STATE UI, ROUTING & KERANGKA
---------------------------------------------------------------------------- */
const APP_UI = {
  route: 'dashboard',
  isUnlocked: false,
  pinBuffer: '',
  pinBusy: false,
  addType: 'expense',
  addCategory: {
    expense: EXPENSE_CATEGORIES[0].name,
    income: INCOME_CATEGORIES[0].name
  },
  historyFilters: {
    q: '',
    type: 'all',
    category: 'all',
    month: 'all'
  },
  charts: [],
  modalOpen: false,
  settingsTab: 'budget'
};

const ROUTES = ['dashboard', 'add', 'subscriptions', 'history'];
const ROUTE_TITLES = {
  dashboard: 'Dashboard',
  add: 'Catat transaksi',
  subscriptions: 'Langganan',
  history: 'Riwayat & backup'
};

function getRouteFromHash() {
  const route = window.location.hash.replace(/^#/, '');
  return ROUTES.includes(route) ? route : 'dashboard';
}

function navigate(route, options = {}) {
  if (!ROUTES.includes(route)) route = 'dashboard';
  closeModal(true);
  const targetHash = `#${route}`;
  if (window.location.hash === targetHash) {
    APP_UI.route = route;
    renderCurrentRoute(options);
  } else {
    window.location.hash = route;
  }
}

function updateNavigation() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    if (button.closest('#lock-screen')) return;
    const active = button.dataset.route === APP_UI.route;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function destroyCharts() {
  APP_UI.charts.forEach((chart) => {
    try { chart.destroy(); } catch (error) {}
  });
  APP_UI.charts = [];
}

function renderCurrentRoute(options = {}) {
  const { animate = true, preserveScroll = false, focusId = null } = options;
  destroyCharts();
  APP_UI.route = getRouteFromHash();
  updateNavigation();

  const renderers = {
    dashboard: renderDashboard,
    add: renderAddPage,
    subscriptions: renderSubscriptionsPage,
    history: renderHistoryPage
  };
  const view = document.getElementById('view');
  view.innerHTML = renderers[APP_UI.route]();

  if (!animate) {
    const section = view.querySelector('.page-enter');
    if (section) section.classList.remove('page-enter');
  }

  document.title = `${ROUTE_TITLES[APP_UI.route]} · Uang Ibra`;
  updateHeaderMeta();

  if (window.lucide) {
    window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
  }

  initChartsForRoute();
  bindHistoryFilterEvents();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      if (typeof el.setSelectionRange === 'function') {
        const length = el.value.length;
        try { el.setSelectionRange(length, length); } catch (error) {}
      }
    }
  }

  if (!preserveScroll) {
    window.scrollTo({ top: 0, behavior: animate ? 'smooth' : 'auto' });
  }
}

function updateHeaderMeta() {
  const dateEl = document.getElementById('header-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = `${DAY_SHORT[now.getDay()]}, ${now.getDate()} ${MONTH_SHORT[now.getMonth()]}`;
  }
  const greeting = document.getElementById('header-greeting');
  if (greeting) {
    const now = new Date();
    const shortDate = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_SHORT[now.getMonth()]}`;
    greeting.innerHTML = `<span class="sm:hidden">${shortDate}</span><span class="hidden sm:inline">${shortDate} ${now.getFullYear()} · data aman di perangkat ini.</span>`;
  }
}

function bindHistoryFilterEvents() {
  if (APP_UI.route !== 'history') return;

  const search = document.getElementById('history-search');
  if (search) {
    let timer = null;
    search.addEventListener('input', (event) => {
      APP_UI.historyFilters.q = event.target.value;
      clearTimeout(timer);
      timer = setTimeout(() => {
        renderCurrentRoute({ animate: false, preserveScroll: true, focusId: 'history-search' });
      }, 220);
    });
  }

  const bindSelect = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      APP_UI.historyFilters[key] = el.value;
      renderCurrentRoute({ animate: false, preserveScroll: true, focusId: id });
    });
  };
  bindSelect('filter-type', 'type');
  bindSelect('filter-category', 'category');
  bindSelect('filter-month', 'month');
}

/* ----------------------------------------------------------------------------
   TOAST & MODAL
---------------------------------------------------------------------------- */
function showToast(message, type = 'success', action = null) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const iconMap = {
    success: 'check-circle-2',
    error: 'circle-alert',
    info: 'info',
    warning: 'triangle-alert'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon"><i data-lucide="${iconMap[type] || iconMap.info}" class="h-4 w-4"></i></span>
    <p class="min-w-0 flex-1 text-[11px] font-semibold leading-relaxed text-ink">${esc(message)}</p>
    ${action ? `<button type="button" class="toast-action">${esc(action.label)}</button>` : ''}
    <button type="button" class="toast-close" aria-label="Tutup notifikasi"><i data-lucide="x" class="h-3.5 w-3.5"></i></button>
  `;
  root.appendChild(toast);
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });

  const remove = () => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 260);
  };
  const timeout = setTimeout(remove, action ? 6500 : 4200);
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timeout);
    remove();
  });
  if (action) {
    toast.querySelector('.toast-action').addEventListener('click', () => {
      clearTimeout(timeout);
      try { action.onClick(); } catch (error) { console.error(error); }
      remove();
    });
  }

  while (root.children.length > 3) root.firstElementChild.remove();
}

function openModal(content, options = {}) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal-panel ${options.wide ? 'modal-panel-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(options.label || 'Dialog')}">
        ${content}
      </div>
    </div>`;
  APP_UI.modalOpen = true;
  document.body.classList.add('modal-open');
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
  requestAnimationFrame(() => {
    const backdrop = root.querySelector('.modal-backdrop');
    if (backdrop) backdrop.classList.add('is-open');
    const focusEl = root.querySelector('[autofocus], input:not([type="hidden"]), button');
    if (focusEl) {
      try { focusEl.focus({ preventScroll: true }); } catch (error) {}
    }
  });
}

function closeModal(immediate = false) {
  const root = document.getElementById('modal-root');
  if (!root || !root.firstElementChild) return;
  APP_UI.modalOpen = false;
  document.body.classList.remove('modal-open');
  if (immediate) {
    root.innerHTML = '';
    return;
  }
  const backdrop = root.querySelector('.modal-backdrop');
  if (backdrop) backdrop.classList.remove('is-open');
  setTimeout(() => { root.innerHTML = ''; }, 220);
}

function modalHeader(kicker, title, description = '') {
  return `
    <div class="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
      <div>
        <p class="eyebrow">${esc(kicker)}</p>
        <h2 class="mt-1.5 text-[20px] font-extrabold tracking-[-0.035em] text-ink">${esc(title)}</h2>
        ${description ? `<p class="mt-1.5 max-w-[440px] text-[11px] leading-relaxed text-muted">${esc(description)}</p>` : ''}
      </div>
      <button type="button" class="icon-btn shrink-0" data-action="close-modal" aria-label="Tutup dialog">
        <i data-lucide="x" class="h-4 w-4"></i>
      </button>
    </div>`;
}

function openConfirm({ title, message, confirmLabel = 'Hapus', tone = 'danger', onConfirm, detail = '' }) {
  openModal(`
    <div class="p-5 sm:p-6">
      <span class="confirm-icon ${tone === 'danger' ? 'confirm-icon-danger' : 'confirm-icon-warning'}">
        <i data-lucide="${tone === 'danger' ? 'trash-2' : 'triangle-alert'}" class="h-5 w-5"></i>
      </span>
      <h2 class="mt-4 text-[19px] font-extrabold tracking-[-0.03em] text-ink">${esc(title)}</h2>
      <p class="mt-2 text-[12px] leading-relaxed text-muted">${esc(message)}</p>
      ${detail ? `<div class="mt-3 rounded-xl bg-surface2 p-3 text-[10.5px] leading-relaxed text-faint">${detail}</div>` : ''}
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="btn-secondary justify-center" data-action="close-modal">Batal</button>
        <button type="button" class="btn-danger justify-center" id="confirm-dialog-yes">${esc(confirmLabel)}</button>
      </div>
    </div>
  `, { label: title });
  const yes = document.getElementById('confirm-dialog-yes');
  if (yes) {
    yes.addEventListener('click', () => {
      closeModal();
      setTimeout(() => {
        try { onConfirm(); } catch (error) {
          console.error(error);
          showToast('Terjadi kesalahan. Coba lagi.', 'error');
        }
      }, 180);
    });
  }
}

/* ----------------------------------------------------------------------------
   PENGATURAN
---------------------------------------------------------------------------- */
function getCurrentPin() {
  try {
    return localStorage.getItem(APP_CONFIG.pinKey) || APP_CONFIG.defaultPIN;
  } catch (error) {
    return APP_CONFIG.defaultPIN;
  }
}

function hasCustomPin() {
  try { return Boolean(localStorage.getItem(APP_CONFIG.pinKey)); } catch (error) { return false; }
}

function openSettings(tab = 'budget') {
  APP_UI.settingsTab = tab;
  const dark = document.documentElement.classList.contains('dark');
  const customPin = hasCustomPin();
  const weekly = state.budgets.weekly;
  const monthly = state.budgets.monthly;

  openModal(`
    <div class="flex max-h-[88vh] flex-col">
      ${modalHeader('PREFERENSI', 'Pengaturan', 'Atur batas pengeluaran, PIN, dan akses data lokalmu.')}
      <div class="settings-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <section class="settings-section" id="settings-budget">
          <div class="flex items-center gap-2.5">
            <span class="settings-icon"><i data-lucide="gauge" class="h-4 w-4"></i></span>
            <div>
              <h3 class="text-[12px] font-extrabold text-ink">Batas pengeluaran</h3>
              <p class="mt-0.5 text-[10px] text-faint">Dipakai untuk progress bar dan peringatan dini.</p>
            </div>
          </div>
          <form id="budget-form" class="mt-4 space-y-4" novalidate>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="budget-weekly" class="field-label">Limit mingguan</label>
                <div class="input-prefix-wrap mt-2">
                  <span>Rp</span>
                  <input id="budget-weekly" name="weekly" data-money-input inputmode="numeric" class="text-input pl-10" value="${numberFormatter.format(weekly)}" autocomplete="off" />
                </div>
              </div>
              <div>
                <label for="budget-monthly" class="field-label">Limit bulanan</label>
                <div class="input-prefix-wrap mt-2">
                  <span>Rp</span>
                  <input id="budget-monthly" name="monthly" data-money-input inputmode="numeric" class="text-input pl-10" value="${numberFormatter.format(monthly)}" autocomplete="off" />
                </div>
              </div>
            </div>
            <p id="budget-error" class="form-error" role="alert"></p>
            <div class="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-[9.5px] leading-relaxed text-faint">Batas mingguan dimulai setiap hari Senin.</p>
              <button type="submit" class="btn-primary btn-sm justify-center"><i data-lucide="check" class="h-3.5 w-3.5"></i> Simpan limit</button>
            </div>
          </form>
        </section>

        <section class="settings-section mt-6">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="settings-icon"><i data-lucide="sun-moon" class="h-4 w-4"></i></span>
              <div>
                <h3 class="text-[12px] font-extrabold text-ink">Tampilan</h3>
                <p class="mt-0.5 text-[10px] text-faint" id="theme-state-text">${dark ? 'Mode gelap aktif' : 'Mode terang aktif'}</p>
              </div>
            </div>
            <button type="button" class="switch ${dark ? 'is-on' : ''}" data-action="toggle-theme" data-theme-control role="switch" aria-checked="${dark}" aria-label="Mode gelap">
              <span class="switch-knob"></span>
            </button>
          </div>
        </section>

        <section class="settings-section mt-6">
          <div class="flex items-center gap-2.5">
            <span class="settings-icon"><i data-lucide="key-round" class="h-4 w-4"></i></span>
            <div>
              <h3 class="text-[12px] font-extrabold text-ink">PIN aplikasi</h3>
              <p class="mt-0.5 text-[10px] text-faint">${customPin ? 'PIN pribadi sudah diaktifkan.' : `Masih memakai PIN bawaan (${APP_CONFIG.defaultPIN}). Sebaiknya ubah sekarang.`}</p>
            </div>
          </div>
          <form id="pin-form" class="mt-4 space-y-3" novalidate>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="new-pin" class="field-label">PIN baru</label>
                <input id="new-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" class="text-input mt-2 pin-input" placeholder="4 digit" />
              </div>
              <div>
                <label for="confirm-pin" class="field-label">Ulangi PIN</label>
                <input id="confirm-pin" name="confirm" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" class="text-input mt-2 pin-input" placeholder="4 digit" />
              </div>
            </div>
            <p id="pin-form-error" class="form-error" role="alert"></p>
            <div class="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-[9.5px] leading-relaxed text-faint">PIN tidak ikut tersimpan di file backup.</p>
              <button type="submit" class="btn-secondary btn-sm justify-center"><i data-lucide="shield-check" class="h-3.5 w-3.5"></i> Perbarui PIN</button>
            </div>
          </form>
        </section>

        <section class="settings-section mt-6">
          <div class="flex items-center gap-2.5">
            <span class="settings-icon"><i data-lucide="database" class="h-4 w-4"></i></span>
            <div>
              <h3 class="text-[12px] font-extrabold text-ink">Data & privasi</h3>
              <p class="mt-0.5 text-[10px] text-faint">Semua data berada di LocalStorage perangkat ini.</p>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="btn-secondary btn-sm" data-action="export-json"><i data-lucide="download" class="h-3.5 w-3.5"></i> Backup JSON</button>
            <button type="button" class="btn-secondary btn-sm" data-action="go-backup"><i data-lucide="database" class="h-3.5 w-3.5"></i> Pusat data</button>
            <button type="button" class="btn-secondary btn-sm" data-action="lock-app"><i data-lucide="lock-keyhole" class="h-3.5 w-3.5"></i> Kunci aplikasi</button>
          </div>
        </section>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[9px] font-semibold text-faint sm:px-6">
        <span>MANAJEMEN UANG IBRA · v${APP_CONFIG.version}</span>
        <span class="flex items-center gap-1.5"><span class="status-dot"></span> Tersimpan lokal</span>
      </div>
    </div>
  `, { wide: true, label: 'Pengaturan' });

  if (tab === 'budget') {
    setTimeout(() => {
      const input = document.getElementById('budget-weekly');
      if (input) try { input.focus({ preventScroll: true }); } catch (error) {}
    }, 260);
  }
}

/* ----------------------------------------------------------------------------
   MODAL TRANSAKSI
---------------------------------------------------------------------------- */
function editCategoryOptions(type, selected = '') {
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return cats.map((cat) => `<option value="${esc(cat.name)}" ${cat.name === selected ? 'selected' : ''}>${esc(cat.name)}</option>`).join('');
}

function openEditTransaction(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return showToast('Transaksi tidak ditemukan.', 'error');

  openModal(`
    <form id="edit-transaction-form" data-id="${esc(tx.id)}" novalidate>
      ${modalHeader('EDIT TRANSAKSI', tx.type === 'income' ? 'Ubah uang masuk' : 'Ubah pengeluaran', 'Koreksi catatan yang salah tanpa menghapus riwayat.')}
      <div class="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div class="segmented w-full" role="group" aria-label="Jenis transaksi">
          <button type="button" class="${tx.type === 'expense' ? 'is-active is-expense' : ''}" data-action="edit-entry-type" data-type="expense"><i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i> Uang keluar</button>
          <button type="button" class="${tx.type === 'income' ? 'is-active is-income' : ''}" data-action="edit-entry-type" data-type="income"><i data-lucide="arrow-down-left" class="h-3.5 w-3.5"></i> Uang masuk</button>
        </div>
        <input type="hidden" name="type" id="edit-type" value="${tx.type}" />
        <div>
          <label for="edit-amount" class="field-label">Nominal</label>
          <div class="input-prefix-wrap mt-2">
            <span>Rp</span>
            <input id="edit-amount" name="amount" data-money-input inputmode="numeric" class="text-input pl-10" value="${numberFormatter.format(tx.amount)}" autocomplete="off" />
          </div>
          <p id="edit-amount-error" class="form-error" role="alert"></p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="edit-category" class="field-label">Kategori</label>
            <select id="edit-category" name="category" class="text-input select-input mt-2">
              ${editCategoryOptions(tx.type, tx.category)}
            </select>
          </div>
          <div>
            <label for="edit-date" class="field-label">Tanggal</label>
            <input id="edit-date" name="date" type="date" class="text-input mt-2" value="${tx.date}" max="${toDateKey()}" />
          </div>
        </div>
        <div>
          <label for="edit-note" class="field-label">Keterangan</label>
          <input id="edit-note" name="note" type="text" class="text-input mt-2" maxlength="80" value="${esc(tx.note)}" />
          <p id="edit-note-error" class="form-error" role="alert"></p>
        </div>
        <p id="edit-form-error" class="form-error" role="alert"></p>
      </div>
      <div class="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" class="btn-secondary justify-center" data-action="close-modal">Batal</button>
        <button type="submit" class="btn-primary justify-center"><i data-lucide="check" class="h-4 w-4"></i> Simpan perubahan</button>
      </div>
    </form>
  `, { label: 'Edit transaksi' });
}

function openSafeInfo() {
  const safe = safeToSpendInfo();
  openModal(`
    ${modalHeader('CARA KERJA', 'Jatah aman hari ini', 'Bukan ramalan, hanya matematika sederhana agar uangmu cukup sampai akhir bulan.')}
    <div class="px-5 py-5 sm:px-6">
      <div class="rounded-2xl bg-surface2 p-4">
        <div class="space-y-2.5 text-[11px]">
          <div class="flex items-center justify-between gap-3"><span class="text-muted">Sisa saldo</span><span class="money font-semibold text-ink">${formatRupiah(safe.balance)}</span></div>
          <div class="flex items-center justify-between gap-3"><span class="text-muted">Cadangan tagihan bulan ini</span><span class="money font-semibold text-warning">−${formatRupiah(safe.reserved)}</span></div>
          <div class="flex items-center justify-between gap-3"><span class="text-muted">Sisa hari bulan ini</span><span class="money font-semibold text-ink">${safe.daysRemaining} hari</span></div>
          <div class="border-t border-line pt-2.5 flex items-center justify-between gap-3"><span class="font-bold text-ink">Jatah aman per hari</span><span class="money font-extrabold text-primary">${formatRupiah(safe.daily)}</span></div>
        </div>
      </div>
      <div class="mt-4 space-y-3 text-[11px] leading-relaxed text-muted">
        <p><span class="font-bold text-ink">1.</span> Sisa saldo dihitung dari seluruh uang masuk dikurangi seluruh pengeluaran.</p>
        <p><span class="font-bold text-ink">2.</span> Tagihan langganan yang belum dibayar sampai akhir bulan disisihkan dulu, supaya uang jajan tidak memakainya.</p>
        <p><span class="font-bold text-ink">3.</span> Hasilnya dibagi jumlah hari yang tersisa, termasuk hari ini.</p>
      </div>
      <div class="mt-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft p-3">
        <i data-lucide="lightbulb" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"></i>
        <p class="text-[10px] leading-relaxed text-muted">Angka ini berubah otomatis saat kamu mencatat transaksi atau membayar tagihan. Gunakan sebagai patokan, bukan batas yang wajib dihabiskan.</p>
      </div>
      <button type="button" class="btn-primary mt-5 w-full justify-center" data-action="close-modal">Mengerti</button>
    </div>
  `, { label: 'Penjelasan jatah aman' });
}

/* ----------------------------------------------------------------------------
   MODAL LANGGANAN
---------------------------------------------------------------------------- */
const SUBSCRIPTION_SUGGESTIONS = {
  kuota: { name: 'Kuota Internet', amount: 60000, cycle: 'monthly' },
  musik: { name: 'Spotify', amount: 54900, cycle: 'monthly' },
  bensin: { name: 'Bensin Mingguan', amount: 20000, cycle: 'weekly' }
};

function openSubscriptionModal(id = null, suggestion = null) {
  const editing = id ? state.subscriptions.find((s) => s.id === id) : null;
  if (id && !editing) return showToast('Langganan tidak ditemukan.', 'error');
  const preset = suggestion ? SUBSCRIPTION_SUGGESTIONS[suggestion] : null;
  const cycle = editing?.cycle || preset?.cycle || 'monthly';
  const name = editing?.name || preset?.name || '';
  const amount = editing?.amount || preset?.amount || 0;
  const nextDue = editing?.nextDue || (cycle === 'weekly' ? toDateKey(addDays(new Date(), 7)) : toDateKey(addMonthsClamped(new Date(), 1)));

  openModal(`
    <form id="subscription-form" data-id="${editing ? esc(editing.id) : ''}" novalidate>
      ${modalHeader(editing ? 'EDIT LANGGANAN' : 'LANGGANAN BARU', editing ? 'Ubah rincian tagihan' : 'Pantau tagihan berulang', 'Isi sekali, lalu tekan “Bayar & catat” setiap kali tagihan dibayar.')}
      <div class="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div>
          <label for="sub-name" class="field-label">Nama langganan</label>
          <input id="sub-name" name="name" type="text" class="text-input mt-2" maxlength="40" value="${esc(name)}" placeholder="mis. Kuota internet, Spotify, kas kelas" autofocus />
          <p id="sub-name-error" class="form-error" role="alert"></p>
        </div>
        <div>
          <label for="sub-amount" class="field-label">Nominal</label>
          <div class="input-prefix-wrap mt-2">
            <span>Rp</span>
            <input id="sub-amount" name="amount" data-money-input inputmode="numeric" class="text-input pl-10" value="${amount ? numberFormatter.format(amount) : ''}" placeholder="0" autocomplete="off" />
          </div>
          <p id="sub-amount-error" class="form-error" role="alert"></p>
        </div>
        <div>
          <label class="field-label">Siklus tagihan</label>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button type="button" class="cycle-option ${cycle === 'weekly' ? 'is-selected' : ''}" data-action="sub-cycle" data-cycle="weekly">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface2"><i data-lucide="calendar-range" class="h-4 w-4"></i></span>
              <span class="text-left"><span class="block text-[11px] font-bold text-ink">Mingguan</span><span class="mt-0.5 block text-[9px] text-faint">Setiap 7 hari</span></span>
            </button>
            <button type="button" class="cycle-option ${cycle === 'monthly' ? 'is-selected' : ''}" data-action="sub-cycle" data-cycle="monthly">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface2"><i data-lucide="calendar-days" class="h-4 w-4"></i></span>
              <span class="text-left"><span class="block text-[11px] font-bold text-ink">Bulanan</span><span class="mt-0.5 block text-[9px] text-faint">Sekali sebulan</span></span>
            </button>
          </div>
          <input type="hidden" name="cycle" id="sub-cycle" value="${cycle}" />
        </div>
        <div>
          <label for="sub-due" class="field-label">Jatuh tempo berikutnya</label>
          <div class="input-icon-wrap mt-2">
            <i data-lucide="calendar-clock" class="input-icon"></i>
            <input id="sub-due" name="nextDue" type="date" class="text-input pl-10" value="${nextDue}" />
          </div>
          <p id="sub-due-error" class="form-error" role="alert"></p>
        </div>
        <p id="sub-form-error" class="form-error" role="alert"></p>
      </div>
      <div class="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" class="btn-secondary justify-center" data-action="close-modal">Batal</button>
        <button type="submit" class="btn-primary justify-center"><i data-lucide="check" class="h-4 w-4"></i> ${editing ? 'Simpan perubahan' : 'Simpan langganan'}</button>
      </div>
    </form>
  `, { label: editing ? 'Edit langganan' : 'Tambah langganan' });
}

/* ----------------------------------------------------------------------------
   AKSI TRANSAKSI
---------------------------------------------------------------------------- */
function setFieldError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || '';
}

function clearFieldErrors(ids) {
  ids.forEach((id) => setFieldError(id, ''));
}

function addTransaction(tx) {
  state.transactions.push(tx);
  saveState();
}

function handleTransactionSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const type = formData.get('type') === 'income' ? 'income' : 'expense';
  const amount = parseAmount(formData.get('amount'));
  const category = String(formData.get('category') || '');
  const note = String(formData.get('note') || '').trim();
  const date = String(formData.get('date') || '');
  const validCategories = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => c.name);

  clearFieldErrors(['amount-error', 'category-error', 'date-error', 'note-error', 'form-error']);

  if (!amount || amount <= 0) {
    setFieldError('amount-error', 'Nominal wajib diisi dan harus lebih dari Rp 0.');
    document.getElementById('amount-wrap')?.classList.add('has-error');
    document.getElementById('transaction-amount')?.focus();
    return;
  }
  if (!validCategories.includes(category)) {
    setFieldError('category-error', 'Pilih kategori terlebih dahulu.');
    return;
  }
  if (!date || !isDateKey(date)) {
    setFieldError('date-error', 'Tanggal tidak valid.');
    document.getElementById('transaction-date')?.focus();
    return;
  }
  if (date > toDateKey()) {
    setFieldError('date-error', 'Tanggal tidak boleh melewati hari ini.');
    document.getElementById('transaction-date')?.focus();
    return;
  }
  if (!note) {
    setFieldError('note-error', 'Keterangan wajib diisi agar catatan mudah dicari.');
    document.getElementById('transaction-note')?.focus();
    return;
  }

  const transaction = {
    id: uid(),
    type,
    amount,
    category,
    note,
    date,
    createdAt: new Date().toISOString()
  };
  addTransaction(transaction);
  APP_UI.addType = type;
  APP_UI.addCategory[type] = category;

  renderCurrentRoute({ animate: false, preserveScroll: true });
  showToast(`${type === 'income' ? 'Uang masuk' : 'Pengeluaran'} ${formatRupiah(amount)} berhasil dicatat.`, 'success', {
    label: 'Batalkan',
    onClick: () => {
      state.transactions = state.transactions.filter((t) => t.id !== transaction.id);
      saveState();
      renderCurrentRoute({ animate: false, preserveScroll: true });
      showToast('Catatan dibatalkan.', 'info');
    }
  });
  setTimeout(() => {
    const amountInput = document.getElementById('transaction-amount');
    if (amountInput) try { amountInput.focus({ preventScroll: true }); } catch (error) {}
  }, 60);
}

function updateAddFormType(type) {
  APP_UI.addType = type;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const selected = categories.some((c) => c.name === APP_UI.addCategory[type]) ? APP_UI.addCategory[type] : categories[0].name;
  APP_UI.addCategory[type] = selected;

  const hiddenType = document.getElementById('entry-type');
  const hiddenCategory = document.getElementById('entry-category');
  const options = document.getElementById('category-options');
  const submit = document.getElementById('submit-transaction');
  const note = document.getElementById('transaction-note');

  if (hiddenType) hiddenType.value = type;
  if (hiddenCategory) hiddenCategory.value = selected;
  if (options) options.innerHTML = categoryButtonsHtml(type, selected);
  if (submit) submit.querySelector('span').textContent = type === 'income' ? 'Simpan uang masuk' : 'Simpan pengeluaran';
  if (note) note.placeholder = type === 'income' ? 'mis. Uang jajan dari Mama' : 'mis. Makan siang di kantin';

  document.querySelectorAll('[data-action="entry-type"]').forEach((button) => {
    const active = button.dataset.type === type;
    button.classList.toggle('is-active', active);
    button.classList.toggle('is-expense', active && type === 'expense');
    button.classList.toggle('is-income', active && type === 'income');
  });
  clearFieldErrors(['amount-error', 'category-error', 'date-error', 'note-error', 'form-error']);
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
}

function selectCategory(name) {
  APP_UI.addCategory[APP_UI.addType] = name;
  const hidden = document.getElementById('entry-category');
  if (hidden) hidden.value = name;
  document.querySelectorAll('[data-action="select-category"]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.category === name);
  });
  setFieldError('category-error', '');
}

function quickAdd(presetIndex) {
  const preset = APP_CONFIG.quickAdds[presetIndex];
  if (!preset) return;
  const transaction = {
    id: uid(),
    type: 'expense',
    amount: preset.amount,
    category: preset.category,
    note: preset.note,
    date: toDateKey(),
    createdAt: new Date().toISOString()
  };
  addTransaction(transaction);
  renderCurrentRoute({ animate: false, preserveScroll: true });
  showToast(`${preset.note} ${formatRupiah(preset.amount)} dicatat.`, 'success', {
    label: 'Batalkan',
    onClick: () => {
      state.transactions = state.transactions.filter((t) => t.id !== transaction.id);
      saveState();
      renderCurrentRoute({ animate: false, preserveScroll: true });
      showToast('Catatan dibatalkan.', 'info');
    }
  });
}

function handleEditEntryType(type) {
  const hidden = document.getElementById('edit-type');
  const categorySelect = document.getElementById('edit-category');
  if (hidden) hidden.value = type;
  if (categorySelect) {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    categorySelect.innerHTML = cats.map((cat) => `<option value="${esc(cat.name)}">${esc(cat.name)}</option>`).join('');
  }
  document.querySelectorAll('[data-action="edit-entry-type"]').forEach((button) => {
    const active = button.dataset.type === type;
    button.classList.toggle('is-active', active);
    button.classList.toggle('is-expense', active && type === 'expense');
    button.classList.toggle('is-income', active && type === 'income');
  });
}

function handleEditTransactionSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.id;
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  const data = new FormData(form);
  const type = data.get('type') === 'income' ? 'income' : 'expense';
  const amount = parseAmount(data.get('amount'));
  const note = String(data.get('note') || '').trim();
  const date = String(data.get('date') || '');
  const category = String(data.get('category') || '');

  clearFieldErrors(['edit-amount-error', 'edit-note-error', 'edit-form-error']);
  if (!amount || amount <= 0) {
    setFieldError('edit-amount-error', 'Nominal harus lebih dari Rp 0.');
    return;
  }
  if (!note) {
    setFieldError('edit-note-error', 'Keterangan wajib diisi.');
    return;
  }
  if (!date || !isDateKey(date) || date > toDateKey()) {
    setFieldError('edit-form-error', 'Tanggal tidak valid atau melewati hari ini.');
    return;
  }
  const validCategories = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => c.name);
  Object.assign(tx, {
    type,
    amount,
    note,
    date,
    category: validCategories.includes(category) ? category : validCategories[0]
  });
  saveState();
  closeModal();
  renderCurrentRoute({ animate: false, preserveScroll: true });
  showToast('Transaksi berhasil diperbarui.', 'success');
}

function deleteTransaction(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  openConfirm({
    title: 'Hapus transaksi ini?',
    message: `“${tx.note || tx.category}” sebesar ${formatRupiah(tx.amount)} akan dihapus permanen dari perangkat ini.`,
    confirmLabel: 'Hapus transaksi',
    detail: tx.subscriptionId ? 'Ini adalah catatan pembayaran langganan. Jadwal tagihan berikutnya tidak ikut diubah.' : '',
    onConfirm: () => {
      state.transactions = state.transactions.filter((t) => t.id !== id);
      saveState();
      renderCurrentRoute({ animate: false, preserveScroll: true });
      showToast('Transaksi dihapus.', 'info');
    }
  });
}

/* ----------------------------------------------------------------------------
   AKSI LANGGANAN
---------------------------------------------------------------------------- */
function handleSubscriptionSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.dataset.id;
  const editing = id ? state.subscriptions.find((s) => s.id === id) : null;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const amount = parseAmount(data.get('amount'));
  const cycle = data.get('cycle') === 'weekly' ? 'weekly' : 'monthly';
  const nextDue = String(data.get('nextDue') || '');

  clearFieldErrors(['sub-name-error', 'sub-amount-error', 'sub-due-error', 'sub-form-error']);
  if (!name) {
    setFieldError('sub-name-error', 'Nama langganan wajib diisi.');
    document.getElementById('sub-name')?.focus();
    return;
  }
  if (!amount || amount <= 0) {
    setFieldError('sub-amount-error', 'Nominal harus lebih dari Rp 0.');
    document.getElementById('sub-amount')?.focus();
    return;
  }
  if (!nextDue || !isDateKey(nextDue)) {
    setFieldError('sub-due-error', 'Tanggal jatuh tempo tidak valid.');
    document.getElementById('sub-due')?.focus();
    return;
  }

  if (editing) {
    Object.assign(editing, { name, amount, cycle, nextDue });
    saveState();
    closeModal();
    renderCurrentRoute({ animate: false, preserveScroll: true });
    showToast('Langganan diperbarui.', 'success');
  } else {
    state.subscriptions.push({
      id: uid(),
      name,
      amount,
      cycle,
      nextDue,
      active: true,
      createdAt: new Date().toISOString()
    });
    saveState();
    closeModal();
    renderCurrentRoute({ animate: false, preserveScroll: true });
    showToast(`${name} ditambahkan ke radar langganan.`, 'success');
  }
}

function paySubscription(id) {
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  const previousDue = sub.nextDue;
  const today = toDateKey();
  const base = sub.nextDue >= today ? parseDateKey(sub.nextDue) : new Date();
  const nextDate = sub.cycle === 'weekly' ? addDays(base, 7) : addMonthsClamped(base, 1);
  const transaction = {
    id: uid(),
    type: 'expense',
    amount: sub.amount,
    category: 'Langganan',
    note: `${sub.name} · langganan ${sub.cycle === 'weekly' ? 'mingguan' : 'bulanan'}`,
    date: today,
    createdAt: new Date().toISOString(),
    subscriptionId: sub.id
  };

  state.transactions.push(transaction);
  sub.nextDue = toDateKey(nextDate);
  saveState();
  renderCurrentRoute({ animate: false, preserveScroll: true });
  showToast(`${sub.name} ${formatRupiah(sub.amount)} dibayar & dicatat.`, 'success', {
    label: 'Batalkan',
    onClick: () => {
      state.transactions = state.transactions.filter((t) => t.id !== transaction.id);
      const target = state.subscriptions.find((s) => s.id === sub.id);
      if (target) target.nextDue = previousDue;
      saveState();
      renderCurrentRoute({ animate: false, preserveScroll: true });
      showToast('Pembayaran dibatalkan.', 'info');
    }
  });
}

function deleteSubscription(id) {
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  openConfirm({
    title: 'Hapus langganan?',
    message: `${sub.name} akan dihapus dari radar. Riwayat pembayaran yang sudah tercatat tetap tersimpan.`,
    confirmLabel: 'Hapus langganan',
    onConfirm: () => {
      state.subscriptions = state.subscriptions.filter((s) => s.id !== id);
      saveState();
      renderCurrentRoute({ animate: false, preserveScroll: true });
      showToast('Langganan dihapus.', 'info');
    }
  });
}

/* ----------------------------------------------------------------------------
   PENGATURAN: FORM, TEMA & DATA
---------------------------------------------------------------------------- */
function handleBudgetSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const weekly = parseAmount(data.get('weekly'));
  const monthly = parseAmount(data.get('monthly'));
  setFieldError('budget-error', '');
  if (weekly <= 0 || monthly <= 0) {
    setFieldError('budget-error', 'Kedua limit harus lebih dari Rp 0.');
    return;
  }
  state.budgets.weekly = weekly;
  state.budgets.monthly = monthly;
  saveState();
  closeModal();
  renderCurrentRoute({ animate: false, preserveScroll: true });
  showToast('Batas pengeluaran diperbarui.', 'success');
}

function handlePinSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const pin = String(data.get('pin') || '');
  const confirm = String(data.get('confirm') || '');
  setFieldError('pin-form-error', '');
  if (!/^\d{4}$/.test(pin)) {
    setFieldError('pin-form-error', 'PIN harus terdiri dari tepat 4 digit angka.');
    document.getElementById('new-pin')?.focus();
    return;
  }
  if (pin !== confirm) {
    setFieldError('pin-form-error', 'Ulangi PIN dengan angka yang sama.');
    document.getElementById('confirm-pin')?.focus();
    return;
  }
  try {
    localStorage.setItem(APP_CONFIG.pinKey, pin);
  } catch (error) {
    setFieldError('pin-form-error', 'PIN gagal disimpan di perangkat ini.');
    return;
  }
  updatePinHint();
  closeModal();
  showToast('PIN aplikasi berhasil diperbarui.', 'success');
}

function updatePinHint() {
  const hint = document.getElementById('pin-hint');
  if (!hint) return;
  if (hasCustomPin()) {
    hint.innerHTML = 'PIN pribadi aktif. <span class="text-muted">Ubah kapan saja lewat Pengaturan.</span>';
  } else {
    hint.innerHTML = `PIN awal: <span class="font-mono font-semibold text-muted">${esc(APP_CONFIG.defaultPIN)}</span> · ubah di Pengaturan setelah masuk.`;
  }
}

function updateThemeControls(dark) {
  document.querySelectorAll('[data-theme-control]').forEach((control) => {
    control.classList.toggle('is-on', dark);
    control.setAttribute('aria-checked', String(dark));
  });
  const text = document.getElementById('theme-state-text');
  if (text) text.textContent = dark ? 'Mode gelap aktif' : 'Mode terang aktif';
}

function toggleTheme() {
  const html = document.documentElement;
  const dark = !html.classList.contains('dark');
  html.classList.toggle('dark', dark);
  html.style.colorScheme = dark ? 'dark' : 'light';
  try { localStorage.setItem(APP_CONFIG.themeKey, dark ? 'dark' : 'light'); } catch (error) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#111315' : '#F6F7F4');
  updateThemeControls(dark);
  if (APP_UI.isUnlocked) {
    renderCurrentRoute({ animate: false, preserveScroll: true });
  }
}

function applyInitialThemeMeta() {
  const dark = document.documentElement.classList.contains('dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#111315' : '#F6F7F4');
  updateThemeControls(dark);
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportJSON() {
  const payload = {
    app: APP_CONFIG.appName,
    version: APP_CONFIG.version,
    exportedAt: new Date().toISOString(),
    data: state
  };
  downloadFile(JSON.stringify(payload, null, 2), `manajemen-uang-ibra-backup-${toDateKey()}.json`, 'application/json;charset=utf-8');
  showToast('File backup JSON sedang diunduh.', 'success');
}

function exportCSV() {
  if (!state.transactions.length) {
    showToast('Belum ada transaksi untuk diexport.', 'warning');
    return;
  }
  const rows = [['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal (Rp)', 'ID']];
  sortedTransactions().slice().reverse().forEach((t) => {
    rows.push([
      t.date,
      t.type === 'income' ? 'Uang masuk' : 'Uang keluar',
      t.category,
      t.note,
      String(t.amount),
      t.id
    ]);
  });
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  downloadFile(csv, `manajemen-uang-ibra-laporan-${toDateKey()}.csv`, 'text/csv;charset=utf-8');
  showToast('Laporan CSV berhasil dibuat.', 'success');
}

function triggerImport() {
  const input = document.getElementById('import-file');
  if (input) input.click();
}

function handleImportFile(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    showToast('File terlalu besar. Maksimal 8 MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    let payload;
    try {
      payload = JSON.parse(String(reader.result));
    } catch (error) {
      showToast('File JSON tidak valid atau rusak.', 'error');
      return;
    }
    const data = payload && payload.data ? payload.data : payload;
    if (!data || !Array.isArray(data.transactions)) {
      showToast('Struktur backup tidak dikenali.', 'error');
      return;
    }
    const txCount = data.transactions.length;
    const subCount = Array.isArray(data.subscriptions) ? data.subscriptions.length : 0;
    openConfirm({
      title: 'Pulihkan data dari backup?',
      message: `Backup berisi ${txCount} transaksi dan ${subCount} langganan. Data yang ada di perangkat ini akan diganti.`,
      confirmLabel: 'Import & ganti data',
      tone: 'warning',
      detail: `${payload.exportedAt ? `Dibuat ${formatDateTime(new Date(payload.exportedAt))}. ` : ''}PIN aplikasi tidak ikut berubah.`,
      onConfirm: () => {
        state = normalizeState(data);
        saveState();
        APP_UI.historyFilters = { q: '', type: 'all', category: 'all', month: 'all' };
        renderCurrentRoute({ animate: false });
        showToast(`Backup dipulihkan: ${state.transactions.length} transaksi.`, 'success');
      }
    });
  };
  reader.onerror = () => showToast('Gagal membaca file backup.', 'error');
  reader.readAsText(file);
}

function resetAllData() {
  openConfirm({
    title: 'Hapus semua data keuangan?',
    message: 'Seluruh transaksi, langganan, dan pengaturan limit akan dihapus dari perangkat ini. Tindakan ini tidak bisa dibatalkan.',
    confirmLabel: 'Ya, hapus semua',
    detail: 'Disarankan membuat backup JSON terlebih dahulu.',
    onConfirm: () => {
      state = createDefaultState();
      saveState();
      APP_UI.historyFilters = { q: '', type: 'all', category: 'all', month: 'all' };
      renderCurrentRoute({ animate: false });
      showToast('Semua data keuangan telah dihapus.', 'info');
    }
  });
}

/* ----------------------------------------------------------------------------
   CHART.JS
---------------------------------------------------------------------------- */
function initChartsForRoute() {
  if (!window.Chart) return;
  const canvasSpending = document.getElementById('chart-spending');
  const canvasCategories = document.getElementById('chart-categories');
  if (!canvasSpending && !canvasCategories) return;

  const dark = document.documentElement.classList.contains('dark');
  const tickColor = dark ? '#8D9792' : '#7A837E';
  const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(20,30,24,0.06)';
  const surfaceColor = dark ? '#1A1D21' : '#FFFFFF';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 10;
  Chart.defaults.color = tickColor;

  if (canvasSpending) {
    const days = lastSevenDays();
    const todayIndex = days.length - 1;
    const colors = days.map((d, index) => index === todayIndex ? '#10B981' : (dark ? 'rgba(16,185,129,0.28)' : 'rgba(16,185,129,0.22)'));
    const chart = new Chart(canvasSpending, {
      type: 'bar',
      data: {
        labels: days.map((d) => d.label),
        datasets: [{
          data: days.map((d) => d.value),
          backgroundColor: colors,
          hoverBackgroundColor: '#10B981',
          borderRadius: 7,
          borderSkipped: false,
          maxBarThickness: 30,
          categoryPercentage: 0.62,
          barPercentage: 0.82
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: reduceMotion ? 0 : 650, easing: 'easeOutQuart' },
        layout: { padding: { top: 8, left: 2, right: 2, bottom: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark ? '#F3F5F2' : '#141A16',
            titleColor: dark ? '#151A17' : '#FFFFFF',
            bodyColor: dark ? '#46514B' : '#D9E2DC',
            padding: 10,
            cornerRadius: 9,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const d = days[items[0].dataIndex].date;
                return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
              },
              label: (context) => `Pengeluaran: ${formatRupiah(context.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: tickColor, font: { size: 9, weight: '600' } }
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: gridColor, drawTicks: false },
            ticks: {
              color: tickColor,
              padding: 8,
              font: { size: 9 },
              callback: (value) => value === 0 ? '0' : formatCompact(value)
            }
          }
        }
      }
    });
    APP_UI.charts.push(chart);
  }

  if (canvasCategories) {
    const categories = currentMonthCategoryTotals();
    if (!categories.length) return;
    const chart = new Chart(canvasCategories, {
      type: 'doughnut',
      data: {
        labels: categories.map((c) => c.name),
        datasets: [{
          data: categories.map((c) => c.value),
          backgroundColor: categories.map((c) => c.color),
          borderColor: surfaceColor,
          borderWidth: 3,
          hoverOffset: 5,
          spacing: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: reduceMotion ? 0 : 700, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark ? '#F3F5F2' : '#141A16',
            titleColor: dark ? '#151A17' : '#FFFFFF',
            bodyColor: dark ? '#46514B' : '#D9E2DC',
            padding: 10,
            cornerRadius: 9,
            boxPadding: 4,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                const pct = total ? Math.round((context.parsed / total) * 100) : 0;
                return ` ${formatRupiah(context.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
    APP_UI.charts.push(chart);
  }
}

/* ----------------------------------------------------------------------------
   LAYAR KUNCI & PIN
---------------------------------------------------------------------------- */
function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((dot, index) => {
    dot.classList.toggle('is-filled', index < APP_UI.pinBuffer.length);
    dot.classList.remove('is-success');
  });
  const dots = document.getElementById('pin-dots');
  if (dots) dots.setAttribute('aria-label', `${APP_UI.pinBuffer.length} dari 4 digit terisi`);
}

function showPinError(message = 'PIN salah. Coba lagi, ya.') {
  const error = document.getElementById('pin-error');
  if (!error) return;
  error.textContent = message;
  error.style.opacity = '1';
  const wrap = document.getElementById('pin-wrap');
  if (wrap) {
    wrap.classList.remove('is-shaking');
    void wrap.offsetWidth;
    wrap.classList.add('is-shaking');
  }
}

function clearPinError() {
  const error = document.getElementById('pin-error');
  if (error) error.style.opacity = '0';
  const wrap = document.getElementById('pin-wrap');
  if (wrap) wrap.classList.remove('is-shaking');
}

function handlePinKey(key) {
  if (APP_UI.isUnlocked || APP_UI.pinBusy) return;
  clearPinError();
  if (key === 'clear') {
    APP_UI.pinBuffer = '';
  } else if (key === 'back') {
    APP_UI.pinBuffer = APP_UI.pinBuffer.slice(0, -1);
  } else if (/^\d$/.test(key) && APP_UI.pinBuffer.length < 4) {
    APP_UI.pinBuffer += key;
  }
  updatePinDots();
  if (APP_UI.pinBuffer.length === 4) submitPin();
}

function submitPin() {
  if (APP_UI.pinBusy) return;
  APP_UI.pinBusy = true;
  const entered = APP_UI.pinBuffer;
  setTimeout(() => {
    if (entered === getCurrentPin()) {
      clearPinError();
      document.querySelectorAll('.pin-dot').forEach((dot) => dot.classList.add('is-success'));
      setTimeout(unlockApp, 160);
    } else {
      APP_UI.pinBusy = false;
      showPinError();
      APP_UI.pinBuffer = '';
      setTimeout(updatePinDots, 450);
    }
  }, 140);
}

function unlockApp() {
  APP_UI.isUnlocked = true;
  APP_UI.pinBusy = false;
  APP_UI.pinBuffer = '';
  updatePinDots();
  document.body.classList.remove('locked');
  const lockScreen = document.getElementById('lock-screen');
  const appShell = document.getElementById('app-shell');
  if (lockScreen) {
    lockScreen.classList.add('lock-exit');
    setTimeout(() => lockScreen.classList.add('hidden'), 300);
  }
  if (appShell) {
    appShell.classList.remove('hidden');
    appShell.classList.add('app-enter');
    setTimeout(() => appShell.classList.remove('app-enter'), 420);
  }
  APP_UI.route = getRouteFromHash();
  renderCurrentRoute({ animate: true });
}

function lockApp() {
  if (!APP_UI.isUnlocked) return;
  closeModal(true);
  APP_UI.isUnlocked = false;
  APP_UI.pinBusy = false;
  APP_UI.pinBuffer = '';
  clearPinError();
  updatePinDots();
  updatePinHint();
  document.body.classList.add('locked');
  const lockScreen = document.getElementById('lock-screen');
  const appShell = document.getElementById('app-shell');
  if (appShell) appShell.classList.add('hidden');
  if (lockScreen) {
    lockScreen.classList.remove('hidden');
    lockScreen.classList.remove('lock-exit');
    void lockScreen.offsetWidth;
  }
}

/* ----------------------------------------------------------------------------
   EVENT GLOBAL & AKSI UI
---------------------------------------------------------------------------- */
function setupEventListeners() {
  document.addEventListener('click', (event) => {
    const pinButton = event.target.closest('[data-pin]');
    if (pinButton) {
      event.preventDefault();
      handlePinKey(pinButton.dataset.pin);
      return;
    }

    if (event.target.matches('[data-modal-backdrop]')) {
      closeModal();
      return;
    }

    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      event.preventDefault();
      if (routeButton.dataset.addType) {
        APP_UI.addType = routeButton.dataset.addType === 'income' ? 'income' : 'expense';
      }
      const route = routeButton.dataset.route;
      navigate(route);
      if (routeButton.dataset.scrollBackup === 'true') {
        setTimeout(() => {
          const section = document.getElementById('backup-section');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 180);
      }
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    switch (action) {
      case 'toggle-theme':
        event.preventDefault();
        toggleTheme();
        break;
      case 'lock-app':
        event.preventDefault();
        lockApp();
        break;
      case 'open-settings':
        event.preventDefault();
        openSettings(actionButton.dataset.tab || 'budget');
        break;
      case 'close-modal':
        event.preventDefault();
        closeModal();
        break;
      case 'safe-info':
        event.preventDefault();
        openSafeInfo();
        break;
      case 'quick-add':
        event.preventDefault();
        quickAdd(Number(actionButton.dataset.preset));
        break;
      case 'entry-type':
        event.preventDefault();
        updateAddFormType(actionButton.dataset.type);
        break;
      case 'edit-entry-type':
        event.preventDefault();
        handleEditEntryType(actionButton.dataset.type);
        break;
      case 'select-category':
        event.preventDefault();
        selectCategory(actionButton.dataset.category);
        break;
      case 'quick-amount':
        event.preventDefault();
        {
          const input = document.getElementById('transaction-amount');
          if (input) {
            input.value = numberFormatter.format(Number(actionButton.dataset.amount));
            input.focus();
            document.getElementById('amount-wrap')?.classList.remove('has-error');
            setFieldError('amount-error', '');
          }
        }
        break;
      case 'add-subscription':
        event.preventDefault();
        openSubscriptionModal(null, actionButton.dataset.suggestion || null);
        break;
      case 'edit-subscription':
        event.preventDefault();
        openSubscriptionModal(actionButton.dataset.id);
        break;
      case 'delete-subscription':
        event.preventDefault();
        deleteSubscription(actionButton.dataset.id);
        break;
      case 'pay-subscription':
        event.preventDefault();
        paySubscription(actionButton.dataset.id);
        break;
      case 'edit-transaction':
        event.preventDefault();
        openEditTransaction(actionButton.dataset.id);
        break;
      case 'delete-transaction':
        event.preventDefault();
        deleteTransaction(actionButton.dataset.id);
        break;
      case 'sub-cycle':
        event.preventDefault();
        {
          const cycle = actionButton.dataset.cycle === 'weekly' ? 'weekly' : 'monthly';
          const hidden = document.getElementById('sub-cycle');
          if (hidden) hidden.value = cycle;
          document.querySelectorAll('[data-action="sub-cycle"]').forEach((button) => {
            button.classList.toggle('is-selected', button.dataset.cycle === cycle);
          });
        }
        break;
      case 'reset-filters':
        event.preventDefault();
        APP_UI.historyFilters = { q: '', type: 'all', category: 'all', month: 'all' };
        renderCurrentRoute({ animate: false, preserveScroll: true });
        break;
      case 'export-json':
        event.preventDefault();
        exportJSON();
        break;
      case 'export-csv':
        event.preventDefault();
        exportCSV();
        break;
      case 'trigger-import':
        event.preventDefault();
        triggerImport();
        break;
      case 'reset-data':
        event.preventDefault();
        resetAllData();
        break;
      case 'go-backup':
        event.preventDefault();
        closeModal(true);
        navigate('history');
        setTimeout(() => {
          const section = document.getElementById('backup-section');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 220);
        break;
      default:
        break;
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.id === 'transaction-form') handleTransactionSubmit(event);
    else if (form.id === 'edit-transaction-form') handleEditTransactionSubmit(event);
    else if (form.id === 'subscription-form') handleSubscriptionSubmit(event);
    else if (form.id === 'budget-form') handleBudgetSubmit(event);
    else if (form.id === 'pin-form') handlePinSubmit(event);
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-money-input]')) {
      const startAtEnd = target.selectionStart === target.value.length;
      target.value = formatAmountInput(target.value);
      if (startAtEnd) {
        try { target.setSelectionRange(target.value.length, target.value.length); } catch (error) {}
      }
      if (target.id === 'transaction-amount') {
        document.getElementById('amount-wrap')?.classList.remove('has-error');
        setFieldError('amount-error', '');
      }
      if (target.id === 'budget-weekly' || target.id === 'budget-monthly') setFieldError('budget-error', '');
      if (target.id === 'sub-amount') setFieldError('sub-amount-error', '');
      if (target.id === 'edit-amount') setFieldError('edit-amount-error', '');
    }
    if (target.matches('.pin-input')) {
      target.value = target.value.replace(/\D/g, '').slice(0, 4);
      setFieldError('pin-form-error', '');
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'import-file') {
      const file = event.target.files && event.target.files[0];
      if (file) handleImportFile(file);
      event.target.value = '';
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!APP_UI.isUnlocked) {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        handlePinKey(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        handlePinKey('back');
      } else if (event.key === 'Escape') {
        handlePinKey('clear');
      }
      return;
    }

    if (event.key === 'Escape') {
      if (APP_UI.modalOpen) {
        event.preventDefault();
        closeModal();
      }
      return;
    }

    if (event.key === 'Tab' && APP_UI.modalOpen) {
      const modal = document.querySelector('.modal-panel');
      if (!modal) return;
      const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener('hashchange', () => {
    if (!APP_UI.isUnlocked) return;
    closeModal(true);
    renderCurrentRoute({ animate: true });
  });
}

/* ----------------------------------------------------------------------------
   INISIALISASI
---------------------------------------------------------------------------- */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

function init() {
  document.body.classList.add('locked');
  const yearEl = document.getElementById('lock-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const owner = document.getElementById('sidebar-owner');
  if (owner) owner.textContent = APP_CONFIG.ownerName;
  updateHeaderMeta();
  updatePinHint();
  updatePinDots();
  applyInitialThemeMeta();
  APP_UI.route = getRouteFromHash();
  setupEventListeners();
  registerServiceWorker();

  if (window.lucide) {
    window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
