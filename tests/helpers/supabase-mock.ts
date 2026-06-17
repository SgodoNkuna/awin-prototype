import { vi } from "vitest";

/**
 * Builds a chainable mock that mirrors supabase-js's fluent API.
 * Any unknown method returns the same builder, so chains like
 * .from().select().eq().order().limit() work.
 * Terminate the chain by awaiting the builder (it is then-able)
 * or by calling .maybeSingle() / .single().
 */
export function makeSupabaseMock(resolved: { data?: unknown; error?: unknown } = { data: [] }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler: ProxyHandler<typeof builder> = {
    get(target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => Promise.resolve(resolved).then(resolve);
      }
      if (prop === "maybeSingle" || prop === "single") {
        return vi.fn().mockResolvedValue(resolved);
      }
      if (!target[prop as string]) {
        target[prop as string] = vi.fn(() => proxy);
      }
      return target[prop as string];
    },
  };
  const proxy: unknown = new Proxy(builder, handler);
  return {
    from: vi.fn(() => proxy),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

export type SupabaseMock = ReturnType<typeof makeSupabaseMock>;
