// The purchase order page has one invoice split. Release its listeners when the page is replaced.
let active = null;

export function releasePoBranches(){
  if(!active)return;
  active.stop();
  active=null;
}

function connect(button,panel){
  const rail=button.closest('.po-cycle-rail');
  const mark=button.querySelector('.step-mark');
  const lead=panel.previousElementSibling;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let animation=null;

  function align(){
    if(panel.hidden)return;
    const box=panel.getBoundingClientRect(), track=rail.getBoundingClientRect(), point=mark.getBoundingClientRect();
    const x=point.left+point.width/2;
    panel.style.setProperty('--branch-origin',Math.max(0,Math.min(box.width,x-box.left))+'px');
    const visible=x>=track.left && x<=track.right;
    panel.dataset.originVisible=String(visible);
    // Route beside the label so the connector starts on the marker without striking through its text.
    if(lead?.classList.contains('po-branch-lead')){
      const svg=lead.firstElementChild;
      const origin=x-box.left, drop=Math.max(1,box.top-point.bottom+4);
      const side=origin+42<box.width?1:-1;
      const start=origin+side*9, lane=origin+side*48;
      svg.style.height=drop+'px';
      svg.style.visibility=visible?'visible':'hidden';
      svg.firstElementChild.setAttribute('d',`M ${start} 0 Q ${lane} 0 ${lane} 12 V ${Math.max(12,drop-10)} Q ${lane} ${drop} ${origin} ${drop}`);
    }
  }
  function stopAnimation(){
    if(!animation)return;
    animation.onfinish=null;
    animation.cancel();
    animation=null;
  }
  function settle(){
    stopAnimation();
    panel.hidden=button.getAttribute('aria-expanded')!=='true';
    panel.inert=panel.hidden;
    delete panel.dataset.moving;
  }
  function motionChanged(){if(motion.matches)settle();}
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(align):null;
  resize?.observe(rail);
  resize?.observe(mark);
  rail.addEventListener('scroll',align,{passive:true});
  window.addEventListener('resize',align);
  motion.addEventListener('change',motionChanged);
  return {
    button,
    toggle(){
      const open=button.getAttribute('aria-expanded')!=='true';
      const height=panel.hidden?0:panel.getBoundingClientRect().height;
      stopAnimation();
      button.setAttribute('aria-expanded',String(open));
      panel.hidden=false;
      panel.inert=!open;
      align();
      const target=open?panel.getBoundingClientRect().height:0;
      if(motion.matches||!panel.animate||Math.abs(height-target)<1){settle();return;}
      panel.dataset.moving='';
      const transition=panel.animate([{height:height+'px'},{height:target+'px'}],
        {duration:open?220:160,easing:open?'cubic-bezier(.2,.7,.2,1)':'ease-in-out',fill:'both'});
      animation=transition;
      transition.onfinish=()=>{if(animation===transition)settle();};
    },
    stop(){
      settle();
      resize?.disconnect();
      rail.removeEventListener('scroll',align);
      window.removeEventListener('resize',align);
      motion.removeEventListener('change',motionChanged);
    }
  };
}

export function togglePoBranches(button){
  const panel=button.ownerDocument.getElementById(button.getAttribute('aria-controls'));
  if(!panel)return;
  if(active?.button!==button){
    releasePoBranches();
    active=connect(button,panel);
  }
  active.toggle();
}
