import { AuthConfig } from "convex/server";

export default{
  providers:[
    {
      domain:process.env.CLERK_JWT_ISSUER_URL!,
      applicationID:"convex",
    }
  ]
}satisfies AuthConfig;