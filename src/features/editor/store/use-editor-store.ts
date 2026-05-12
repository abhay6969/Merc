import { Id } from "../../../../convex/_generated/dataModel";
import { create } from "zustand";

export interface TabState{
  openTabs:Id<"files">[];
  activeTab:Id<"files"> | null;
  previewTabId:Id<"files"> | null;
}

export const defaultTabState:TabState = {
  openTabs:[],
  activeTab:null,
  previewTabId:null,
}

interface EditorStore{
 tabs:Map<Id<"project">, TabState>;
 getTabState:(projectId:Id<"project">) => TabState;
 openFile:(
  projectId:Id<"project">,
  fileId:Id<"files">,
  options:{pinned:boolean}
  ) => void;
 closeTab:(
  projectId:Id<"project">,
  fileId:Id<"files">,
 )=>void;
 closeAllTabs:(projectId:Id<"project">) => void;
 setActiveTab:(projectId:Id<"project">, fileId:Id<"files">) => void;
}

export const useEditorStore = create<EditorStore>()((set,get)=>({
  tabs:new Map(),
  getTabState:(projectId)=>{
    return get().tabs.get(projectId) || defaultTabState;
  },
  openFile:(projectId, fileId, {pinned})=>{
    const tabs = new Map(get().tabs);
    const state  = tabs.get(projectId) || defaultTabState;
    const {openTabs, previewTabId} = state;
    const tabIndex = openTabs.indexOf(fileId);
    const isOpen = tabIndex !== -1;

    if (pinned) {
      if (!isOpen) {
        tabs.set(projectId, {
          ...state,
          openTabs: [...openTabs, fileId],
          activeTab: fileId,
        });
        set({tabs});
        return;
      }
      if (previewTabId === fileId) {
        tabs.set(projectId, {
          ...state,
          activeTab: fileId,
          previewTabId: null,
        });
        set({tabs});
        return;
      }
      tabs.set(projectId, {
        ...state,
        activeTab: fileId,
      });
      set({tabs});
      return;
    }

    if (isOpen) {
      if (previewTabId === fileId) {
        tabs.set(projectId, {
          ...state,
          activeTab: fileId,
        });
        set({tabs});
        return;
      }
      tabs.set(projectId, {
        ...state,
        activeTab: fileId,
      });
      set({tabs});
      return;
    }

    if (previewTabId !== null) {
      const newOpenTabs = openTabs.map((id) =>
        id === previewTabId ? fileId : id,
      );
      tabs.set(projectId, {
        ...state,
        openTabs: newOpenTabs,
        activeTab: fileId,
        previewTabId: fileId,
      });
      set({tabs});
      return;
    }

    tabs.set(projectId, {
      ...state,
      openTabs: [...openTabs, fileId],
      activeTab: fileId,
      previewTabId: fileId,
    });
    set({tabs});
  },
  closeTab:(projectId, fileId)=>{
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) || defaultTabState;
    const {openTabs, activeTab , previewTabId} = state;
    const tabIndex = openTabs.indexOf(fileId);

    if(tabIndex === -1)return;
    const newTabs = openTabs.filter((id)=>id !== fileId);
    let newActiveTab = activeTab;
    if(activeTab === fileId){
      if(newTabs.length === 0){
        newActiveTab = null;
      }
      else if(tabIndex > 0){
        newActiveTab = newTabs[tabIndex - 1];
      }
      else{
        newActiveTab = newTabs[0];
      }
    }
    tabs.set(projectId,{
      openTabs:newTabs,
      activeTab:newActiveTab,
      previewTabId:previewTabId === fileId ? null : previewTabId,
    })
    set({tabs});

  },
  closeAllTabs:(projectId)=>{
    const tabs = new Map(get().tabs);
    tabs.set(projectId, defaultTabState);
    set({tabs});
  },
  setActiveTab:(projectId, fileId)=>{
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) || defaultTabState;
    if (!state.openTabs.includes(fileId)) {
      return;
    }
    tabs.set(projectId, {
      ...state,
      activeTab:fileId,
    });
    set({tabs});
  },
}))