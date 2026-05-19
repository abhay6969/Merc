export type ParsedGitHubRepo = {
  owner: string;
  repo: string;
};

const GITHUB_REPO_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/;

const SHORT_REPO_REGEX = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

export function parseGitHubUrl(input: string): ParsedGitHubRepo {
  const trimmed = input.trim();

  const full = GITHUB_REPO_REGEX.exec(trimmed);
  if (full) {
    return { owner: full[1], repo: full[2] };
  }

  const short = SHORT_REPO_REGEX.exec(trimmed);
  if (short) {
    return { owner: short[1], repo: short[2] };
  }

  throw new Error(
    "Invalid GitHub URL. Use https://github.com/owner/repo or owner/repo",
  );
}
