import { create } from "zustand";

const useUrlStore = create((set, get) => ({
  url: "https://cdn.mediaklikk.org:443/m4/0QjMxYTMxAzM", // Initial state
  setUrl: (newUrl) => set({ url: newUrl }),
  getUrl: () => get().url,
}));

export default useUrlStore;
