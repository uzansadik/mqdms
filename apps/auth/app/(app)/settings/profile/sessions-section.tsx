"use client";

import { authClient } from "@mqdms/auth/client";
import { Button } from "@mqdms/ui/components/button";
import { useCallback, useEffect, useState } from "react";

type SessionItem = {
  id: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function SessionsSection() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionToken, setActionToken] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);

    const { data, error } = await authClient.listSessions();

    if (!error && data) {
      setSessions(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);
  async function revokeSession(token: string) {
    setActionToken(token);

    const { error } = await authClient.revokeSession({
      token,
    });

    if (!error) {
      await loadSessions();
    }

    setActionToken(null);
  }

  async function revokeOtherSessions() {
    setActionToken("others");

    const { error } = await authClient.revokeOtherSessions();

    if (!error) {
      await loadSessions();
    }

    setActionToken(null);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading sessions...</p>;
  }

  return (
    <div className="max-w-lg space-y-6 rounded-lg border p-6 bg-background dark:bg-background-dark">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Sessions</h2>

          <p className="text-sm text-muted-foreground">
            Manage devices where your account is signed in.
          </p>
        </div>

        {sessions.length > 1 && (
          <Button
            type="button"
            variant="outline"
            disabled={actionToken !== null}
            onClick={revokeOtherSessions}
          >
            {actionToken === "others" ? "Signing out..." : "Sign out other sessions"}
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{formatUserAgent(session.userAgent)}</p>

              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                {session.ipAddress && <p>{session.ipAddress}</p>}

                <p>Last active {new Date(session.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionToken !== null}
              onClick={() => revokeSession(session.token)}
            >
              {actionToken === session.token ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatUserAgent(userAgent?: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  if (userAgent.includes("Chrome")) {
    return "Chrome";
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox";
  }

  if (userAgent.includes("Safari")) {
    return "Safari";
  }

  return userAgent;
}
