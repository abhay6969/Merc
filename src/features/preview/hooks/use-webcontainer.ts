"use client";

import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { ProjectPreviewSettings, PreviewStatus } from "../types";
import {
  buildFileTree,
  isTextProjectFile,
  listSyncableTextFiles,
  type ProjectFile,
} from "../utils/file-tree";
import { assertCrossOriginIsolatedForPreview } from "../lib/cross-origin-isolation";
import { parseCommand } from "../utils/parse-command";

let webcontainerSingleton: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerSingleton !== null) {
    return webcontainerSingleton;
  }

  if (bootPromise !== null) {
    return bootPromise;
  }

  bootPromise = (async () => {
    assertCrossOriginIsolatedForPreview();
    const { WebContainer } = await import("@webcontainer/api");
    const instance = await WebContainer.boot({ coep: "credentialless" });
    webcontainerSingleton = instance;
    return instance;
  })();

  return bootPromise;
}

export async function teardownWebContainer(): Promise<void> {
  if (webcontainerSingleton !== null) {
    webcontainerSingleton.teardown();
    webcontainerSingleton = null;
    bootPromise = null;
  }
}

const DEFAULT_INSTALL_COMMAND = "npm install";
const DEFAULT_DEV_COMMAND = "npm run dev";

async function pipeProcessOutput(
  process: WebContainerProcess,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const reader = process.output.getReader();
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      onChunk(value);
    }
  } finally {
    reader.releaseLock();
  }
}

async function writeTextFileToContainer(
  container: WebContainer,
  path: string,
  content: string,
): Promise<void> {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : null;
  if (dir !== null && dir.length > 0) {
    await container.fs.mkdir(dir, { recursive: true });
  }
  await container.fs.writeFile(path, content);
}

function killProcesses(processes: WebContainerProcess[]): void {
  for (const process of processes) {
    try {
      process.kill();
    } catch {
      // Process may already be dead.
    }
  }
}

export type UseWebContainerOptions = {
  projectId: Id<"project">;
  enabled: boolean;
  settings: ProjectPreviewSettings;
  files: ProjectFile[] | undefined;
};

export function useWebContainer({
  projectId,
  enabled,
  settings,
  files,
}: UseWebContainerOptions) {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [restartKey, setRestartKey] = useState(0);

  const mountedRef = useRef(true);
  const bootingRef = useRef(false);
  const runGenerationRef = useRef(0);
  const containerRef = useRef<WebContainer | null>(null);
  const processesRef = useRef<WebContainerProcess[]>([]);
  const serverReadyUnsubRef = useRef<(() => void) | null>(null);
  const syncedContentRef = useRef<Map<string, string>>(new Map());
  const appendOutputRef = useRef<(chunk: string) => void>(() => undefined);

  const appendOutput = useCallback((chunk: string) => {
    if (!mountedRef.current || chunk.length === 0) {
      return;
    }
    setTerminalOutput((prev) => prev + chunk);
  }, []);

  appendOutputRef.current = appendOutput;

  const restart = useCallback(() => {
    runGenerationRef.current += 1;
    killProcesses(processesRef.current);
    processesRef.current = [];
    serverReadyUnsubRef.current?.();
    serverReadyUnsubRef.current = null;
    containerRef.current = null;
    syncedContentRef.current = new Map();
    bootingRef.current = false;

    void teardownWebContainer().finally(() => {
      if (!mountedRef.current) {
        return;
      }
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
      setTerminalOutput("");
      setRestartKey((key) => key + 1);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runGenerationRef.current += 1;
      killProcesses(processesRef.current);
      processesRef.current = [];
      serverReadyUnsubRef.current?.();
      serverReadyUnsubRef.current = null;
      bootingRef.current = false;
      void teardownWebContainer();
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (files === undefined) {
      return;
    }

    if (bootingRef.current) {
      return;
    }

    const hasTextFiles = files.some(isTextProjectFile);
    if (!hasTextFiles) {
      setStatus("error");
      setError(
        "No text files to preview. Add project files (e.g. package.json) first.",
      );
      return;
    }

    const generation = ++runGenerationRef.current;
    bootingRef.current = true;

    const abortController = new AbortController();

    const run = async () => {
      try {
        if (!mountedRef.current || generation !== runGenerationRef.current) {
          return;
        }

        setStatus("booting");
        setError(null);
        setPreviewUrl(null);
        setTerminalOutput("");

        const container = await getWebContainer();
        if (
          !mountedRef.current ||
          generation !== runGenerationRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }

        containerRef.current = container;

        serverReadyUnsubRef.current?.();
        serverReadyUnsubRef.current = container.on(
          "server-ready",
          (_port, url) => {
            if (
              !mountedRef.current ||
              generation !== runGenerationRef.current
            ) {
              return;
            }
            setPreviewUrl(url);
            setStatus("running");
          },
        );

        appendOutputRef.current(
          `[preview] Mounting ${files.length} project entries…\n`,
        );
        const tree = buildFileTree(files);
        await container.mount(tree);

        if (
          !mountedRef.current ||
          generation !== runGenerationRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }

        const initialSynced = listSyncableTextFiles(files);
        syncedContentRef.current = new Map(
          initialSynced.map((entry) => [entry.path, entry.content]),
        );

        setStatus("installing");
        const installCommand =
          settings.installCommand?.trim() || DEFAULT_INSTALL_COMMAND;
        const { bin: installBin, args: installArgs } =
          parseCommand(installCommand);

        appendOutputRef.current(`[preview] $ ${installCommand}\n`);
        const installProcess = await container.spawn(installBin, installArgs);
        processesRef.current.push(installProcess);

        void pipeProcessOutput(
          installProcess,
          (chunk) => appendOutputRef.current(chunk),
          abortController.signal,
        );

        const installExit = await installProcess.exit;
        if (
          !mountedRef.current ||
          generation !== runGenerationRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }

        if (installExit !== 0) {
          throw new Error(
            `Install failed (exit ${installExit}). Check terminal output or adjust install command in settings.`,
          );
        }

        const devCommand = settings.devCommand?.trim() || DEFAULT_DEV_COMMAND;
        const { bin: devBin, args: devArgs } = parseCommand(devCommand);

        appendOutputRef.current(`[preview] $ ${devCommand}\n`);
        const devProcess = await container.spawn(devBin, devArgs);
        processesRef.current.push(devProcess);

        void pipeProcessOutput(
          devProcess,
          (chunk) => appendOutputRef.current(chunk),
          abortController.signal,
        );

        if (
          !mountedRef.current ||
          generation !== runGenerationRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }

        setStatus("running");
      } catch (cause) {
        if (
          !mountedRef.current ||
          generation !== runGenerationRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }
        const message =
          cause instanceof Error ? cause.message : "Preview failed to start";
        setError(message);
        setStatus("error");
        appendOutputRef.current(`[preview] Error: ${message}\n`);
      } finally {
        if (generation === runGenerationRef.current) {
          bootingRef.current = false;
        }
      }
    };

    void run();

    return () => {
      abortController.abort();
      killProcesses(processesRef.current);
      processesRef.current = [];
      serverReadyUnsubRef.current?.();
      serverReadyUnsubRef.current = null;
      bootingRef.current = false;
    };
  }, [
    enabled,
    files,
    projectId,
    restartKey,
    settings.devCommand,
    settings.installCommand,
  ]);

  useEffect(() => {
    if (!enabled || files === undefined) {
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    if (status !== "running" && status !== "installing") {
      return;
    }

    const generation = runGenerationRef.current;

    const sync = async () => {
      const syncable = listSyncableTextFiles(files);

      for (const entry of syncable) {
        if (
          !mountedRef.current ||
          generation !== runGenerationRef.current ||
          containerRef.current !== container
        ) {
          return;
        }

        const previous = syncedContentRef.current.get(entry.path);
        if (previous === entry.content) {
          continue;
        }

        try {
          await writeTextFileToContainer(
            container,
            entry.path,
            entry.content,
          );
          syncedContentRef.current.set(entry.path, entry.content);
        } catch (cause) {
          const message =
            cause instanceof Error ? cause.message : "Sync failed";
          appendOutputRef.current(
            `[preview] Failed to sync ${entry.path}: ${message}\n`,
          );
        }
      }
    };

    void sync();
  }, [enabled, files, status]);

  return {
    status,
    previewUrl,
    error,
    terminalOutput,
    restart,
    restartKey,
  };
}
