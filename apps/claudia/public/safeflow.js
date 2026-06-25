// ════════════════════════════════════════════════════════════════════════
//  SafeFlow · embeddable widget loader  (public/safeflow.js)
//
//  Any FlowBond site drops ClaudIA in with two lines:
//    <script src="https://claudiaflow.life/safeflow.js" defer></script>
//    <safeflow-chat app="moonchurch" height="560"></safeflow-chat>
//
//  The widget is an IFRAME to claudiaflow.life/embed — so the ZK crypto, keys,
//  and FBID session stay in ClaudIA's own origin, isolated from the host page.
//  No secrets are passed in; the host only declares which app + (optional) room.
// ════════════════════════════════════════════════════════════════════════
(function () {
  if (typeof window === 'undefined' || customElements.get('safeflow-chat')) return;

  var ORIGIN = 'https://claudiaflow.life';
  try { if (document.currentScript && document.currentScript.src) ORIGIN = new URL(document.currentScript.src).origin; } catch (e) { /* keep default */ }

  var SafeFlowChat = function () {
    return Reflect.construct(HTMLElement, [], SafeFlowChat);
  };
  SafeFlowChat.prototype = Object.create(HTMLElement.prototype);
  SafeFlowChat.prototype.constructor = SafeFlowChat;
  SafeFlowChat.prototype.connectedCallback = function () {
    var app = this.getAttribute('app') || 'flowme';
    var height = this.getAttribute('height') || '560';
    var room = this.getAttribute('room');
    var url = ORIGIN + '/embed?app=' + encodeURIComponent(app) + (room ? '&room=' + encodeURIComponent(room) : '');
    var f = document.createElement('iframe');
    f.src = url;
    f.title = 'SafeFlow · ClaudIA';
    f.setAttribute('allow', 'microphone; clipboard-write; publickey-credentials-get *');
    f.style.cssText = 'width:100%;height:' + height + 'px;border:0;border-radius:16px;background:#0E1A2B;box-shadow:0 20px 60px rgba(0,0,0,.35)';
    this.innerHTML = '';
    this.appendChild(f);
  };

  customElements.define('safeflow-chat', SafeFlowChat);
})();
