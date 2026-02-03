import { inngest } from "@/inngest/client";
import { serve } from "inngest/next";
import { demoGenerate} from "./functions";

export const {GET,POST,PUT} = serve({
  client:inngest,
  functions:[
    demoGenerate,
  ],
})