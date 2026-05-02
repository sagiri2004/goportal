"use strict";
var GoPortalSDKBundle = (() => {
  // src/types.ts
  var GOPORTAL_PROTOCOL_VERSION = "2.0";

  // src/core/protocol.ts
  var RESPONSE_TYPE = "GOPORTAL_SDK_RESPONSE";
  var createRequestEnvelope = (request) => ({
    type: "GOPORTAL_SDK_REQUEST",
    protocol_version: request.protocolVersion ?? GOPORTAL_PROTOCOL_VERSION,
    request_id: request.requestId,
    action: request.action,
    payload: request.payload
  });
  var isResponseEnvelope = (input) => {
    if (!input || typeof input !== "object") return false;
    const raw = input;
    return raw.type === RESPONSE_TYPE && typeof raw.request_id === "string" && typeof raw.ok === "boolean";
  };

  // src/core/client.ts
  var DEFAULT_TIMEOUT_MS = 15e3;
  var GoPortalSDKError = class extends Error {
    constructor(message, options) {
      super(message);
      this.name = "GoPortalSDKError";
      this.code = options?.code ?? "ERR_INTERNAL";
      this.retryable = Boolean(options?.retryable);
      this.data = options?.data;
    }
  };
  var GoPortalSDKClient = class {
    constructor(options = {}) {
      this.pending = /* @__PURE__ */ new Map();
      this.listeners = /* @__PURE__ */ new Map();
      this.processedEventIDs = /* @__PURE__ */ new Map();
      this.roomVersions = /* @__PURE__ */ new Map();
      this.readyPromise = null;
      this.handshakeData = null;
      this.targetWindow = options.targetWindow ?? window.parent;
      this.targetOrigin = options.targetOrigin ?? "*";
      this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
      this.protocolVersion = options.protocolVersion ?? GOPORTAL_PROTOCOL_VERSION;
      this.onMessageBound = this.onMessage.bind(this);
      window.addEventListener("message", this.onMessageBound);
    }
    destroy() {
      window.removeEventListener("message", this.onMessageBound);
      this.pending.forEach((item) => {
        window.clearTimeout(item.timeoutId);
        item.reject(new GoPortalSDKError("SDK client destroyed", { code: "ERR_INTERNAL", retryable: false }));
      });
      this.pending.clear();
      this.listeners.clear();
    }
    get context() {
      return this.handshakeData?.context ?? {};
    }
    get capabilities() {
      return this.handshakeData?.capabilities ?? {
        share_score: false,
        share_achievement: false,
        share_game: false,
        rooms: false,
        room_state_sync: false
      };
    }
    async ready(options = {}) {
      if (this.readyPromise) return this.readyPromise;
      const timeout = options.timeoutMs ?? this.requestTimeoutMs;
      this.readyPromise = this.send("handshake", {}, timeout).then((response) => {
        const data = response ?? {};
        this.handshakeData = {
          protocol_version: String(data.protocol_version ?? this.protocolVersion),
          capabilities: {
            share_score: Boolean(data.capabilities?.share_score),
            share_achievement: Boolean(data.capabilities?.share_achievement),
            share_game: Boolean(data.capabilities?.share_game),
            rooms: Boolean(data.capabilities?.rooms),
            room_state_sync: Boolean(data.capabilities?.room_state_sync)
          },
          context: data.context ?? {}
        };
        return this.handshakeData;
      });
      return this.readyPromise;
    }
    async command(action, payload) {
      await this.ready();
      return this.send(action, payload);
    }
    async init(payload = {}) {
      return this.command("init", payload);
    }
    async shareScore(score, payload = {}) {
      return this.command("shareScore", { ...payload, score });
    }
    async shareAchievement(payload = {}) {
      return this.command("shareAchievement", payload);
    }
    async shareGame(payload = {}) {
      return this.command("shareGame", payload);
    }
    async createRoom(payload = {}) {
      return this.command("createRoom", payload);
    }
    async joinRoom(roomId) {
      return this.command("joinRoom", { room_id: roomId });
    }
    async leaveRoom(roomId) {
      return this.command("leaveRoom", { room_id: roomId });
    }
    async subscribeRoom(roomId) {
      return this.command("subscribeRoom", { room_id: roomId });
    }
    async getRoomState(roomId) {
      return this.command("getRoomState", { room_id: roomId });
    }
    async sendState(roomId, state, stateVersion, idempotencyKey) {
      return this.command("sendState", {
        room_id: roomId,
        state,
        state_version: stateVersion,
        idempotency_key: idempotencyKey
      });
    }
    on(eventType, handler) {
      const key = eventType || "*";
      const current = this.listeners.get(key) ?? [];
      current.push(handler);
      this.listeners.set(key, current);
      return () => {
        const next = (this.listeners.get(key) ?? []).filter((item) => item !== handler);
        this.listeners.set(key, next);
      };
    }
    get commands() {
      return {
        init: (payload) => this.init(payload),
        shareScore: (payload) => this.command("shareScore", payload),
        shareAchievement: (payload) => this.command("shareAchievement", payload),
        shareGame: (payload) => this.command("shareGame", payload ?? {}),
        createRoom: (payload) => this.command("createRoom", payload ?? {}),
        joinRoom: (payload) => this.command("joinRoom", payload),
        leaveRoom: (payload) => this.command("leaveRoom", payload),
        subscribeRoom: (payload) => this.command("subscribeRoom", payload),
        getRoomState: (payload) => this.command("getRoomState", payload),
        sendState: (payload) => this.command("sendState", payload)
      };
    }
    async send(action, payload, timeoutMs) {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const envelope = createRequestEnvelope({
        requestId,
        action,
        payload,
        protocolVersion: this.protocolVersion
      });
      const waitMs = timeoutMs ?? this.requestTimeoutMs;
      const response = await new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          this.pending.delete(requestId);
          reject(new GoPortalSDKError(`SDK request timeout: ${action}`, { code: "ERR_TIMEOUT", retryable: true }));
        }, waitMs);
        this.pending.set(requestId, { resolve, reject, timeoutId });
        this.targetWindow.postMessage(envelope, this.targetOrigin);
      });
      return response;
    }
    onMessage(event) {
      if (this.targetOrigin !== "*" && event.origin !== this.targetOrigin) {
        return;
      }
      if (event.source !== this.targetWindow) {
        return;
      }
      const data = event.data;
      if (this.isSDKEvent(data)) {
        this.handleSDKEvent(data.payload);
        return;
      }
      if (!isResponseEnvelope(data)) return;
      const response = data;
      const ref = this.pending.get(response.request_id);
      if (!ref) return;
      this.pending.delete(response.request_id);
      window.clearTimeout(ref.timeoutId);
      if (response.ok) {
        ref.resolve(response.data);
        return;
      }
      ref.reject(
        new GoPortalSDKError(response.error ?? "SDK request failed", {
          code: response.error_code ?? "ERR_INTERNAL",
          retryable: Boolean(response.retryable),
          data: response.data
        })
      );
    }
    isSDKEvent(input) {
      if (!input || typeof input !== "object") return false;
      const raw = input;
      return raw.type === "GOPORTAL_GAME_EVENT" && typeof raw.payload === "object" && raw.payload !== null;
    }
    handleSDKEvent(payload) {
      const eventID = typeof payload.event_id === "string" ? payload.event_id.trim() : "";
      if (eventID && this.processedEventIDs.has(eventID)) {
        return;
      }
      if (eventID) {
        this.processedEventIDs.set(eventID, Date.now());
        if (this.processedEventIDs.size > 1e3) {
          const items = [...this.processedEventIDs.entries()].sort((a, b) => a[1] - b[1]);
          items.slice(0, 300).forEach(([id]) => this.processedEventIDs.delete(id));
        }
      }
      const roomId = typeof payload.room_id === "string" ? payload.room_id : "";
      const incomingVersion = Number(payload.state_version ?? 0);
      const currentVersion = roomId ? Number(this.roomVersions.get(roomId) ?? 0) : 0;
      if (roomId && incomingVersion > 0) {
        if (incomingVersion < currentVersion) return;
        this.roomVersions.set(roomId, incomingVersion);
      }
      const eventType = typeof payload.event_type === "string" ? payload.event_type : "game.room.event";
      const targets = [...this.listeners.get(eventType) ?? [], ...this.listeners.get("*") ?? []];
      targets.forEach((listener) => {
        try {
          listener(payload);
        } catch {
        }
      });
    }
  };

  // src/adapters/browser-global.ts
  var mountBrowserGlobalSDK = () => {
    const sdk = new GoPortalSDKClient();
    window.GoPortalGameSDK = sdk;
    return sdk;
  };

  // src/browser.ts
  mountBrowserGlobalSDK();
})();
