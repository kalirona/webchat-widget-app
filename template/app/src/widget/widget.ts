(() => {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  if (!scriptTag) return;

  const websiteId = scriptTag.getAttribute("data-website-id");
  if (!websiteId) return;

  const src = scriptTag.src;
  const baseUrl = src.substring(0, src.lastIndexOf("/"));

  let apiBase = baseUrl;
  if (apiBase.includes("/widget")) {
    apiBase = apiBase.replace("/widget", "");
  }

  let config: {
    widgetColor: string;
    widgetPosition: string;
    widgetTitle: string;
    widgetAvatarUrl: string | null;
    welcomeMessage: string;
    agentName: string;
  } | null = null;
  let conversationId: string | null = null;
  let sessionId = getSessionId();
  let polling = false;

  function getSessionId(): string {
    let sid = localStorage.getItem("widget_session_id");
    if (!sid) {
      sid = "ws_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("widget_session_id", sid);
    }
    return sid;
  }

  function getApiUrl(path: string): string {
    return apiBase + "/api/widget" + path;
  }

  async function fetchConfig(): Promise<void> {
    try {
      const res = await fetch(getApiUrl("/" + websiteId + "/config"));
      if (!res.ok) return;
      config = await res.json();
    } catch {}
  }

  async function initConversation(pageUrl: string): Promise<string | null> {
    try {
      const res = await fetch(getApiUrl("/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, sessionId, pageUrl }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      conversationId = data.conversationId;
      return conversationId;
    } catch {
      return null;
    }
  }

  async function sendMessage(content: string): Promise<{ id: string; content: string; createdAt: string } | null> {
    if (!conversationId) return null;
    try {
      const res = await fetch(getApiUrl("/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.message;
    } catch {
      return null;
    }
  }

  async function pollMessages(since: string | null): Promise<Array<{ id: string; content: string; role: string; status: string; createdAt: string }>> {
    if (!conversationId) return [];
    try {
      const url = getApiUrl("/messages/" + conversationId);
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages;
    } catch {
      return [];
    }
  }

  function buildWidget(config: NonNullable<typeof config>) {
    const container = document.createElement("div");
    container.id = "opensaas-widget";
    container.style.all = "initial";

    const shadow = container.attachShadow({ mode: "closed" });

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const bg = isDark ? "#1f2937" : "#ffffff";
    const text = isDark ? "#f3f4f6" : "#111827";
    const subtext = isDark ? "#9ca3af" : "#6b7280";
    const border = isDark ? "#374151" : "#e5e7eb";
    const inputBg = isDark ? "#374151" : "#f9fafb";
    const userBubble = config.widgetColor;
    const aiBubble = isDark ? "#374151" : "#f3f4f6";
    const aiText = isDark ? "#f3f4f6" : "#111827";
    const position = config.widgetPosition === "left" ? "left" : "right";

    let isOpen = false;
    let currentMessages: Array<{ id: string; content: string; role: string; status: string }> = [];
    let typing = false;
    let lastMessageId: string | null = null;
    let streamingMessageId: string | null = null;

    const styles = document.createElement("style");
    styles.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .ow-btn {
        position: fixed;
        bottom: 24px;
        ${position}: 24px;
        z-index: 2147483646;
        width: 60px;
        height: 60px;
        border-radius: 30px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s, box-shadow 0.2s;
        color: #fff;
      }
      .ow-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
      .ow-btn svg { width: 28px; height: 28px; }
      .ow-popup {
        position: fixed;
        bottom: 100px;
        ${position}: 24px;
        z-index: 2147483647;
        width: 380px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 140px);
        background: ${bg};
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        display: none;
        flex-direction: column;
        border: 1px solid ${border};
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: ${text};
      }
      .ow-popup.open { display: flex; }
      .ow-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid ${border};
      }
      .ow-avatar {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }
      .ow-header-info { flex: 1; min-width: 0; }
      .ow-header-name { font-weight: 600; font-size: 15px; }
      .ow-header-status { font-size: 12px; color: #22c55e; }
      .ow-close {
        background: none;
        border: none;
        cursor: pointer;
        color: ${subtext};
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ow-close:hover { background: ${border}; }
      .ow-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        scroll-behavior: smooth;
      }
      .ow-message {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
        animation: owFadeIn 0.2s ease;
      }
      .ow-message.user {
        align-self: flex-end;
        background: ${userBubble};
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .ow-message.ai {
        align-self: flex-start;
        background: ${aiBubble};
        color: ${aiText};
        border-bottom-left-radius: 4px;
      }
      .ow-message.ai.ow-streaming::after {
        content: "▊";
        animation: owBlink 0.8s infinite;
        opacity: 0.6;
      }
      .ow-message.ow-error {
        border: 1px solid #ef4444 !important;
        opacity: 0.8;
      }
      @keyframes owBlink {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
      }
      .ow-message .ow-time {
        font-size: 10px;
        opacity: 0.6;
        margin-top: 4px;
      }
      .ow-message.user .ow-time { text-align: right; }
      .ow-typing {
        align-self: flex-start;
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: ${aiBubble};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
      }
      .ow-typing span {
        width: 8px;
        height: 8px;
        border-radius: 4px;
        background: ${subtext};
        animation: owBounce 1.4s infinite ease-in-out;
      }
      .ow-typing span:nth-child(2) { animation-delay: 0.2s; }
      .ow-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes owBounce {
        0%, 80%, 100% { transform: scale(0.6); }
        40% { transform: scale(1); }
      }
      @keyframes owFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ow-input-area {
        padding: 12px 16px;
        border-top: 1px solid ${border};
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .ow-input {
        flex: 1;
        border: 1px solid ${border};
        border-radius: 24px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
        background: ${inputBg};
        color: ${text};
        font-family: inherit;
        resize: none;
        max-height: 120px;
        line-height: 1.4;
      }
      .ow-input::placeholder { color: ${subtext}; }
      .ow-input:focus { border-color: ${userBubble}; }
      .ow-send {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        border: none;
        background: ${userBubble};
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.2s;
      }
      .ow-send:disabled { opacity: 0.4; cursor: not-allowed; }
      .ow-send svg { width: 18px; height: 18px; }
      .ow-welcome {
        text-align: center;
        padding: 24px 16px;
        color: ${subtext};
        font-size: 14px;
      }
      @media (max-width: 480px) {
        .ow-popup {
          bottom: 0;
          ${position}: 0;
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;

    function formatTime(date: Date): string {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function scrollToBottom() {
      const msgs = shadow.querySelector(".ow-messages");
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    function addMessage(content: string, role: string, id?: string, status?: string) {
      const msgs = shadow.querySelector(".ow-messages")!;
      const existingEl = id ? msgs.querySelector(`[data-msg-id="${id}"]`) : null;
      if (existingEl) {
        existingEl.textContent = content;
        const time = existingEl.querySelector(".ow-time");
        if (time) time.textContent = formatTime(new Date());
        existingEl.className = "ow-message " + role + (status === "error" ? " ow-error" : "");
        const idx = currentMessages.findIndex((m) => m.id === id);
        if (idx >= 0) currentMessages[idx] = { id, content, role, status: status || "completed" };
        scrollToBottom();
        return;
      }
      const div = document.createElement("div");
      div.className = "ow-message " + role + (status === "error" ? " ow-error" : "");
      if (id) div.setAttribute("data-msg-id", id);
      div.textContent = content;
      if (status === "streaming") {
        div.classList.add("ow-streaming");
      }
      const time = document.createElement("div");
      time.className = "ow-time";
      time.textContent = formatTime(new Date());
      div.appendChild(time);
      msgs.appendChild(div);
      if (id && !currentMessages.some((m) => m.id === id)) {
        currentMessages.push({ id, content, role, status: status || "completed" });
      }
      scrollToBottom();
    }

    function showTyping(show: boolean) {
      const msgs = shadow.querySelector(".ow-messages")!;
      const existing = shadow.querySelector(".ow-typing");
      if (existing) existing.remove();
      if (show) {
        typing = true;
        const div = document.createElement("div");
        div.className = "ow-typing";
        div.innerHTML = "<span></span><span></span><span></span>";
        msgs.appendChild(div);
        scrollToBottom();
      } else {
        typing = false;
      }
    }

    function getLastMessageId(): string | null {
      if (currentMessages.length === 0) return null;
      return currentMessages[currentMessages.length - 1].id || null;
    }

    async function handleSend() {
      const input = shadow.querySelector(".ow-input") as HTMLTextAreaElement;
      const content = input.value.trim();
      if (!content) return;
      input.value = "";
      input.style.height = "auto";

      addMessage(content, "user");
      showTyping(true);

      const result = await sendMessage(content);
      if (result) {
        showTyping(false);
        lastMessageId = result.id;
        addMessage(result.content, "ai", result.id);
      }
    }

    function initUI() {
      shadow.innerHTML = "";
      shadow.appendChild(styles);

      const btn = document.createElement("button");
      btn.className = "ow-btn";
      btn.style.background = config.widgetColor;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
      shadow.appendChild(btn);

      const popup = document.createElement("div");
      popup.className = "ow-popup";
      const avatarHtml = config.widgetAvatarUrl
          ? `<img src="${escHtml(config.widgetAvatarUrl)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
          : `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:${config.widgetColor}">🤖</div>`;
      
      popup.innerHTML = `
        <div class="ow-header">
          <div class="ow-avatar">${avatarHtml}</div>
          <div class="ow-header-info">
            <div class="ow-header-name">${escHtml(config.widgetTitle || config.agentName)}</div>
            <div class="ow-header-status">● Online</div>
          </div>
          <button class="ow-close" aria-label="Close">✕</button>
        </div>
        <div class="ow-messages">
          <div class="ow-welcome">${escHtml(config.welcomeMessage)}</div>
        </div>
        <div class="ow-input-area">
          <textarea class="ow-input" placeholder="Type your message..." rows="1"></textarea>
          <button class="ow-send" disabled aria-label="Send">➤</button>
        </div>
      `;
      shadow.appendChild(popup);

      const closeBtn = shadow.querySelector(".ow-close") as HTMLElement;
      const sendBtn = shadow.querySelector(".ow-send") as HTMLElement;
      const input = shadow.querySelector(".ow-input") as HTMLTextAreaElement;
      const msgs = shadow.querySelector(".ow-messages")!;

      btn.addEventListener("click", async () => {
        isOpen = !isOpen;
        popup.classList.toggle("open", isOpen);
        if (isOpen && !conversationId) {
          await initConversation(window.location.href);
          if (config.welcomeMessage) {
            addMessage(config.welcomeMessage, "ai");
          }
          if (!polling) {
            polling = true;
            startPolling();
          }
        }
        if (!isOpen) polling = false;
        if (isOpen) setTimeout(() => input.focus(), 300);
      });

      closeBtn.addEventListener("click", () => {
        isOpen = false;
        popup.classList.remove("open");
      });

      function updateSendBtn() {
        sendBtn.disabled = !input.value.trim();
      }

      input.addEventListener("input", () => {
        updateSendBtn();
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });

      sendBtn.addEventListener("click", handleSend);

      function startPolling() {
        let active = true;
        (async function poll() {
          while (active && isOpen && conversationId) {
            await new Promise((r) => setTimeout(r, 2000));
            if (!active || !isOpen) break;
            try {
              const msgs = await pollMessages(lastMessageId);
              let hasStreaming = false;
              for (const msg of msgs) {
                if (msg.role === "user") continue;
                const existing = currentMessages.find((m) => m.id === msg.id);
                if (existing) {
                  if (existing.content !== msg.content || existing.status !== msg.status) {
                    addMessage(msg.content, "ai", msg.id, msg.status);
                    if (msg.status === "streaming") {
                      hasStreaming = true;
                      streamingMessageId = msg.id;
                    }
                    if (msg.status === "completed" && streamingMessageId === msg.id) {
                      streamingMessageId = null;
                    }
                  }
                  continue;
                }
                if (msg.status === "streaming") {
                  hasStreaming = true;
                  streamingMessageId = msg.id;
                  showTyping(false);
                  addMessage(msg.content, "ai", msg.id, "streaming");
                  lastMessageId = msg.id;
                } else if (msg.status === "completed") {
                  showTyping(false);
                  addMessage(msg.content, "ai", msg.id);
                  lastMessageId = msg.id;
                } else if (msg.status === "error") {
                  showTyping(false);
                  addMessage(msg.content, "ai", msg.id, "error");
                  lastMessageId = msg.id;
                }
              }
              if (!hasStreaming && streamingMessageId === null) {
                showTyping(false);
              }
            } catch {}
          }
          polling = false;
        })();
      }
    }

    initUI();
  }

  function escHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  (async () => {
    await fetchConfig();
    if (config) {
      buildWidget(config);
    }
  })();
})();
