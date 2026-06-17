"use strict";(()=>{(()=>{let O=document.currentScript;if(!O)return;let _=re(O.getAttribute("data-website-id")||"");if(!_)return;let J=O.src,P=J.substring(0,J.lastIndexOf("/"));P.includes("/widget")&&(P=P.replace("/widget",""));let z=null,c=null,ee=te(),T=!1,x=!1;function te(){let e=localStorage.getItem("widget_session_id");return e||(e="ws_"+Math.random().toString(36).substring(2,15)+Date.now().toString(36),localStorage.setItem("widget_session_id",e)),e}function S(e){return P+"/api/widget"+e}async function ne(){try{let e=await fetch(S("/"+_+"/config"));if(!e.ok)return;z=await e.json()}catch{}}async function E(e){try{let a=await fetch(S("/init"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({websiteId:_,sessionId:ee,pageUrl:e})});return a.ok?(c=(await a.json()).conversationId,c):null}catch{return null}}async function L(e){if(!c)return null;try{let a=await fetch(S("/message"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId:c,content:e})});if(!a.ok)return null;let t=await a.json();return{...t.message,error:t.error,escalated:t.escalated}}catch{return null}}async function oe(e){if(!c)return[];try{let a=S("/messages/"+c),t=await fetch(a);return t.ok?(await t.json()).messages:[]}catch{return[]}}async function B(e,a){if(!c)return!1;try{return(await fetch(S("/handoff"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId:c,email:e,message:a})})).ok}catch{return!1}}async function se(){if(!c)return!1;try{let e=await fetch(S("/typing/"+c));return e.ok?(await e.json()).isTyping:!1}catch{return!1}}function ie(e){let a=document.createElement("div");a.id="opensaas-widget",a.style.all="initial";let t=a.attachShadow({mode:"closed"}),l=window.matchMedia("(prefers-color-scheme: dark)").matches,y=l?"#1f2937":"#ffffff",N=l?"#f3f4f6":"#111827",v=l?"#9ca3af":"#6b7280",k=l?"#374151":"#e5e7eb",W=l?"#374151":"#f9fafb",C=U(e.widgetColor),D=l?"#374151":"#f3f4f6",ce=l?"#f3f4f6":"#111827",F=e.widgetPosition==="left"?"left":"right",m=!1,h=[],Z=!1,H=null,q=null,K=document.createElement("style");K.textContent=`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .ow-btn {
        position: fixed;
        bottom: 24px;
        ${F}: 24px;
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
        ${F}: 24px;
        z-index: 2147483647;
        width: 380px;
        max-width: calc(100vw - 48px);
        height: 600px;
        max-height: calc(100vh - 140px);
        background: ${y};
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        display: none;
        flex-direction: column;
        border: 1px solid ${k};
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: ${N};
      }
      .ow-popup.open { display: flex; }
      .ow-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid ${k};
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
        color: ${v};
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ow-close:hover { background: ${k}; }
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
        background: ${C};
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .ow-message.ai {
        align-self: flex-start;
        background: ${D};
        color: ${ce};
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
        background: ${D};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
      }
      .ow-typing span {
        width: 8px;
        height: 8px;
        border-radius: 4px;
        background: ${v};
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
        background: ${D};
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        font-size: 13px;
        color: ${v};
      }
      .ow-typing-agent-text { margin-right: 2px; }
      .ow-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 3px;
        background: ${v};
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
        border-top: 1px solid ${k};
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .ow-input {
        flex: 1;
        border: 1px solid ${k};
        border-radius: 24px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
        background: ${W};
        color: ${N};
        font-family: inherit;
        resize: none;
        max-height: 120px;
        line-height: 1.4;
      }
      .ow-input::placeholder { color: ${v}; }
      .ow-input:focus { border-color: ${C}; }
      .ow-send {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        border: none;
        background: ${C};
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
        color: ${v};
        font-size: 14px;
      }
      .ow-handoff { padding: 8px 0; align-self: flex-start; width: 100%; }
      .ow-handoff-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
      .ow-handoff-btn {
        background: ${C}; color: #fff; border: none; border-radius: 20px;
        padding: 8px 16px; font-size: 13px; cursor: pointer; transition: opacity 0.2s;
        white-space: nowrap;
      }
      .ow-handoff-btn:hover { opacity: 0.85; }
      .ow-handoff-btn:disabled { opacity: 0.5; cursor: default; }
      .ow-handoff-email-form { display: flex; gap: 8px; margin-top: 8px; }
      .ow-handoff-email-input {
        flex: 1; padding: 8px 12px; border: 1px solid ${k}; border-radius: 16px;
        font-size: 13px; outline: none; background: ${W}; color: ${N};
      }
      .ow-handoff-email-input:focus { border-color: ${C}; }
      .ow-footer {
        text-align: center; padding: 6px 16px; font-size: 11px;
        color: ${v}; border-top: 1px solid ${k};
      }
      @media (max-width: 480px) {
        .ow-popup {
          bottom: 0;
          ${F}: 0;
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;function V(o){return o.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function A(){let o=t.querySelector(".ow-messages");o&&(o.scrollTop=o.scrollHeight)}function u(o,n,i,r){let f=t.querySelector(".ow-messages"),d=i?ae(i):null,p=d?f.querySelector(`[data-msg-id="${d}"]`):null;if(p){p.textContent=o;let g=p.querySelector(".ow-time");g&&(g.textContent=V(new Date)),p.className="ow-message "+n+(r==="error"?" ow-error":"");let R=h.findIndex(I=>I.id===i);R>=0&&(h[R]={id:i,content:o,role:n,status:r||"completed"}),A();return}let b=document.createElement("div");b.className="ow-message "+n+(r==="error"?" ow-error":""),d&&b.setAttribute("data-msg-id",d),b.textContent=o,r==="streaming"&&b.classList.add("ow-streaming");let $=document.createElement("div");$.className="ow-time",$.textContent=V(new Date),b.appendChild($),f.appendChild(b),i&&!h.some(g=>g.id===i)&&h.push({id:i,content:o,role:n,status:r||"completed"}),A()}function w(o){let n=t.querySelector(".ow-messages"),i=t.querySelector(".ow-typing");if(i&&i.remove(),o){Z=!0;let r=document.createElement("div");r.className="ow-typing",r.innerHTML="<span></span><span></span><span></span>",n.appendChild(r),A()}else Z=!1}function G(o){let n=t.querySelector(".ow-messages"),i=t.querySelector(".ow-typing-agent");if(i&&i.remove(),o){let r=document.createElement("div");r.className="ow-typing-agent",r.innerHTML='<span class="ow-typing-agent-text">Agent is typing...</span><span class="ow-typing-dot"></span><span class="ow-typing-dot"></span><span class="ow-typing-dot"></span>',n.appendChild(r),A()}}function ue(){let o=t.querySelector(".ow-messages");if(t.querySelector(".ow-handoff"))return;let n=document.createElement("div");n.className="ow-handoff",n.innerHTML=`
        <div class="ow-handoff-buttons">
          <button class="ow-handoff-human ow-handoff-btn">Chat with human</button>
          <button class="ow-handoff-email-btn ow-handoff-btn">Leave your email</button>
        </div>
        <div class="ow-handoff-email-form" style="display:none">
          <input type="email" class="ow-handoff-email-input" placeholder="your@email.com" />
          <button class="ow-handoff-submit ow-handoff-btn">Send</button>
        </div>
      `,o.appendChild(n),A(),n.querySelector(".ow-handoff-human").addEventListener("click",async()=>{let i=n.querySelector(".ow-handoff-human");i.textContent="Connecting...",i.setAttribute("disabled","true"),await B(),i.textContent="\u2713 Connected",setTimeout(()=>Q(),2e3)}),n.querySelector(".ow-handoff-email-btn").addEventListener("click",()=>{let i=n.querySelector(".ow-handoff-email-form"),r=n.querySelector(".ow-handoff-email-btn");i.style.display="flex",r.style.display="none"}),n.querySelector(".ow-handoff-submit").addEventListener("click",async()=>{let i=n.querySelector(".ow-handoff-email-input"),r=i.value.trim();if(!r)return;let f=n.querySelector(".ow-handoff-submit");f.textContent="Sending...",f.setAttribute("disabled","true"),await B(r),f.textContent="\u2713 Sent",i.value="",setTimeout(()=>Q(),2e3)})}function Q(){let o=t.querySelector(".ow-handoff");o&&o.remove()}function he(){return h.length===0?null:h[h.length-1].id||null}async function X(){let o=t.querySelector(".ow-input"),n=o.value.trim();if(!n)return;if(o.value="",o.style.height="auto",["talk to human","human agent","talk to agent","speak to human","real person","escalate","get help"].some(p=>n.toLowerCase().includes(p))){u(n,"user"),w(!0);let p=await B(void 0,n);w(!1),u(p?"I've connected you with our support team. A human agent will get back to you shortly. If you'd like us to follow up by email, please share your email address below.":"I'm sorry, I couldn't connect you with a human agent. Please try again or email us directly.","ai");return}let f=n.match(/[\w.-]+@[\w.-]+\.\w+/);if(f&&h.some(p=>p.content.includes("share your email"))){u(n,"user"),w(!0),await B(f[0],n),w(!1),u("Thank you! We've saved your email and a support agent will contact you shortly.","ai");return}u(n,"user"),w(!0);let d=await L(n);d&&(w(!1),H=d.id,u(d.content,"ai",d.id),d.escalated&&setTimeout(()=>ue(),500))}function fe(){t.innerHTML="",t.appendChild(K);let o=document.createElement("button");o.className="ow-btn",o.style.background=U(e.widgetColor),o.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',t.appendChild(o);let n=document.createElement("div");n.className="ow-popup";let i=e.widgetAvatarUrl?`<img src="${M(e.widgetAvatarUrl)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`:`<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:${M(U(e.widgetColor))}">\u{1F916}</div>`;n.innerHTML=`
        <div class="ow-header">
          <div class="ow-avatar">${i}</div>
          <div class="ow-header-info">
            <div class="ow-header-name">${M(e.widgetTitle||e.agentName)}</div>
            <div class="ow-header-status">\u25CF Online</div>
          </div>
          <button class="ow-close" aria-label="Close">\u2715</button>
        </div>
        <div class="ow-messages">
          <div class="ow-welcome">${M(e.welcomeMessage)}</div>
        </div>
        ${e.hideBranding?"":`<div class="ow-footer">${e.companyName?M(e.companyName):"Powered by AI Agent"}</div>`}
        <div class="ow-input-area">
          <textarea class="ow-input" placeholder="Type your message..." rows="1"></textarea>
          <button class="ow-send" disabled aria-label="Send">\u27A4</button>
        </div>
      `,t.appendChild(n);let r=t.querySelector(".ow-close"),f=t.querySelector(".ow-send"),d=t.querySelector(".ow-input"),p=t.querySelector(".ow-messages");o.addEventListener("click",async()=>{m=!m,n.classList.toggle("open",m),m&&c&&!T&&(T=!0,$()),m&&!c&&(await E(window.location.href),e.welcomeMessage&&u(e.welcomeMessage,"ai"),T||(T=!0,$())),m||(T=!1),m&&setTimeout(()=>d.focus(),300)}),r.addEventListener("click",()=>{m=!1,n.classList.remove("open")});function b(){f.disabled=!d.value.trim()}d.addEventListener("input",()=>{b(),d.style.height="auto",d.style.height=Math.min(d.scrollHeight,120)+"px"}),d.addEventListener("keydown",g=>{g.key==="Enter"&&!g.shiftKey&&(g.preventDefault(),X())}),f.addEventListener("click",X);function $(){let g=!0;(async function(){for(;g&&m&&c&&(await new Promise(I=>setTimeout(I,2e3)),!(!g||!m));)try{let I=await oe(H),j=!1;for(let s of I){if(s.role==="user")continue;let Y=h.find(pe=>pe.id===s.id);if(Y){(Y.content!==s.content||Y.status!==s.status)&&(u(s.content,"ai",s.id,s.status),s.status==="streaming"&&(j=!0,q=s.id),s.status==="completed"&&q===s.id&&(q=null));continue}s.status==="streaming"?(j=!0,q=s.id,w(!1),u(s.content,"ai",s.id,"streaming"),H=s.id):s.status==="completed"?(w(!1),u(s.content,"ai",s.id),H=s.id):s.status==="error"&&(w(!1),u(s.content,"ai",s.id,"error"),H=s.id)}if(!j&&q===null&&w(!1),j)G(!1);else{let s=await se();G(s)}}catch{}T=!1})()}}fe(),x&&c&&setTimeout(()=>{let o=t.querySelector(".ow-btn");o&&o.click()},500)}function M(e){let a=document.createElement("div");return a.textContent=e,a.innerHTML}function U(e){return/^#[0-9A-Fa-f]{6}$/.test(e)||/^#[0-9A-Fa-f]{3}$/.test(e)?e:"#6366f1"}function ae(e){return e.replace(/[^a-zA-Z0-9_-]/g,"")}function re(e){return e.replace(/[^a-zA-Z0-9-]/g,"")}let le=[],me=null,we=null;function de(){let e=z?.triggers;if(!e||e.length===0)return;let a=window.location.href;for(let t of e)switch(t.type){case"time_on_page":{let l=t.config?.seconds||15,y=setTimeout(async()=>{x||(x=!0,await E(a),await L(t.message))},l*1e3);le.push(y);break}case"scroll_depth":{let l=t.config?.percentage||50,y=async()=>{if(x)return;(window.scrollY+window.innerHeight)/document.documentElement.scrollHeight*100>=l&&(x=!0,window.removeEventListener("scroll",y),await E(a),await L(t.message))};window.addEventListener("scroll",y,{passive:!0});break}case"exit_intent":{let l=async y=>{x||y.clientY>10||(x=!0,document.removeEventListener("mouseleave",l),await E(a),await L(t.message))};document.addEventListener("mouseleave",l);break}case"page_visit":{let l=t.config?.urlPattern||"";l&&a.includes(l)&&(x=!0,E(a),L(t.message));break}}}(async()=>(await ne(),z&&(ie(z),de())))()})();})();
