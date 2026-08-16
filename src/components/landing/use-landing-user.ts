"use client";

import { useEffect, useState } from "react";
import type { LandingUserState } from "@/components/landing/types";

export function useLandingUser(): LandingUserState {
  const [state, setState] = useState<LandingUserState>({
    guest: true,
    name: null,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) {
          if (!cancelled) setState((prev) => ({ ...prev, loaded: true }));
          return;
        }
        setState({
          guest: Boolean(data.user.guest),
          name: data.user.name ?? null,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
