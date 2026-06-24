import type { CapturedExport } from "@/lib/export-runbook";

export type ExportJobMode = "pdf" | "screenshots";
export type ExportJobStatus = "running" | "assembling" | "ready" | "complete" | "failed";

export type ExportJobState = {
  id: string;
  mode: ExportJobMode;
  selectedPages: string[];
  selectedThemes: string[];
  status: ExportJobStatus;
  progress: number;
  statusText: string;
  done: number;
  total: number;
  errors: string[];
  createdAt: string;
  updatedAt: string;
};

const JOB_KEY = "awin-export-job-v2";
const DB_NAME = "awin-export-captures-v1";
const STORE_NAME = "captures";

type StoredCapture = {
  key: string;
  jobId: string;
  capture: CapturedExport;
  updatedAt: string;
};

const isBrowser = () => typeof window !== "undefined";

function createId() {
  if (isBrowser() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createExportJob(args: {
  mode: ExportJobMode;
  selectedPages: string[];
  selectedThemes: string[];
  total: number;
}): ExportJobState {
  const now = new Date().toISOString();
  return {
    id: createId(),
    mode: args.mode,
    selectedPages: args.selectedPages,
    selectedThemes: args.selectedThemes,
    status: "running",
    progress: 0,
    statusText: "Preparing export…",
    done: 0,
    total: args.total,
    errors: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadExportJob(): ExportJobState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(JOB_KEY);
    return raw ? (JSON.parse(raw) as ExportJobState) : null;
  } catch {
    return null;
  }
}

export function saveExportJob(job: ExportJobState) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(JOB_KEY, JSON.stringify({ ...job, updatedAt: new Date().toISOString() }));
  } catch {
    /* metadata persistence is best-effort */
  }
}

export function clearExportJob() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(JOB_KEY);
  } catch {
    /* ignore */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open export cache"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, task: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = task(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Export cache request failed"));
      tx.onerror = () => reject(tx.error ?? new Error("Export cache transaction failed"));
    });
  } finally {
    db.close();
  }
}

function captureKey(jobId: string, page: string, theme: string) {
  return `${jobId}::${page}::${theme}`;
}

export async function saveJobCapture(jobId: string, capture: CapturedExport) {
  const entry: StoredCapture = {
    key: captureKey(jobId, capture.page, capture.theme),
    jobId,
    capture,
    updatedAt: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.put(entry));
}

export async function getJobCaptures(jobId: string) {
  const all = await withStore<StoredCapture[]>("readonly", (store) => store.getAll());
  return all.filter((item) => item.jobId === jobId).map((item) => item.capture);
}

export async function clearJobCaptures(jobId: string) {
  const all = await withStore<StoredCapture[]>("readonly", (store) => store.getAll());
  await Promise.all(
    all
      .filter((item) => item.jobId === jobId)
      .map((item) => withStore("readwrite", (store) => store.delete(item.key))),
  );
}