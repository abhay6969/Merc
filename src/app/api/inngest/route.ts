import { demoGenerate } from "./functions";
import { inngest } from "@/inngest/client";
import { serve } from "inngest/next";

export const dynamic = "force-dynamic";

export const {GET,POST,PUT} = serve({
  client:inngest,
  functions:[
    demoGenerate,
  ],
})