// Catch module or WebGL startup failures and return to the readable parent page.
try { await import('/cybertruck-explorer.js?v=20261026studio'); }
catch { const app=document.querySelector('[data-m3x]');app?.classList.add('m3x-failed');const status=document.querySelector('.m3x-status');if(status)status.textContent='3D is unavailable here. Return to the guide for images and system explanations.';if(parent!==window)parent.postMessage({type:'sd-cybertruck-failed'},location.origin); }
