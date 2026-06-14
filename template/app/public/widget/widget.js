"use strict";(()=>{(()=>{let C=document.currentScript;if(!C)return;let E=C.getAttribute("data-website-id");if(!E)return;let q=C.src,S=q.substring(0,q.lastIndexOf("/"));S.includes("/widget")&&(S=S.replace("/widget",""));let L=null,p=null,Y=K(),T=!1;function K(){let e=localStorage.getItem("widget_session_id");return e||(e="ws_"+Math.random().toString(36).substring(2,15)+Date.now().toString(36),localStorage.setItem("widget_session_id",e)),e}function $(e){return S+"/api/widget"+e}async function R(){try{let e=await fetch($("/"+E+"/config"));if(!e.ok)return;L=await e.json()}catch{}}async function V(e){try{let a=await fetch($("/init"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({websiteId:E,sessionId:Y,pageUrl:e})});return a.ok?(p=(await a.json()).conversationId,p):null}catch{return null}}async function W(e){if(!p)return null;try{let a=await fetch($("/message"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId:p,content:e})});return a.ok?(await a.json()).message:null}catch{return null}}async function G(e){if(!p)return[];try{let a=$("/messages/"+p),s=await fetch(a);return s.ok?(await s.json()).messages:[]}catch{return[]}}function Q(e){let a=document.createElement("div");a.id="opensaas-widget",a.style.all="initial";let s=a.attachShadow({mode:"closed"}),g=window.matchMedia("(prefers-color-scheme: dark)").matches,X=g?"#1f2937":"#ffffff",P=g?"#f3f4f6":"#111827",M=g?"#9ca3af":"#6b7280",h=g?"#374151":"#e5e7eb",Z=g?"#374151":"#f9fafb",H=e.widgetColor,U=g?"#374151":"#f3f4f6",ee=g?"#f3f4f6":"#111827",B=e.widgetPosition==="left"?"left":"right",d=!1,u=[],O=!1,b=null,y=null,D=document.createElement("style");D.textContent=`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .ow-btn {
        position: fixed;
        bottom: 24px;
        ${B}: 24px;
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
        ${B}: 24px;
        z-index: 2147483647;
        width: 380px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 140px);
        background: ${X};
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        display: none;
        flex-direction: column;
        border: 1px solid ${h};
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: ${P};
      }
      .ow-popup.open { display: flex; }
      .ow-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid ${h};
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
        color: ${M};
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ow-close:hover { background: ${h}; }
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
        background: ${H};
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .ow-message.ai {
        align-self: flex-start;
        background: ${U};
        color: ${ee};
        border-bottom-left-radius: 4px;
      }
      .ow-message.ai.ow-streaming::after {
        content: "\u258A";
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
        background: ${U};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
      }
      .ow-typing span {
        width: 8px;
        height: 8px;
        border-radius: 4px;
        background: ${M};
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
        border-top: 1px solid ${h};
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .ow-input {
        flex: 1;
        border: 1px solid ${h};
        border-radius: 24px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
        background: ${Z};
        color: ${P};
        font-family: inherit;
        resize: none;
        max-height: 120px;
        line-height: 1.4;
      }
      .ow-input::placeholder { color: ${M}; }
      .ow-input:focus { border-color: ${H}; }
      .ow-send {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        border: none;
        background: ${H};
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
        color: ${M};
        font-size: 14px;
      }
      @media (max-width: 480px) {
        .ow-popup {
          bottom: 0;
          ${B}: 0;
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;function _(n){return n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function j(){let n=s.querySelector(".ow-messages");n&&(n.scrollTop=n.scrollHeight)}function f(n,o,i,l){let v=s.querySelector(".ow-messages"),r=i?v.querySelector(`[data-msg-id="${i}"]`):null;if(r){r.textContent=n;let x=r.querySelector(".ow-time");x&&(x.textContent=_(new Date)),r.className="ow-message "+o+(l==="error"?" ow-error":"");let c=u.findIndex(J=>J.id===i);c>=0&&(u[c]={id:i,content:n,role:o,status:l||"completed"}),j();return}let m=document.createElement("div");m.className="ow-message "+o+(l==="error"?" ow-error":""),i&&m.setAttribute("data-msg-id",i),m.textContent=n,l==="streaming"&&m.classList.add("ow-streaming");let k=document.createElement("div");k.className="ow-time",k.textContent=_(new Date),m.appendChild(k),v.appendChild(m),i&&!u.some(x=>x.id===i)&&u.push({id:i,content:n,role:o,status:l||"completed"}),j()}function w(n){let o=s.querySelector(".ow-messages"),i=s.querySelector(".ow-typing");if(i&&i.remove(),n){O=!0;let l=document.createElement("div");l.className="ow-typing",l.innerHTML="<span></span><span></span><span></span>",o.appendChild(l),j()}else O=!1}function se(){return u.length===0?null:u[u.length-1].id||null}async function F(){let n=s.querySelector(".ow-input"),o=n.value.trim();if(!o)return;n.value="",n.style.height="auto",f(o,"user"),w(!0);let i=await W(o);i&&(w(!1),b=i.id,f(i.content,"ai",i.id))}function te(){s.innerHTML="",s.appendChild(D);let n=document.createElement("button");n.className="ow-btn",n.style.background=e.widgetColor,n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',s.appendChild(n);let o=document.createElement("div");o.className="ow-popup";let i=e.widgetAvatarUrl?`<img src="${I(e.widgetAvatarUrl)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`:`<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:${e.widgetColor}">\u{1F916}</div>`;o.innerHTML=`
        <div class="ow-header">
          <div class="ow-avatar">${i}</div>
          <div class="ow-header-info">
            <div class="ow-header-name">${I(e.widgetTitle||e.agentName)}</div>
            <div class="ow-header-status">\u25CF Online</div>
          </div>
          <button class="ow-close" aria-label="Close">\u2715</button>
        </div>
        <div class="ow-messages">
          <div class="ow-welcome">${I(e.welcomeMessage)}</div>
        </div>
        <div class="ow-input-area">
          <textarea class="ow-input" placeholder="Type your message..." rows="1"></textarea>
          <button class="ow-send" disabled aria-label="Send">\u27A4</button>
        </div>
      `,s.appendChild(o);let l=s.querySelector(".ow-close"),v=s.querySelector(".ow-send"),r=s.querySelector(".ow-input"),m=s.querySelector(".ow-messages");n.addEventListener("click",async()=>{d=!d,o.classList.toggle("open",d),d&&!p&&(await V(window.location.href),e.welcomeMessage&&f(e.welcomeMessage,"ai"),T||(T=!0,x())),d||(T=!1),d&&setTimeout(()=>r.focus(),300)}),l.addEventListener("click",()=>{d=!1,o.classList.remove("open")});function k(){v.disabled=!r.value.trim()}r.addEventListener("input",()=>{k(),r.style.height="auto",r.style.height=Math.min(r.scrollHeight,120)+"px"}),r.addEventListener("keydown",c=>{c.key==="Enter"&&!c.shiftKey&&(c.preventDefault(),F())}),v.addEventListener("click",F);function x(){let c=!0;(async function(){for(;c&&d&&p&&(await new Promise(z=>setTimeout(z,2e3)),!(!c||!d));)try{let z=await G(b),A=!1;for(let t of z){if(t.role==="user")continue;let N=u.find(ne=>ne.id===t.id);if(N){(N.content!==t.content||N.status!==t.status)&&(f(t.content,"ai",t.id,t.status),t.status==="streaming"&&(A=!0,y=t.id),t.status==="completed"&&y===t.id&&(y=null));continue}t.status==="streaming"?(A=!0,y=t.id,w(!1),f(t.content,"ai",t.id,"streaming"),b=t.id):t.status==="completed"?(w(!1),f(t.content,"ai",t.id),b=t.id):t.status==="error"&&(w(!1),f(t.content,"ai",t.id,"error"),b=t.id)}!A&&y===null&&w(!1)}catch{}T=!1})()}}te()}function I(e){let a=document.createElement("div");return a.textContent=e,a.innerHTML}(async()=>(await R(),L&&Q(L)))()})();})();
