// Patch an open PO form rather than replacing its controls on every selection.
// Model-derived markup remains authoritative; only interaction state is retained.
const key = node => {
 if (node.nodeType !== 1) return '';
 if (node.id) return 'id:' + node.id;
 if (node.hasAttribute('name')) return 'name:' + node.getAttribute('name') + (['checkbox','radio'].includes(node.type) ? ':' + node.value : '');
 if (node.hasAttribute('data-cost-centre-row')) return 'allocation:' + node.dataset.costCentreRow;
 if (node.hasAttribute('data-cost-centre-matrix')) return 'allocation-matrix';
 if (node.matches('.field, label.checkbox')) {
  const control = node.querySelector('input[name],select[name],textarea[name]');
  if (control) return 'field:' + key(control);
 }
 if (node.tagName === 'OPTION') return 'option:' + node.value;
 return '';
};
const compatible = (a,b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || a.tagName === b.tagName) && key(a) === key(b);

function patchChildren(current,next,active) {
 let cursor = current.firstChild;
 for (const fresh of [...next.childNodes]) {
  let match = cursor;
  if (!match || !compatible(match,fresh)) {
   match = [...current.childNodes].slice(cursor ? [...current.childNodes].indexOf(cursor) : current.childNodes.length).find(n => compatible(n,fresh));
  }
  if (!match) {
   current.insertBefore(fresh.cloneNode(true),cursor);
  } else {
   if (match !== cursor) current.insertBefore(match,cursor);
   patchNode(match,fresh,active);
   cursor = match.nextSibling;
  }
 }
 while (cursor) { const next = cursor.nextSibling; cursor.remove(); cursor = next; }
}

function patchNode(current,next,active) {
 if (current.nodeType !== 1) {
  if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
  return;
 }
 const tag = current.tagName, open = current.open, value = current.value;
 // While typing a quantity, keep an empty field or trailing decimal until blur.
 const typingNumber = current === active && current.type === 'number' && Number(value) === Number(next.value);
 const desiredValue = typingNumber ? value : next.value;
 for (const attribute of [...current.attributes]) {
  if (!next.hasAttribute(attribute.name) && !(tag === 'DETAILS' && attribute.name === 'open')) current.removeAttribute(attribute.name);
 }
 for (const attribute of next.attributes) {
  if (tag === 'DETAILS' && attribute.name === 'open') continue;
  if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name,attribute.value);
 }
 if (tag === 'INPUT') {
  if (current.type !== 'file' && current.value !== desiredValue) current.value = desiredValue;
  current.checked = next.checked;
 } else if (tag === 'TEXTAREA') {
  if (current.value !== desiredValue) current.value = desiredValue;
 } else {
  patchChildren(current,next,active);
  if (tag === 'SELECT' && current.value !== desiredValue) current.value = desiredValue;
  if (tag === 'DETAILS') current.open = open;
 }
}

function retainInteraction(root,update) {
 const doc = root.ownerDocument, active = doc.activeElement;
 const selection = active && typeof active.selectionStart === 'number' ? [active.selectionStart,active.selectionEnd,active.selectionDirection] : null;
 const scrolls = [root,...root.querySelectorAll('*')].filter(el => el.scrollTop || el.scrollLeft).map(el => [el,el.scrollTop,el.scrollLeft]);
 update(active);
 if (active?.isConnected && root.contains(active)) {
  if (doc.activeElement !== active) active.focus({preventScroll:true});
  if (selection) active.setSelectionRange(...selection);
 }
 for (const [el,top,left] of scrolls) if (el.isConnected) { el.scrollTop = top; el.scrollLeft = left; }
}

export function updatePoForm(root,html) {
 const next = root.ownerDocument.createElement('template'); next.innerHTML = html;
 retainInteraction(root,active => patchChildren(root,next.content,active));
}

export function updatePoAllocation(target,html) {
 const next = target.ownerDocument.createElement('template'); next.innerHTML = html;
 const fresh = next.content.firstElementChild;
 const root = target.closest('.modal-body') || target.parentElement;
 retainInteraction(root,active => {
  if (compatible(target,fresh)) patchNode(target,fresh,active);
  else target.replaceWith(fresh);
 });
}
