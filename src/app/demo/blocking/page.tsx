"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DEFAULT_PROMPT = "Write a vegetarian lasagna recipe for 4 people";

export default function DemoBlockingPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
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
      setResult(data.text ?? JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <p className="text-muted-foreground text-sm mb-2">
          <Link href="/demo" className="underline hover:no-underline">
            ← Blocking vs Background demo
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">Demo: Blocking AI Route</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Test the Gemini blocking API. Enter a prompt and get a response.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={DEFAULT_PROMPT}
            rows={4}
            disabled={loading}
            className="resize-none"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Generating…" : "Generate"}
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {result !== null && !error && (
        <div className="space-y-2">
          <Label>Response</Label>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
