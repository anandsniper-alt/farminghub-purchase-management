/** Small orthographic 3D renderer. No remote scripts, continuous animation or WebGL requirement. */
export function mountContainerScene(canvas,onSelect){
 let result=null,yaw=-0.68,pitch=0.55,zoom=1,limit=Infinity,selected='',drag=null,polygons=[];
 const palette=['#54875c','#c7a15b','#648aa0','#a6786d','#8086b0','#75a69a','#ae9270','#969b53'];
 const rotate=([x,y,z])=>{const a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw);return [a,b*Math.sin(pitch)-y*Math.cos(pitch),b*Math.cos(pitch)+y*Math.sin(pitch)];};
 function draw(options={}){
  const target=options.target||canvas,ctx=target.getContext('2d');
  if(!ctx||!result)return;const rect=options.size||canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),dpr=options.target?1:Math.min(2,devicePixelRatio||1);target.width=w*dpr;target.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);ctx.fillStyle='#f4f6f0';ctx.fillRect(0,0,w,h);
  const c=result.container,raw=([x,y,z])=>rotate([x-c.length/2,y-c.height/2,z-c.width/2]),corners=[[0,0,0],[c.length,0,0],[c.length,0,c.width],[0,0,c.width],[0,c.height,0],[c.length,c.height,0],[c.length,c.height,c.width],[0,c.height,c.width]],rot=corners.map(raw),xs=rot.map(v=>v[0]),ys=rot.map(v=>v[1]),scale=Math.min((w-60)/(Math.max(...xs)-Math.min(...xs)),(h-74)/(Math.max(...ys)-Math.min(...ys)))*zoom;
  const project=p=>{const v=raw(p);return [w/2+v[0]*scale,h/2+v[1]*scale,v[2]];};
  const polygon=(points,fill,stroke='#fff',lineWidth=1)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();};
  polygon(corners.slice(0,4).map(project),'#e0e7db','#899884');
  for(let x=0;x<=c.length;x+=1000){const a=project([x,0,0]),b=project([x,0,c.width]);ctx.beginPath();ctx.moveTo(...a.slice(0,2));ctx.lineTo(...b.slice(0,2));ctx.strokeStyle='#c3cebd';ctx.lineWidth=1;ctx.stroke();}
  const faces=[];polygons=[];
  for(const b of result.boxes.slice(0,limit)){const x=b.x,y=b.y,z=b.z,l=b.length,ht=b.height,wd=b.width,pts=[[x,y,z],[x+l,y,z],[x+l,y,z+wd],[x,y,z+wd],[x,y+ht,z],[x+l,y+ht,z],[x+l,y+ht,z+wd],[x,y+ht,z+wd]].map(project);
   for(const [indices,shade] of [[[0,1,5,4],0.76],[[1,2,6,5],0.88],[[2,3,7,6],0.8],[[3,0,4,7],0.7],[[4,5,6,7],1]]){const points=indices.map(i=>pts[i]);faces.push({b,points,depth:points.reduce((n,p)=>n+p[2],0)/4,shade});}
  }
  faces.sort((a,b)=>a.depth-b.depth);
  for(const f of faces){const color=palette[f.b.index%palette.length],rgb=color.match(/\w\w/g).map(v=>Math.round(parseInt(v,16)*f.shade));polygon(f.points,'rgb('+rgb.join(',')+')',f.b.rowId===selected?'#173d24':'#ffffffb8',f.b.rowId===selected?1.8:.55);polygons.push(f);}
  const pc=corners.map(project);ctx.setLineDash([5,4]);for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]){ctx.beginPath();ctx.moveTo(...pc[a].slice(0,2));ctx.lineTo(...pc[b].slice(0,2));ctx.strokeStyle='#567153';ctx.lineWidth=1;ctx.stroke();}ctx.setLineDash([]);
  const door=project([c.length,0,c.width/2]),nose=project([0,0,c.width/2]);ctx.font='600 12px system-ui';ctx.fillStyle='#234429';ctx.textAlign='center';ctx.fillText('DOORS',door[0],door[1]+22);ctx.fillText('FRONT',nose[0],nose[1]+22);
 }
 const inside=(x,y,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;};
 const down=e=>{drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);};
 const move=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved=drag.moved||Math.abs(dx)+Math.abs(dy)>2;yaw+=dx*.008;pitch=Math.max(.12,Math.min(1.5,pitch+dy*.006));drag.x=e.clientX;drag.y=e.clientY;draw();};
 const up=e=>{if(drag&&!drag.moved){const rect=canvas.getBoundingClientRect(),face=[...polygons].reverse().find(f=>inside(e.clientX-rect.left,e.clientY-rect.top,f.points));if(face){selected=face.b.rowId;onSelect(face.b);draw();}}drag=null;};
 const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch=Math.min(1.5,pitch+.12);if(e.key==='ArrowDown')pitch=Math.max(.12,pitch-.12);if(e.key==='+')zoom=Math.min(2,zoom+.1);if(e.key==='-')zoom=Math.max(.5,zoom-.1);if(e.key==='Home'){yaw=-.68;pitch=.55;zoom=1;}draw();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('keydown',key);
 const observer=new ResizeObserver(draw);observer.observe(canvas);
 function snapshot(){
  if(!result)throw Error('Calculate the layout before downloading.');
  const saved={yaw,pitch,zoom,limit,selected,polygons};
  try{yaw=-.68;pitch=.55;zoom=1;limit=Infinity;selected='';const target=document.createElement('canvas');draw({target,size:{width:1600,height:680}});return target.toDataURL('image/jpeg',.95);}
  finally{({yaw,pitch,zoom,limit,selected,polygons}=saved);}
 }
 return {snapshot,clear:()=>{if(result){result={...result,boxes:[]};draw();}},set:r=>{result=r;draw();},select:id=>{selected=id;draw();},limit:n=>{limit=n;draw();},view:v=>{if(v==='top'){yaw=0;pitch=Math.PI/2;}else if(v==='side'){yaw=0;pitch=0;}else if(v==='door'){yaw=Math.PI/2;pitch=0;}else{yaw=-.68;pitch=.55;}zoom=1;draw();},zoom:n=>{zoom=Math.max(.5,Math.min(2,zoom+n));draw();},destroy:()=>{observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('keydown',key);result=null;polygons=[];}};
}
