"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wallet,
  TrendingUp,
  ShoppingCart,
  Users,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type SaxoUser = Record<string, unknown>;
type Account = Record<string, unknown> & { AccountKey?: string; DisplayName?: string; ClientKey?: string; AccountType?: string; Currency?: string };
type Balance = Record<string, unknown> & { CurrencyCode?: string; CashBalance?: number; Balance?: number };
type Position = Record<string, unknown> & { InstrumentId?: string; AssetType?: string; Amount?: number; AveragePrice?: number; MarketValue?: number };
type Order = Record<string, unknown> & { OrderId?: string; AssetType?: string; Amount?: number; OrderType?: string; Status?: string };

export default function SaxoPage() {
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SaxoUser | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<unknown[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);

  const saxoOk = searchParams.get("saxo") === "ok";
  const isConnected = !!user;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, balancesRes, positionsRes, ordersRes, clientsRes, accountsRes] =
        await Promise.all([
          fetch("/api/saxo/me", { cache: "no-store" }),
          fetch("/api/saxo/balances", { cache: "no-store" }),
          fetch("/api/saxo/positions", { cache: "no-store" }),
          fetch("/api/saxo/orders", { cache: "no-store" }),
          fetch("/api/saxo/clients", { cache: "no-store" }),
          fetch("/api/saxo/accounts", { cache: "no-store" }),
        ]);

      if (meRes.ok) {
        const d = await meRes.json();
        setUser(d);
        setError(null);
      } else {
        const err = await meRes.json().catch(() => ({}));
        const msg = err.detail ?? err.error;
        if (meRes.status === 401 || meRes.status === 502 || (msg && String(msg).toLowerCase().includes("token"))) {
          setUser(null);
          setError(null);
        } else {
          setUser(null);
          setError(msg ?? "Failed to load user");
        }
      }

      if (balancesRes.ok) {
        const d = await balancesRes.json();
        setBalances(d.balances ?? []);
      }
      if (positionsRes.ok) {
        const d = await positionsRes.json();
        setPositions(d.positions ?? []);
      }
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.orders ?? []);
      }
      if (clientsRes.ok) {
        const d = await clientsRes.json();
        setClients(d.clients ?? []);
      }
      if (accountsRes.ok) {
        const d = await accountsRes.json();
        setAccounts(d.accounts ?? []);
      }
    } catch (e) {
      setError("Could not load Saxo data");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (saxoOk) {
      fetchDashboard();
    } else {
      fetchDashboard();
    }
  }, [saxoOk, fetchDashboard]);

  const handleConnect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const state = crypto.randomUUID();
      const res = await fetch(
        `/api/saxo/auth-url?state=${encodeURIComponent(state)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to get Saxo login URL");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No redirect URL returned");
    } catch (e) {
      setError("Could not start Saxo connection");
    } finally {
      setConnecting(false);
    }
  }, []);

  const formatNum = (n: number | undefined) =>
    n != null && Number.isFinite(n)
      ? new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
      : "—";

  const openEdit = (acc: Account) => {
    setEditAccount(acc);
    setEditDisplayName(String(acc.DisplayName ?? acc.AccountKey ?? ""));
  };

  const saveEdit = useCallback(async () => {
    if (!editAccount?.AccountKey) return;
    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/saxo/accounts/${encodeURIComponent(editAccount.AccountKey)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ DisplayName: editDisplayName || undefined }),
        }
      );
      if (res.ok) {
        setEditAccount(null);
        fetchDashboard();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.detail ?? d.error ?? "Failed to update account");
      }
    } finally {
      setEditSaving(false);
    }
  }, [editAccount?.AccountKey, editDisplayName, fetchDashboard]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Saxo Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Connect your Saxo Bank account and view portfolio, positions, and
            orders.
          </p>
        </div>
        {isConnected && (
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        )}
      </div>

      {/* Connection card */}
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-400" />
          Saxo Bank
        </CardTitle>
        <CardContent className="mt-4">
          {loading && !user && !saxoOk ? (
            <div className="flex items-center gap-3 py-6 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking connection…
            </div>
          ) : isConnected ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-2.5">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Connected to Saxo
                  </p>
                  <p className="text-xs text-zinc-500">
                    {user?.UserId ?? user?.ClientKey ?? "Account linked"}
                  </p>
                </div>
              </div>
              {error && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-zinc-400">
                Sign in with your Saxo Bank credentials to link your account and
                see your portfolio here.
              </p>
              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-fit"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  "Connect to Saxo"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!isConnected && (
        <p className="text-sm text-zinc-500">
          Connect your account above to see balances, positions, and orders.
        </p>
      )}

      {isConnected && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Accounts
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {accounts.length}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-2.5">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Open Positions
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {positions.length}
                  </p>
                </div>
                <div className="rounded-xl bg-cyan-500/10 p-2.5">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Open Orders
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {orders.length}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-2.5">
                  <ShoppingCart className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Clients
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {clients.length}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-500/10 p-2.5">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Accounts */}
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                Accounts
              </CardTitle>
              <Link href="/saxo/onboarding">
                <Button variant="secondary" size="sm">
                  <Plus className="h-4 w-4" />
                  Create account
                </Button>
              </Link>
            </div>
            <CardContent className="mt-4">
              {accounts.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  No accounts. Create one via onboarding to add a new client and
                  account.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Display name</TableHead>
                      <TableHead>Account key</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((acc, i) => (
                      <TableRow key={acc.AccountKey ?? i}>
                        <TableCell className="font-medium">
                          {String(acc.DisplayName ?? acc.AccountKey ?? "—")}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-400">
                          {String(acc.AccountKey ?? "—")}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {String(acc.ClientKey ?? "—")}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {String(acc.AccountType ?? acc.Currency ?? "—")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-zinc-400 hover:text-zinc-200"
                              onClick={() => openEdit(acc)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-zinc-400 hover:text-red-400"
                              onClick={() => setDeleteAccount(acc)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Balances */}
          <Card>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              Balances
            </CardTitle>
            <CardContent className="mt-4">
              {balances.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  No balance data returned.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account / Currency</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {String(b.AccountKey ?? b.CurrencyCode ?? "—")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-200">
                          {formatNum(Number(b.CashBalance ?? (b as Balance).CashBalance))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-200">
                          {formatNum(Number(b.Balance ?? (b as Balance).Balance))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Positions */}
          <Card>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Positions
            </CardTitle>
            <CardContent className="mt-4">
              {positions.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  No open positions.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Avg price</TableHead>
                      <TableHead className="text-right">Market value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {String(p.InstrumentId ?? p.Uic ?? "—")}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {String(p.AssetType ?? "—")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNum(Number(p.Amount ?? (p as Position).Amount))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-200">
                          {formatNum(Number(p.AveragePrice ?? (p as Position).AveragePrice))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-200">
                          {formatNum(Number(p.MarketValue ?? (p as Position).MarketValue))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-400" />
              Open Orders
            </CardTitle>
            <CardContent className="mt-4">
              {orders.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  No open orders.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {String(o.OrderId ?? "—")}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {String(o.OrderType ?? "—")}
                        </TableCell>
                        <TableCell>{String(o.AssetType ?? "—")}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNum(Number(o.Amount ?? (o as Order).Amount))}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-300">
                            {String(o.Status ?? "—")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit account modal */}
          <Modal
            open={!!editAccount}
            onClose={() => setEditAccount(null)}
            title="Edit account"
          >
            <div className="space-y-4">
              <Input
                label="Display name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder={editAccount?.AccountKey as string}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditAccount(null)}
                  disabled={editSaving}
                >
                  Cancel
                </Button>
                <Button onClick={saveEdit} loading={editSaving}>
                  Save
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete / close account info modal */}
          <ConfirmModal
            open={!!deleteAccount}
            onClose={() => setDeleteAccount(null)}
            onConfirm={() => setDeleteAccount(null)}
            title="Close account"
            message="Account closure is not available through Nexow. To close an account, please contact Saxo Bank or use their platform (saxobank.com) or app."
            confirmLabel="OK"
            confirmVariant="primary"
          />
        </>
      )}
    </div>
  );
}
