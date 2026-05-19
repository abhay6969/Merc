import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Required for WebContainer (SharedArrayBuffer). Must match `WebContainer.boot({ coep })`. */
const WEB_CONTAINER_HEADERS = {
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

function applyWebContainerHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(WEB_CONTAINER_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function shouldApplyWebContainerHeaders(pathname: string): boolean {
  if (pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/_next")) return false;
  if (pathname.startsWith("/monitoring")) return false;
  // Static files (favicon, images, etc.)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return false;
  return true;
}

export default clerkMiddleware((_auth, request) => {
  if (!shouldApplyWebContainerHeaders(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return applyWebContainerHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and Inngest (needs raw PUT body for sync)
    "/((?!_next|api/inngest|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // API routes except Inngest webhook/sync endpoint
    "/(api(?!/inngest)|trpc)(.*)",
  ],
};
