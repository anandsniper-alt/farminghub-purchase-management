import test from 'node:test';
import assert from 'node:assert/strict';
import {togglePoBranches,releasePoBranches} from '../web/po-branch-disclosure.mjs';

function events(){
  const listeners=new Map();
  return {
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    emit(type){for(const fn of [...(listeners.get(type)||[])])fn();},
    count(type){return listeners.get(type)?.size||0;}
  };
}

// Only the browser surfaces used by the disclosure are faked. Animation completion
// stays explicit so interruption races do not depend on real time or a browser.
function fixture(t,{reduced=false,animate=true,observe=true}={}){
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const oldObserver=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
  const motion={...events(),matches:reduced};
  const win={...events(),matchMedia(query){assert.equal(query,'(prefers-reduced-motion: reduce)');return motion;}};
  const observers=[];
  class Observer{
    constructor(callback){this.callback=callback;this.targets=[];this.disconnected=false;observers.push(this);}
    observe(target){this.targets.push(target);}
    disconnect(){this.disconnected=true;}
  }
  Object.defineProperty(globalThis,'window',{configurable:true,value:win});
  Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:observe?Observer:undefined});
  t.after(()=>{
    releasePoBranches();
    if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else delete globalThis.window;
    if(oldObserver)Object.defineProperty(globalThis,'ResizeObserver',oldObserver);else delete globalThis.ResizeObserver;
  });
  const rail={...events(),rect:{left:100,right:600},getBoundingClientRect(){return this.rect;}};
  const mark={rect:{left:250,width:20},getBoundingClientRect(){return this.rect;}};
  const properties=new Map(),animations=[];
  const panel={hidden:true,inert:true,dataset:{},height:180,
    style:{setProperty(name,value){properties.set(name,value);}},
    getBoundingClientRect(){return {left:100,width:500,height:this.height};}
  };
  if(animate)panel.animate=(frames,options)=>{
    const animation={frames,options,onfinish:null,cancelled:false,cancel(){this.cancelled=true;panel.height=180;}};
    animations.push(animation);return animation;
  };
  const attrs=new Map([['aria-controls','branches'],['aria-expanded','false']]);
  const button={ownerDocument:{getElementById(id){assert.equal(id,'branches');return panel;}},
    getAttribute(name){return attrs.get(name);},setAttribute(name,value){attrs.set(name,value);},
    closest(selector){assert.equal(selector,'.po-cycle-rail');return rail;},
    querySelector(selector){assert.equal(selector,'.step-mark');return mark;}
  };
  const finish=()=>{const animation=animations.at(-1);assert.equal(typeof animation.onfinish,'function');animation.onfinish();};
  return {button,panel,rail,mark,properties,animations,motion,win,observers,finish};
}

function assertState(f,open,hidden=!open){
  assert.equal(f.button.getAttribute('aria-expanded'),String(open));
  assert.equal(f.panel.hidden,hidden);
  assert.equal(f.panel.inert,!open);
}

test('opening and closing settle to consistent visible and accessible states',t=>{
  const f=fixture(t);
  togglePoBranches(f.button);
  assertState(f,true,false);
  assert.deepEqual(f.animations[0].frames,[{height:'0px'},{height:'180px'}]);
  f.finish();
  assertState(f,true);
  assert.equal('moving' in f.panel.dataset,false);
  togglePoBranches(f.button);
  assertState(f,false,false); // Still painted while closing, already inaccessible.
  assert.deepEqual(f.animations[1].frames,[{height:'180px'},{height:'0px'}]);
  f.finish();
  assertState(f,false);
  assert.equal('moving' in f.panel.dataset,false);
});

test('reopening a closing panel starts at its visible height and ignores stale completion',t=>{
  const f=fixture(t);
  togglePoBranches(f.button);f.finish();
  togglePoBranches(f.button);
  const closing=f.animations.at(-1),staleFinish=closing.onfinish;
  f.panel.height=65; // The current painted height halfway through closing.
  togglePoBranches(f.button);
  assert.equal(closing.cancelled,true);
  assert.equal(f.animations.at(-1).frames[0].height,'65px');
  staleFinish();
  assertState(f,true,false);
  f.finish();
  assertState(f,true);
});

test('reduced motion and missing animation support settle immediately',t=>{
  const f=fixture(t,{reduced:true,observe:false});
  togglePoBranches(f.button);assertState(f,true);
  togglePoBranches(f.button);assertState(f,false);
  assert.equal(f.animations.length,0);
  f.motion.matches=false;
  delete f.panel.animate;
  togglePoBranches(f.button);assertState(f,true);
  togglePoBranches(f.button);assertState(f,false);
});

test('enabling reduced motion settles an in-flight close and cancels its completion',t=>{
  const f=fixture(t);
  togglePoBranches(f.button);f.finish();togglePoBranches(f.button);
  const closing=f.animations.at(-1),staleFinish=closing.onfinish;
  f.motion.matches=true;f.motion.emit('change');
  assertState(f,false);
  assert.equal(closing.cancelled,true);
  assert.equal(closing.onfinish,null);
  staleFinish();assertState(f,false);
});

test('branch origin follows the split marker on scroll and resize, clamped to the panel',t=>{
  const f=fixture(t,{reduced:true});
  togglePoBranches(f.button);
  assert.equal(f.properties.get('--branch-origin'),'160px');
  assert.equal(f.panel.dataset.originVisible,'true');
  f.mark.rect.left=40;f.rail.emit('scroll');
  assert.equal(f.properties.get('--branch-origin'),'0px');
  assert.equal(f.panel.dataset.originVisible,'false');
  f.mark.rect.left=800;f.win.emit('resize');
  assert.equal(f.properties.get('--branch-origin'),'500px');
  f.mark.rect.left=300;f.observers[0].callback();
  assert.equal(f.properties.get('--branch-origin'),'210px');
  assert.equal(f.panel.dataset.originVisible,'true');
});

test('release settles pending animation and removes route-specific listeners',t=>{
  const f=fixture(t);
  togglePoBranches(f.button);f.finish();togglePoBranches(f.button);
  const closing=f.animations.at(-1),staleFinish=closing.onfinish;
  assert.equal(f.rail.count('scroll'),1);
  assert.equal(f.win.count('resize'),1);
  assert.equal(f.motion.count('change'),1);
  releasePoBranches();
  assertState(f,false);
  assert.equal(closing.cancelled,true);
  assert.equal(f.rail.count('scroll'),0);
  assert.equal(f.win.count('resize'),0);
  assert.equal(f.motion.count('change'),0);
  assert.equal(f.observers[0].disconnected,true);
  staleFinish();assertState(f,false);
  releasePoBranches(); // Cleanup remains safe after the route has already left.
});
