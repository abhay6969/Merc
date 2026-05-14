import { useCallback } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { defaultTabState, useEditorStore } from "../store/use-editor-store";

export const useEditor  = (projectId:Id<"project">) => {
  const tabState = useEditorStore((s) => s.tabs.get(projectId) ?? defaultTabState);
  const openFile = useCallback((
    fileId:Id<"files">,
    options:{pinned:boolean},
  )=>{
    useEditorStore.getState().openFile(projectId, fileId, options);
  },[projectId]);

  const closeTab = useCallback((
    fileId:Id<"files">
  )=>{
    useEditorStore.getState().closeTab(projectId, fileId);
  },[projectId]);

  const closeAllTabs = useCallback(()=>{
    useEditorStore.getState().closeAllTabs(projectId);
  },[projectId]);

  const setActiveTab = useCallback((
    fileId:Id<"files">,
  )=>{
    useEditorStore.getState().setActiveTab(projectId, fileId);
  },[projectId]);

  return {
    openTabs: tabState.openTabs,
    activeTab: tabState.activeTab,
    previewTabId: tabState.previewTabId,
    openFile,
    closeTab,
    closeAllTabs,
    setActiveTab,
  }
}