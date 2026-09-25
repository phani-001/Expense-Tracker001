import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type {
  BarcodeLookupResponse,
  BarcodeScanResponse,
  ByCategoryItem,
  Category,
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExtractResponse,
  PaginatedExpenses,
  StatsSummary,
  TrendPoint,
} from './types';

export const BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? ''
    : typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000');

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Invalidate all expense and dashboard data ──────────────
export async function invalidateAllExpenseData(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['expenses'] }),
    qc.invalidateQueries({ queryKey: ['stats'] }),
    qc.invalidateQueries({ queryKey: ['trend'] }),
  ]);
}

/**
 * Optimistically/reactively updates all caches matching dashboard and expense lists
 * so the UI updates in the exact same render cycle without waiting for network.
 */
export function onExpenseSaved(qc: QueryClient, newExpense: Expense) {
  // 1. Update dashboard expenses list query: ['expenses', 'dashboard', ...]
  qc.setQueriesData<PaginatedExpenses>(
    { queryKey: ['expenses', 'dashboard'] },
    (old) => {
      if (!old || !Array.isArray(old.items)) return old;
      if (old.items.some((e) => e.id === newExpense.id)) return old;
      return {
        ...old,
        items: [newExpense, ...old.items],
      };
    },
  );

  // 2. Update infinite query on /expenses: ['expenses', ...]
  qc.setQueriesData<InfiniteData<PaginatedExpenses>>(
    { queryKey: ['expenses'] },
    (old) => {
      if (!old || !('pages' in old) || !Array.isArray(old.pages) || !old.pages.length) return old;
      if (old.pages[0].items.some((e) => e.id === newExpense.id)) return old;
      const firstPage = old.pages[0];
      return {
        ...old,
        pages: [
          { ...firstPage, items: [newExpense, ...firstPage.items] },
          ...old.pages.slice(1),
        ],
      };
    },
  );

  // 3. Update summary stats: ['stats', 'summary']
  qc.setQueriesData<StatsSummary>(
    { queryKey: ['stats', 'summary'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        total_paise: old.total_paise + newExpense.price_paise,
        item_count: old.item_count + 1,
        vs_last_month_paise: old.vs_last_month_paise + newExpense.price_paise,
      };
    },
  );

  // 4. Update by-category stats: ['stats', 'by-category']
  qc.setQueriesData<ByCategoryItem[]>(
    { queryKey: ['stats', 'by-category'] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      const catId = newExpense.category_id;
      const catName = newExpense.category?.name || 'Uncategorised';
      const exists = old.some((c) => c.category_id === catId);
      if (exists) {
        return old
          .map((c) =>
            c.category_id === catId
              ? { ...c, total_paise: c.total_paise + newExpense.price_paise }
              : c,
          )
          .sort((a, b) => b.total_paise - a.total_paise);
      }
      return [
        ...old,
        {
          category_id: catId,
          category_name: catName,
          total_paise: newExpense.price_paise,
        },
      ].sort((a, b) => b.total_paise - a.total_paise);
    },
  );

  // 5. Update trend points: ['trend']
  qc.setQueriesData<TrendPoint[]>(
    { queryKey: ['trend'] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      const dateStr = newExpense.purchase_date
        ? newExpense.purchase_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const exists = old.some((p) => p.date === dateStr);
      if (exists) {
        return old.map((p) =>
          p.date === dateStr
            ? { ...p, total_paise: p.total_paise + newExpense.price_paise }
            : p,
        );
      }
      return [...old, { date: dateStr, total_paise: newExpense.price_paise }].sort(
        (a, b) => a.date.localeCompare(b.date),
      );
    },
  );
}

export function onExpenseUpdated(qc: QueryClient, updatedExpense: Expense) {
  let oldPricePaise: number | undefined;

  // 1. Update dashboard list
  qc.setQueriesData<PaginatedExpenses>(
    { queryKey: ['expenses', 'dashboard'] },
    (old) => {
      if (!old || !Array.isArray(old.items)) return old;
      const existing = old.items.find((e) => e.id === updatedExpense.id);
      if (existing) oldPricePaise = existing.price_paise;
      return {
        ...old,
        items: old.items.map((e) =>
          e.id === updatedExpense.id ? updatedExpense : e,
        ),
      };
    },
  );

  // 2. Update /expenses list
  qc.setQueriesData<InfiniteData<PaginatedExpenses>>(
    { queryKey: ['expenses'] },
    (old) => {
      if (!old || !('pages' in old) || !Array.isArray(old.pages) || !old.pages.length) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((e) => {
            if (e.id === updatedExpense.id) {
              if (oldPricePaise === undefined) oldPricePaise = e.price_paise;
              return updatedExpense;
            }
            return e;
          }),
        })),
      };
    },
  );

  // 3. Update summary if price changed
  if (oldPricePaise !== undefined) {
    const delta = updatedExpense.price_paise - oldPricePaise;
    if (delta !== 0) {
      qc.setQueriesData<StatsSummary>(
        { queryKey: ['stats', 'summary'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            total_paise: old.total_paise + delta,
            vs_last_month_paise: old.vs_last_month_paise + delta,
          };
        },
      );
    }
  }
}

export function onExpenseDeleted(qc: QueryClient, deletedId: number) {
  let deletedPricePaise: number | undefined;

  // 1. Remove from dashboard list
  qc.setQueriesData<PaginatedExpenses>(
    { queryKey: ['expenses', 'dashboard'] },
    (old) => {
      if (!old || !Array.isArray(old.items)) return old;
      const item = old.items.find((e) => e.id === deletedId);
      if (item) deletedPricePaise = item.price_paise;
      return {
        ...old,
        items: old.items.filter((e) => e.id !== deletedId),
      };
    },
  );

  // 2. Remove from /expenses infinite list
  qc.setQueriesData<InfiniteData<PaginatedExpenses>>(
    { queryKey: ['expenses'] },
    (old) => {
      if (!old || !('pages' in old) || !Array.isArray(old.pages) || !old.pages.length) return old;
      return {
        ...old,
        pages: old.pages.map((page) => {
          const item = page.items.find((e) => e.id === deletedId);
          if (item && deletedPricePaise === undefined) deletedPricePaise = item.price_paise;
          return {
            ...page,
            items: page.items.filter((e) => e.id !== deletedId),
          };
        }),
      };
    },
  );

  // 3. Remove from expiring list
  qc.setQueriesData<Expense[]>(
    { queryKey: ['expenses', 'expiring'] },
    (old) => (old && Array.isArray(old) ? old.filter((e) => e.id !== deletedId) : old),
  );

  // 4. Update summary count and total
  qc.setQueriesData<StatsSummary>(
    { queryKey: ['stats', 'summary'] },
    (old) => {
      if (!old) return old;
      const p = deletedPricePaise ?? 0;
      return {
        ...old,
        total_paise: Math.max(0, old.total_paise - p),
        item_count: Math.max(0, old.item_count - 1),
        vs_last_month_paise: old.vs_last_month_paise - p,
      };
    },
  );
}

// ── Categories ────────────────────────────────────────────
export const getCategories = (): Promise<Category[]> =>
  request('/categories');

export const createCategory = (data: {
  name: string;
  color: string;
  icon: string;
}): Promise<Category> =>
  request('/categories', { method: 'POST', body: JSON.stringify(data) });

// ── Expenses ──────────────────────────────────────────────
export const getExpenses = (params?: {
  cursor?: number | null;
  limit?: number;
  month?: string;
  category_id?: number;
  q?: string;
  start_date?: string;
  end_date?: string;
}): Promise<PaginatedExpenses> => {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.set('cursor', String(params.cursor));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.month) qs.set('month', params.month);
  if (params?.category_id) qs.set('category_id', String(params.category_id));
  if (params?.q) qs.set('q', params.q);
  if (params?.start_date) qs.set('start_date', params.start_date);
  if (params?.end_date) qs.set('end_date', params.end_date);
  const query = qs.toString();
  return request(`/expenses${query ? `?${query}` : ''}`);
};

export const createExpense = (data: ExpenseCreate): Promise<Expense> =>
  request('/expenses', { method: 'POST', body: JSON.stringify(data) });

export const updateExpense = (
  id: number,
  data: ExpenseUpdate,
): Promise<Expense> =>
  request(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteExpense = (id: number): Promise<void> =>
  request(`/expenses/${id}`, { method: 'DELETE' });

export const getExpiringExpenses = (days = 7): Promise<Expense[]> =>
  request(`/expenses/expiring?days=${days}`);

// ── Stats ─────────────────────────────────────────────────
export const getStatsSummary = (
  param: string | { month?: string; start_date?: string; end_date?: string },
): Promise<StatsSummary> => {
  if (typeof param === 'string') {
    return request(`/stats/summary?month=${encodeURIComponent(param)}`);
  }
  const qs = new URLSearchParams();
  if (param.month) qs.set('month', param.month);
  if (param.start_date) qs.set('start_date', param.start_date);
  if (param.end_date) qs.set('end_date', param.end_date);
  return request(`/stats/summary?${qs.toString()}`);
};

export const getStatsByCategory = (
  param: string | { month?: string; start_date?: string; end_date?: string },
): Promise<ByCategoryItem[]> => {
  if (typeof param === 'string') {
    return request(`/stats/by-category?month=${encodeURIComponent(param)}`);
  }
  const qs = new URLSearchParams();
  if (param.month) qs.set('month', param.month);
  if (param.start_date) qs.set('start_date', param.start_date);
  if (param.end_date) qs.set('end_date', param.end_date);
  return request(`/stats/by-category?${qs.toString()}`);
};

export const getStatsTrend = (
  param?: string | { range?: string; start_date?: string; end_date?: string },
): Promise<TrendPoint[]> => {
  if (!param || typeof param === 'string') {
    return request(`/stats/trend?range=${encodeURIComponent(param || '30d')}`);
  }
  const qs = new URLSearchParams();
  if (param.range) qs.set('range', param.range);
  if (param.start_date) qs.set('start_date', param.start_date);
  if (param.end_date) qs.set('end_date', param.end_date);
  return request(`/stats/trend?${qs.toString()}`);
};

// ── Barcode lookup ────────────────────────────────────────
export const lookupBarcode = (
  barcode: string,
): Promise<BarcodeLookupResponse> =>
  request(`/lookup/${encodeURIComponent(barcode)}`);

// ── Image extraction ─────────────────────────────────────
export async function extractImage(blob: Blob): Promise<ExtractResponse> {
  const form = new FormData();
  form.append('image', blob, 'photo.jpg');
  const res = await fetch(`${BASE}/extract`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ExtractResponse>;
}

// ── Zxing-cpp barcode scan & product lookup ───────────────
export async function scanBarcode(blob: Blob): Promise<BarcodeScanResponse> {
  const form = new FormData();
  form.append('image', blob, 'scan.jpg');
  const res = await fetch(`${BASE}/api/scan/barcode`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json() as Promise<BarcodeScanResponse>;
}
