import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_API_HOST, DEFAULT_MODELS, StoreKey } from "../constant";
import { getHeaders } from "../client/api";
import { BOT_HELLO } from "./chat";
import { getClientConfig } from "../config/client";

export interface AccessControlStore {
  accessCode: string;
  token: string;
  needCode: boolean;
  hideUserApiKey: boolean;
  hideBalanceQuery: boolean;
  disableGPT4: boolean;
  userEmail: string;
  serverUrl: string;
  openaiUrl: string;
  midjourneyProxyUrl: string;
  useMjImgSelfProxy: boolean;

  updateToken: (_: string) => void;
  updateCode: (_: string) => void;
  updateUserEmail: (_: string) => void;
  updateMidjourneyProxyUrl: (_: string) => void;
  updateServerUrl: (_: string) => void;
  enabledAccessControl: () => boolean;
  isAuthorized: () => boolean;
  fetch: () => void;

  updateOpenAiUrl(url: string): void;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export" ? DEFAULT_API_HOST : "/api/openai/";
console.log("[API] default openai url", DEFAULT_OPENAI_URL);

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "",
      accessCode: "",
      needCode: true,
      serverUrl: "",
      hideUserApiKey: false,
      hideBalanceQuery: false,
      disableGPT4: false,
      midjourneyProxyUrl: "",
      userEmail: "",
      useMjImgSelfProxy: false,
      openaiUrl: DEFAULT_OPENAI_URL,

      enabledAccessControl() {
        get().fetch();

        return get().needCode;
      },
      updateCode(code: string) {
        set(() => ({ accessCode: code?.trim() }));
      },
      updateUserEmail(email: string) {
        set(() => ({ userEmail: email?.trim() }));
      },
      updateServerUrl(url: string) {
        set(() => ({ serverUrl: url?.trim() }));
      },
      updateToken(token: string) {
        set(() => ({ token: token?.trim() }));
      },
      updateOpenAiUrl(url: string) {
        set(() => ({ openaiUrl: url?.trim() }));
      },
      updateMidjourneyProxyUrl(midjourneyProxyUrl: string) {
        set(() => ({ midjourneyProxyUrl }));
      },
      isAuthorized() {
        get().fetch();

        // has token or has code or disabled access control
        return (
          !!get().token || !!get().accessCode || !get().enabledAccessControl()
        );
      },
      fetch() {
        if (fetchState > 0 || getClientConfig()?.buildMode === "export") return;
        fetchState = 1;
        fetch("/api/config", {
          method: "post",
          body: null,
          headers: {
            ...getHeaders(),
          },
        })
          .then((res) => res.json())
          .then((res: DangerConfig) => {
            console.log("[Config] got config from server", res);
            set(() => ({ ...res }));

            if (!res.enableGPT4) {
              DEFAULT_MODELS.forEach(
                (m: any) => (m.available = !m.name.startsWith("gpt-4")),
              );
            }
          })
          .catch(() => {
            console.error("[Config] failed to fetch config");
          })
          .finally(() => {
            fetchState = 2;
          });
      },
    }),
    {
      name: StoreKey.Access,
      version: 1,
    },
  ),
);
