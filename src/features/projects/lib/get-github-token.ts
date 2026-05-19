import { clerkClient } from "@clerk/nextjs/server";

export class GitHubNotConnectedError extends Error {
  constructor() {
    super("GitHub is not connected");
    this.name = "GitHubNotConnectedError";
  }
}

export async function getGitHubAccessToken(
  userId: string,
): Promise<string> {
  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");

  const token = tokens.data[0]?.token;
  if (!token) {
    throw new GitHubNotConnectedError();
  }

  return token;
}
