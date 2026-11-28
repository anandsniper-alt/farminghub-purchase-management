import {configureDevelopmentRequests, mountDevelopmentRequests} from './development-requests.mjs';

const app = document.getElementById('app');
const register = document.querySelector('[data-development-requests]');
const modalRoot = document.getElementById('modal-root');
const moduleDialogs = document.querySelectorAll('dialog#modal, dialog#part-visual');
const registerPath = '/development-requests.html';
let session = null;
let checking = false;
let mountedUser = null;
let retryTimer;

function screenContext() {
  if (register) return {screen:'Development requests', route:registerPath};
  return {route:location.href, dialog:modalRoot?.querySelector('[data-concern-screen]')?.dataset.concernScreen};
}

function button(container, floating = false) {
  if (!container || container.querySelector(':scope > [data-development-request-open]')) return;
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'button primary concern-entry' + (floating ? ' concern-launcher' : '');
  control.dataset.developmentRequestOpen = '';
  control.textContent = 'Log development';
  if (floating) container.append(control);
  else container.prepend(control);
}

function hasWorkspace() {
  return register || app?.querySelector('.topbar, main.closing-content');
}

function placeControls() {
  if (!session || !hasWorkspace()) return;
  button(document.body, true);
  button(modalRoot?.querySelector('.modal-head'));
  for (const dialog of moduleDialogs) {
    if (dialog.open) button(dialog.querySelector('.dialog-head'));
  }
  const menu = app?.querySelector('.sidebar-bottom');
  if (menu && !menu.querySelector('[data-concern-register]')) {
    const link = document.createElement('a');
    link.href = registerPath;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'nav-item';
    link.dataset.concernRegister = '';
    link.textContent = 'Development requests';
    menu.prepend(link);
  }
}

function forgetSession() {
  session = null;
  mountedUser = null;
  configureDevelopmentRequests(null);
  document.querySelectorAll('.concern-entry,[data-concern-register]').forEach(el => el.remove());
  if (register) register.replaceChildren();
}

async function syncSession(refresh = false) {
  if (!hasWorkspace()) {
    if (session) forgetSession();
    return;
  }
  if (checking || (session && !refresh)) { placeControls(); return; }
  checking = true;
  try {
    const response = await fetch('/api/session', {cache:'no-store', credentials:'same-origin'});
    if (response.status === 401) {
      forgetSession();
      if (register) document.getElementById('concern-sign-in').hidden = false;
      return;
    }
    if (!response.ok) throw Error('Session unavailable');
    const fresh = await response.json();
    if (!hasWorkspace()) return;
    if (session && (fresh.user.id !== session.user.id || fresh.user.role !== session.user.role)) forgetSession();
    session = fresh;
    configureDevelopmentRequests({user:fresh.user, csrf:fresh.csrf, getContext:screenContext});
    placeControls();
    if (register) {
      document.getElementById('concern-sign-in').hidden = true;
      if (mountedUser !== fresh.user.id) {
        mountedUser = fresh.user.id;
        await mountDevelopmentRequests(register);
      }
    }
  } catch {
    if (register && !mountedUser) register.textContent = 'Could not load development requests. Reload to try again.';
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => syncSession(true), 10000);
  } finally {
    checking = false;
  }
}

// Shells replace their root children when the user signs in, navigates, or opens a form.
const observer = new MutationObserver(() => syncSession());
if (app) observer.observe(app, {childList:true});
if (modalRoot) observer.observe(modalRoot, {childList:true});
for (const dialog of moduleDialogs) observer.observe(dialog, {childList:true, attributes:true, attributeFilter:['open']});
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncSession(true); });
window.addEventListener('pageshow', event => { if (event.persisted) syncSession(true); });
syncSession();
