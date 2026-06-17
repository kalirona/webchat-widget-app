(() => {
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  if (!scriptTag) return;

  const websiteId = sanitizeWebsiteId(scriptTag.getAttribute("data-website-id") || "");
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
    triggers?: Array<{
      type: string;
      config: Record<string, unknown>;
      message: string;
    }>;
    hideBranding?: boolean;
    companyName?: string;
  } | null = null;
  let conversationId: string | null = null;
  let sessionId = getSessionId();
  let polling = false;
  let triggerFired = false;

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

  async function sendMessage(content: string): Promise<{ id: string; content: string; createdAt: string; error?: string; escalated?: boolean } | null> {
    if (!conversationId) return null;
    try {
      const res = await fetch(getApiUrl("/message"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return { ...data.message, error: data.error, escalated: data.escalated };
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

  async function requestHumanHandoff(email?: string, message?: string): Promise<boolean> {
    if (!conversationId) return false;
    try {
      const res = await fetch(getApiUrl("/handoff"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, email, message }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function pollAgentTyping(): Promise<boolean> {
    if (!conversationId) return false;
    try {
      const res = await fetch(getApiUrl("/typing/" + conversationId));
      if (!res.ok) return false;
      const data = await res.json();
      return data.isTyping;
    } catch {
      return false;
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
    const userBubble = sanitizeColor(config.widgetColor);
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
      .ow-typing-agent {
        align-self: flex-start;
        display: flex;
        gap: 3px;
        align-items: center;
        padding: 10px 14px;
        background: ${aiBubble};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        font-size: 13px;
        color: ${subtext};
      }
      .ow-typing-agent-text { margin-right: 2px; }
      .ow-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 3px;
        background: ${subtext};
        animation: owBounce 1.4s infinite ease-in-out;
      }
      .ow-typing-dot:nth-child(3) { animation-delay: 0.2s; }
      .ow-typing-dot:nth-child(4) { animation-delay: 0.4s; }
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
      .ow-handoff { padding: 8px 0; align-self: flex-start; width: 100%; }
      .ow-handoff-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
      .ow-handoff-btn {
        background: ${userBubble}; color: #fff; border: none; border-radius: 20px;
        padding: 8px 16px; font-size: 13px; cursor: pointer; transition: opacity 0.2s;
        white-space: nowrap;
      }
      .ow-handoff-btn:hover { opacity: 0.85; }
      .ow-handoff-btn:disabled { opacity: 0.5; cursor: default; }
      .ow-handoff-email-form { display: flex; gap: 8px; margin-top: 8px; }
      .ow-handoff-email-input {
        flex: 1; padding: 8px 12px; border: 1px solid ${border}; border-radius: 16px;
        font-size: 13px; outline: none; background: ${inputBg}; color: ${text};
      }
      .ow-handoff-email-input:focus { border-color: ${userBubble}; }
      .ow-footer {
        text-align: center; padding: 6px 16px; font-size: 11px;
        color: ${subtext}; border-top: 1px solid ${border};
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
      const safeId = id ? escapeCssSelector(id) : null;
      const existingEl = safeId ? msgs.querySelector(`[data-msg-id="${safeId}"]`) : null;
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
      if (safeId) div.setAttribute("data-msg-id", safeId);
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

    function showAgentTyping(show: boolean) {
      const msgs = shadow.querySelector(".ow-messages")!;
      const existing = shadow.querySelector(".ow-typing-agent");
      if (existing) existing.remove();
      if (show) {
        const div = document.createElement("div");
        div.className = "ow-typing-agent";
        div.innerHTML = '<span class="ow-typing-agent-text">Agent is typing...</span><span class="ow-typing-dot"></span><span class="ow-typing-dot"></span><span class="ow-typing-dot"></span>';
        msgs.appendChild(div);
        scrollToBottom();
      }
    }

    function showHandoffOptions() {
      const msgs = shadow.querySelector(".ow-messages")!;
      if (shadow.querySelector(".ow-handoff")) return;
      const div = document.createElement("div");
      div.className = "ow-handoff";
      div.innerHTML = `
        <div class="ow-handoff-buttons">
          <button class="ow-handoff-human ow-handoff-btn">Chat with human</button>
          <button class="ow-handoff-email-btn ow-handoff-btn">Leave your email</button>
        </div>
        <div class="ow-handoff-email-form" style="display:none">
          <input type="email" class="ow-handoff-email-input" placeholder="your@email.com" />
          <button class="ow-handoff-submit ow-handoff-btn">Send</button>
        </div>
      `;
      msgs.appendChild(div);
      scrollToBottom();

      div.querySelector(".ow-handoff-human")!.addEventListener("click", async () => {
        const btn = div.querySelector(".ow-handoff-human") as HTMLElement;
        btn.textContent = "Connecting...";
        btn.setAttribute("disabled", "true");
        await requestHumanHandoff();
        btn.textContent = "✓ Connected";
        setTimeout(() => hideHandoffOptions(), 2000);
      });

      div.querySelector(".ow-handoff-email-btn")!.addEventListener("click", () => {
        const form = div.querySelector(".ow-handoff-email-form") as HTMLElement;
        const btn = div.querySelector(".ow-handoff-email-btn") as HTMLElement;
        form.style.display = "flex";
        btn.style.display = "none";
      });

      div.querySelector(".ow-handoff-submit")!.addEventListener("click", async () => {
        const input = div.querySelector(".ow-handoff-email-input") as HTMLInputElement;
        const email = input.value.trim();
        if (!email) return;
        const submitBtn = div.querySelector(".ow-handoff-submit") as HTMLElement;
        submitBtn.textContent = "Sending...";
        submitBtn.setAttribute("disabled", "true");
        await requestHumanHandoff(email);
        submitBtn.textContent = "✓ Sent";
        input.value = "";
        setTimeout(() => hideHandoffOptions(), 2000);
      });
    }

    function hideHandoffOptions() {
      const existing = shadow.querySelector(".ow-handoff");
      if (existing) existing.remove();
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

      // Detect human handoff requests
      const handoffPhrases = ["talk to human", "human agent", "talk to agent", "speak to human", "real person", "escalate", "get help"];
      const isHandoffRequest = handoffPhrases.some(p => content.toLowerCase().includes(p));

      if (isHandoffRequest) {
        addMessage(content, "user");
        showTyping(true);
        const success = await requestHumanHandoff(undefined, content);
        showTyping(false);
        if (success) {
          addMessage("I've connected you with our support team. A human agent will get back to you shortly. If you'd like us to follow up by email, please share your email address below.", "ai");
        } else {
          addMessage("I'm sorry, I couldn't connect you with a human agent. Please try again or email us directly.", "ai");
        }
        return;
      }

      // Detect email sharing for handoff
      const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && currentMessages.some(m => m.content.includes("share your email"))) {
        addMessage(content, "user");
        showTyping(true);
        await requestHumanHandoff(emailMatch[0], content);
        showTyping(false);
        addMessage("Thank you! We've saved your email and a support agent will contact you shortly.", "ai");
        return;
      }

      addMessage(content, "user");
      showTyping(true);

      const result = await sendMessage(content);
      if (result) {
        showTyping(false);
        lastMessageId = result.id;
        addMessage(result.content, "ai", result.id);
        if (result.escalated) {
          setTimeout(() => showHandoffOptions(), 500);
        }
      }
    }

    function initUI() {
      shadow.innerHTML = "";
      shadow.appendChild(styles);

      const btn = document.createElement("button");
      btn.className = "ow-btn";
      btn.style.background = sanitizeColor(config.widgetColor);
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
      shadow.appendChild(btn);

      const popup = document.createElement("div");
      popup.className = "ow-popup";
      const avatarHtml = config.widgetAvatarUrl
          ? `<img src="${escHtml(config.widgetAvatarUrl)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
          : `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:${escHtml(sanitizeColor(config.widgetColor))}">🤖</div>`;
      
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
        ${config.hideBranding ? "" : `<div class="ow-footer">${config.companyName ? escHtml(config.companyName) : "Powered by AI Agent"}</div>`}
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
        if (isOpen && conversationId && !polling) {
          polling = true;
          startPolling();
        }
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
              // Poll agent typing indicator
              if (!hasStreaming) {
                const agentTyping = await pollAgentTyping();
                showAgentTyping(agentTyping);
              } else {
                showAgentTyping(false);
              }
            } catch {}
          }
          polling = false;
        })();
      }
    }

    initUI();

    if (triggerFired && conversationId) {
      setTimeout(() => {
        const b = shadow.querySelector(".ow-btn") as HTMLElement;
        if (b) b.click();
      }, 500);
    }
  }

  function escHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function sanitizeColor(color: string): string {
    // Only allow valid hex colors
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color;
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) return color;
    // Default fallback
    return "#6366f1";
  }

  function escapeCssSelector(str: string): string {
    // Escape characters that could break CSS selectors or enable injection
    return str.replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function sanitizeWebsiteId(id: string): string {
    // Only allow UUIDs (alphanumeric + hyphens)
    return id.replace(/[^a-zA-Z0-9-]/g, "");
  }

  // --- Proactive Triggers ---
  let triggerTimers: Array<ReturnType<typeof setTimeout>> = [];
  let pendingTriggerMessage: string | null = null;
  let pendingTriggerPageUrl: string | null = null;

  function setupTriggers() {
    const triggers = config?.triggers;
    if (!triggers || triggers.length === 0) return;

    const pageUrl = window.location.href;

    for (const trigger of triggers) {
      switch (trigger.type) {
        case "time_on_page": {
          const seconds = (trigger.config?.seconds as number) || 15;
          const timer = setTimeout(async () => {
            if (triggerFired) return;
            triggerFired = true;
            await initConversation(pageUrl);
            await sendMessage(trigger.message);
          }, seconds * 1000);
          triggerTimers.push(timer);
          break;
        }
        case "scroll_depth": {
          const percentage = (trigger.config?.percentage as number) || 50;
          const handler = async () => {
            if (triggerFired) return;
            const scrollPct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
            if (scrollPct >= percentage) {
              triggerFired = true;
              window.removeEventListener("scroll", handler);
              await initConversation(pageUrl);
              await sendMessage(trigger.message);
            }
          };
          window.addEventListener("scroll", handler, { passive: true });
          break;
        }
        case "exit_intent": {
          const handler = async (e: MouseEvent) => {
            if (triggerFired || e.clientY > 10) return;
            triggerFired = true;
            document.removeEventListener("mouseleave", handler);
            await initConversation(pageUrl);
            await sendMessage(trigger.message);
          };
          document.addEventListener("mouseleave", handler);
          break;
        }
        case "page_visit": {
          const urlPattern = (trigger.config?.urlPattern as string) || "";
          if (urlPattern && pageUrl.includes(urlPattern)) {
            triggerFired = true;
            initConversation(pageUrl);
            sendMessage(trigger.message);
          }
          break;
        }
      }
    }
  }

  (async () => {
    await fetchConfig();
    if (config) {
      buildWidget(config);
      setupTriggers();
    }
  })();
})();
