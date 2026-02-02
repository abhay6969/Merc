"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEFAULT_PROMPT =
  "Write a vegetarian lasagna recipe in 5 steps for 4 people";

export default function DemoPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  // Blocking state
  const [blockingResult, setBlockingResult] = useState<string | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [blockingLoading, setBlockingLoading] = useState(false);

  // Background state
  const [backgroundMessage, setBackgroundMessage] = useState<string | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  async function handleBlocking(e: React.FormEvent) {
    e.preventDefault();
    setBlockingError(null);
    setBlockingResult(null);
    setBlockingLoading(true);
    try {
      const res = await fetch("/api/demo/blocking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || DEFAULT_PROMPT }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBlockingResult(data.text ?? JSON.stringify(data, null, 2));
    } catch (err) {
      setBlockingError(err instanceof Error ? err.message : String(err));
    } finally {
      setBlockingLoading(false);
    }
  }

  async function handleBackground(e: React.FormEvent) {
    e.preventDefault();
    setBackgroundError(null);
    setBackgroundMessage(null);
    setBackgroundLoading(true);
    try {
      const res = await fetch("/api/demo/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || DEFAULT_PROMPT }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setBackgroundMessage(
        data.message ?? "Job queued. Check Inngest Dev Server for the result."
      );
    } catch (err) {
      setBackgroundError(err instanceof Error ? err.message : String(err));
    } finally {
      setBackgroundLoading(false);
    }
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Demo: Blocking vs Background</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Same prompt, two ways: blocking (wait for the API) or background (Inngest runs the job and returns immediately).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt (shared)</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={DEFAULT_PROMPT}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Blocking */}
        <Card>
          <CardHeader>
            <CardTitle>Blocking</CardTitle>
            <CardDescription>
              Request waits until the AI responds. You see the result below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBlocking}
              disabled={blockingLoading}
              className="w-full"
            >
              {blockingLoading ? "Generating…" : "Generate (blocking)"}
            </Button>
            {blockingError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
                {blockingError}
              </div>
            )}
            {blockingResult !== null && !blockingError && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Response</Label>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {blockingResult}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Background (Inngest) */}
        <Card>
          <CardHeader>
            <CardTitle>Background (Inngest)</CardTitle>
            <CardDescription>
              Request returns immediately. Inngest runs the job in the background; check the Inngest Dev Server or logs for the result.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBackground}
              disabled={backgroundLoading}
              variant="outline"
              className="w-full"
            >
              {backgroundLoading ? "Sending…" : "Run in background (Inngest)"}
            </Button>
            {backgroundError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
                {backgroundError}
              </div>
            )}
            {backgroundMessage && !backgroundError && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                {backgroundMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Inngest Dev Server: run <code className="rounded bg-muted px-1">npx inngest-cli@latest dev</code> and open the dashboard to see background runs.
      </p>
    </div>
  );
}
