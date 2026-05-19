import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  demoGenerate,
  exportToGitHubFn,
  importGitHubRepositoryFn,
  processMessage,
} from "./functions";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processMessage,
    importGitHubRepositoryFn,
    exportToGitHubFn,
    demoGenerate,
  ],
});
