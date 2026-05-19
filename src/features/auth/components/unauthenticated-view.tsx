import { MercenaryLogo } from "@/components/brand/mercenary-logo";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { SignInButton } from "@clerk/nextjs";
import { LogInIcon, ShieldAlertIcon } from "lucide-react";

export const UnauthenticatedView = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1220] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.12),transparent)]"
      />
      <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex justify-center">
          <MercenaryLogo size="lg" />
        </div>
        <Item variant="outline" className="border-white/[0.08] bg-transparent">
          <ItemMedia>
            <ShieldAlertIcon className="size-6 text-slate-400" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-[#f8fafc]">Sign in required</ItemTitle>
            <ItemDescription className="text-slate-400">
              Sign in to open your Mercenary workspace and projects.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignInButton>
              <Button
                variant="default"
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-500"
              >
                <LogInIcon className="size-4" />
                Sign in
              </Button>
            </SignInButton>
          </ItemActions>
        </Item>
      </div>
    </div>
  );
};
