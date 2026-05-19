export type PreviewStatus =
  | "idle"
  | "booting"
  | "installing"
  | "running"
  | "error";

export type ProjectPreviewSettings = {
  installCommand?: string;
  devCommand?: string;
};
