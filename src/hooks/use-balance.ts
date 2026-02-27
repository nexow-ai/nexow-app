"use client";

import { useCallback, useEffect, useState } from "react";

export function useBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      const data = await res.json();
      if (res.ok && data.balance != null) {
        setBalance(data.balance);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { balance, loading };
}
