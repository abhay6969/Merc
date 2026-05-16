import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { demoGenerate, processMessage } from "./functions";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processMessage, // AI generation worker — triggered by "message.sent"
    demoGenerate,   // Demo / connectivity test
  ],
});
