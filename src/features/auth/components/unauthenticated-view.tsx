import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemMedia, ItemTitle } from "@/components/ui/item";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { LogInIcon, ShieldAlertIcon } from "lucide-react";

export const UnauthenticatedView = ()=>{
  return(
    <div className=" flex items-center justify-center h-screen bg-background">
      <div className="w-ful max-w-lg bg-muted">
        <Item variant="outline">
          <ItemMedia>
            <ShieldAlertIcon className="size-6 text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Unauthorized</ItemTitle>
            <ItemDescription>
              You are not authorized to access this page.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignInButton > 
              <Button variant="outline">
                <LogInIcon className="size-4" />
                Sign In
              </Button>
            </SignInButton>
          </ItemActions>
        </Item>
      </div>
      {/* <SignInButton /> */}
      {/* <SignUpButton /> */}
    </div>
  );
};