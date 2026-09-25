// Shared TypeScript types matching backend schemas exactly

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Expense {
  id: number;
  item: string;
  price_paise: number;
  quantity: number | null;
  category_id: number | null;
  category: Category | null;
  purchase_date: string | null;
  expiry_date: string | null;
  barcode: string | null;
  image_path: string | null;
  source: 'scan' | 'photo' | 'manual';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedExpenses {
  items: Expense[];
  next_cursor: number | null;
  has_more: boolean;
}

export interface ExpenseCreate {
  item: string;
  price_paise: number;
  quantity?: number | null;
  category_id?: number | null;
  purchase_date?: string | null;
  expiry_date?: string | null;
  barcode?: string | null;
  source: 'scan' | 'photo' | 'manual';
  notes?: string | null;
}

export interface ExpenseUpdate {
  item?: string;
  price_paise?: number;
  quantity?: number | null;
  category_id?: number | null;
  purchase_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface StatsSummary {
  month: string;
  total_paise: number;
  item_count: number;
  vs_last_month_paise: number;
}

export interface ByCategoryItem {
  category_id: number | null;
  category_name: string;
  total_paise: number;
}

export interface TrendPoint {
  date: string;
  total_paise: number;
}

export interface BarcodeLookupResponse {
  barcode: string;
  name: string | null;
  brand: string | null;
  category: string | null;
}

export interface BarcodeItem {
  format: string;
  text: string;
}

export interface BarcodeScanResponse {
  found: boolean;
  barcodes: BarcodeItem[];
  barcode: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  quantity: number | null;
}

export interface ScanPrefill {
  item: string | null;
  barcode: string;
  brand: string | null;
  category: string | null;
  quantity?: number | null;
}

export interface ExtractResponse {
  item: string | null;
  price: number | null;
  quantity: number | null;
  category: string | null;
  expiry_date: string | null;
  purchase_date: string | null;
  confidence: number | null;
}

export interface PhotoPrefill {
  item: string | null;
  price: number | null;
  quantity: number | null;
  category: string | null;
  expiry_date: string | null;
  purchase_date: string | null;
  confidence: number | null;
}
