import { useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

export function useUpdateProjectSettings() {
  return useMutation(api.projects.updateSettings);
}
