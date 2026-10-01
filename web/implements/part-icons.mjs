// Reference drawings identify a part family; they do not assert interchangeability.
import {partPhotos} from './part-photos.mjs';
const photosByKey=new Map(partPhotos.map(photo=>[photo.key,photo]));
function photographFor(n){
 // Specific types precede broad words: a gasket or drain plug is not a gear/bolt.
 let key;
 if(/GASKET/.test(n)){
  if(/IDLER/.test(n))key='idler-gasket';
  else if(/STUB/.test(n))key='stub-gasket';
  else if(/RD HOUSING/.test(n))key='rd-gasket';
  else if(/OUTPUT/.test(n))key='output-gasket';
  else if(/GEAR\s*BOX/.test(n))key='gearbox-gasket';
  else key='gear-gasket';
 }
 else if(/DOWTY/.test(n))key='dowty';
 else if(/DRAIN BOLT|LEVEL BOLT/.test(n))key='drain-plug';
 else if(/SLEEVE|\bSLV\b/.test(n))key='sleeve';
 else if(/SPACER|BUSH|OIL CUP|SHIELD|SIDE COVER ADAPTER/.test(n))return null;
 else if(/OIL SEAL/.test(n))key='oil-seal';
 else if(/O.?RING|\bOR \d/.test(n))key='o-ring';
 else if(/BEARING\s*-?\s*(302|320)/.test(n))key='taper-bearing';
 else if(/BEARING/.test(n))key='ball-bearing';
 else if(/SPRING WASHER/.test(n))key='spring-washer';
 else if(/WASHER|SHIM/.test(n))key='plain-washer';
 else if(/CASTLE.*NUT/.test(n))key='castle-nut';
 else if(/SUNLOCK|NYLO[CK]+/.test(n)&&/NUT/.test(n))key='lock-nut';
 else if(/\bNUT\b/.test(n))key='hex-nut';
 else if(/\bHHB\b/.test(n))key='hex-bolt';
 else if(/\bHHS\b/.test(n))key='hex-screw';
 else if(/INTERNAL CIRCLIP/.test(n))key='internal-circlip';
 else if(/EXTERNAL CIRCLIP/.test(n))key='external-circlip';
 else if(/SPLIT PIN|CUTTER PIN|COTTER PIN/.test(n))key='split-pin';
 else if(/LINCH PIN.*SQUARE|SQUARE.*LINCH PIN/.test(n))key='square-linch-pin';
 else if(/LINCH PIN/.test(n))key='linch-pin';
 else if(/HITCH PIN/.test(n))key='hitch-pin';
 else if(/DAMPER.*ASSEMBLY/.test(n))key='damper';
 else if(/PIPE CLAMP/.test(n))key='pipe-clamp';
 else if(/GEAR\s*BOX/.test(n)&&/MULTI/.test(n))key='multi-gearbox';
 else if(/GEAR\s*BOX/.test(n)&&/SINGLE|S\/\s*SPEED/.test(n))key='single-gearbox';
 else if(/GEAR\s*BOX/.test(n)&&!/SPARE|COVER|SHAFT|GEARBOX BACK/.test(n))key='single-gearbox';
 else if(/GEAR\s*COVER/.test(n))key='gear-cover';
 else if(/DUST COVER/.test(n))key=/\bLH\b|SMALL/.test(n)?'dust-small':'dust-large';
 else if(/\bGEAR\s*(20|21|23|28|30|35|36)\s*[- ]?TEETH\b/.test(n))key=`gear-${n.match(/\bGEAR\s*(20|21|23|28|30|35|36)\s*[- ]?TEETH\b/)[1]}`;
 else if(/STAR CAP|END COVER/.test(n))key='end-cover';
 else if(/RD HOUSING/.test(n))key='rd-housing';
 else if(/STUB HOUSING/.test(n))key='stub-housing';
 else if(/RD AXLE/.test(n))key='rd-axle';
 else if(/STUB AX[EL]/.test(n))key='stub-axle';
 else if(/IDLER AXLE/.test(n))key='idler-axle';
 else if(/BREATHER/.test(n))key=/LEVEL/.test(n)?'breather-level':'breather';
 else if(/PTO/.test(n))key='pto';
 else if(/ROTARY HOES|BLADE/.test(n))key=/C TYPE|C-TYPE/.test(n)&&!/L AND C/.test(n)?'blade-c':'blade-l';
 else if(/DEPTH SKID.*BOTTOM/.test(n))key='skid-bottom';
 else if(/DEPTH SKID/.test(n))key='depth-skid';
 else if(/NAMASTE PATTA/.test(n))key='namaste-patta';
 else if(/CLEVIS.*BACK/.test(n))key='clevis-back';
 else if(/CLEVIS/.test(n))key='clevis-plate';
 else if(/SIDE PLATE/.test(n))key='side-plate';
 else if(/HULL FRAME/.test(n))key='hull';
 else if(/TRAILING BOARD/.test(n))key='trailing-board';
 else if(/TOP MASTER/.test(n))key='top-mast';
 return photosByKey.get(key)||null;
}
const catalogue={gear:{page:11,position:10,label:'Spur gear'},bearing:{page:11,position:13,label:'Bearing'},housing:{page:11,position:15,label:'Housing'},'rd-axle':{page:11,position:17,label:'Rotor drive axle'},gearbox:{page:19,position:1,label:'Multispeed gearbox assembly'},'end-cover':{page:13,position:8,label:'Stub housing end cover'},'stub-axle':{page:13,position:16,label:'Stub axle'}};
const drawings={
 bolt:'<path d="M12 12l12-6 12 7-1 13-13 6-12-7z" fill="#dce5d6"/><path d="M12 12l11 7 13-6M23 19l-1 13M28 29l24 15-1 10-9 4-24-16"/><path d="M27 34l-6 7m12-3-6 7m12-3-6 7m12-3-6 7m12-3-6 7"/>',
 nut:'<path d="M12 18l20-10 20 10v25L32 55 12 43z" fill="#dce5d6"/><path d="M12 18l20 12 20-12M32 30v25"/><ellipse cx="32" cy="19" rx="10" ry="5"/>',
 castle:'<path d="M12 27v-8l8-5v8l8 4v-9l8-1v10l8-4v-8l8 5v23L32 55 12 43z" fill="#dce5d6"/><path d="M12 29l20 12 20-12M32 41v14"/><path d="M26 33a9 5 0 0 1 16-2"/>',
 washer:'<ellipse cx="32" cy="31" rx="23" ry="14" fill="#dce5d6"/><ellipse cx="32" cy="31" rx="12" ry="7"/><path d="M9 31v6c0 18 46 18 46 0v-6"/>',
 springwasher:'<path d="M36 19C6 7-3 46 29 50c20 3 33-15 21-25L38 33c5 7-11 12-18 4-5-7 6-16 17-10z" fill="#dce5d6"/><path d="M36 19l1 8M38 33l-2 7M50 25l1 8"/>',
 circlip:'<path d="M24 11C3 18 6 50 30 54c25 3 33-31 11-43l-4 9c15 8 8 26-5 25-15-1-18-18-5-25z" fill="#dce5d6"/><circle cx="24" cy="16" r="2"/><circle cx="41" cy="16" r="2"/>',
 ring:'<ellipse cx="32" cy="32" rx="23" ry="18"/><ellipse cx="32" cy="32" rx="18" ry="13"/>',
 seal:'<ellipse cx="32" cy="27" rx="22" ry="15" fill="#dce5d6"/><ellipse cx="32" cy="27" rx="13" ry="9"/><path d="M10 27v11c0 19 44 19 44 0V27M19 27v8m26-8v8"/>',
 gasket:'<path d="M15 11l31 2 9 12-4 27-30 4-13-12z"/><path d="M24 21l16 1 6 8-3 15-18 2-8-9z"/><circle cx="18" cy="18" r="2"/><circle cx="46" cy="22" r="2"/><circle cx="46" cy="46" r="2"/><circle cx="17" cy="44" r="2"/>',
 pin:'<path d="M13 17l6-8 11 4-1 12L16 50l-7 4 1-10z" fill="#dce5d6"/><path d="M17 20l9 5M14 43l6 4M28 19c20-14 27 9 11 14-10 3-19-6-11-14z"/>',
 splitpin:'<path d="M25 17c-9-10 7-17 10-5 1 4-4 8-7 12L11 53l6 3 17-31 10 26 7-3-15-30"/>',
 clamp:'<path d="M9 43h12V30c0-19 22-19 22 0v13h12v10H40V31c0-14-16-14-16 0v22H9z" fill="#dce5d6"/><circle cx="15" cy="48" r="2"/><circle cx="49" cy="48" r="2"/>',
 damper:'<path d="M12 50L52 10M16 48l-5-9 16 2-5-13 16 3-4-14 15 4-4-10"/><circle cx="9" cy="54" r="5"/><circle cx="55" cy="7" r="4"/>',
 breather:'<path d="M26 42h12v13H26zM22 30h20v12H22z" fill="#dce5d6"/><path d="M16 24c0-20 32-20 32 0v6H16z"/><path d="M27 46h11m-11 4h11M19 23h26"/>',
 cover:'<path d="M9 35l10-20 25-3 12 20-10 19-26 3z" fill="#dce5d6"/><ellipse cx="32" cy="33" rx="13" ry="17"/><path d="M22 18l22-3M21 49l25-3"/>',
 blade:'<path d="M15 6h13v31c0 6 8 8 27 8v14c-28 0-40-7-40-21z" fill="#dce5d6"/><circle cx="21" cy="14" r="2"/><circle cx="21" cy="25" r="2"/>',
 shaft:'<path d="M7 19l9-5 40 24v10l-9 5L7 29z" fill="#dce5d6"/><path d="M7 19l40 25 9-6M47 44v9M10 26l7-4m0 8 6-4m24 18 6 3"/>',
 pto:'<path d="M8 13l11-5 8 12-7 8-13-5zM39 41l7-7 12 6-1 14-12 4z" fill="#dce5d6"/><path d="M20 22l24 18-6 9-24-19zM12 12l4 8M48 43l5 8"/>',
 plate:'<path d="M9 21l37-11 12 31-37 13z" fill="#dce5d6"/><circle cx="18" cy="26" r="2"/><circle cx="42" cy="19" r="2"/><circle cx="48" cy="36" r="2"/><circle cx="24" cy="44" r="2"/>',
 bush:'<ellipse cx="25" cy="18" rx="15" ry="9" fill="#dce5d6"/><path d="M10 18v27c0 13 30 13 30 0V18"/><ellipse cx="25" cy="18" rx="8" ry="4"/><path d="M33 27l19 10v10l-12 5"/>',
 skid:'<path d="M10 10h12v28l30 5 4 9H19c-8 0-9-9-9-14z" fill="#dce5d6"/><circle cx="16" cy="18" r="2"/><circle cx="16" cy="28" r="2"/>',
 label:'<rect x="8" y="15" width="48" height="32" rx="4" fill="#dce5d6"/><path d="M16 24h32M16 31h22M16 38h27"/>',
 frame:'<path d="M8 20l24-10 24 12-25 11zM8 20v20l23 14 25-12V22M31 33v21M15 18l23 12M45 17L21 27"/>',
 spacer:'<path d="M12 20l29-8 12 17-29 9zM12 20v17l12 15 29-9V29M24 38v14" fill="#dce5d6"/><ellipse cx="34" cy="25" rx="9" ry="5"/>',
 unknown:'<path d="M13 20l19-10 19 10v25L32 55 13 45zM13 20l19 11 19-11M32 31v24"/>'
};
export function visualFor(name=''){
 const n=name.toUpperCase().replaceAll('_',' ').replace(/\s+/g,' ');
 const photo=photographFor(n);
 if(photo){const sourceName=new URL(photo.sourceUrl).hostname.replace(/^www\./,'');return {kind:photo.key,label:photo.label,reference:`Product family reference · ${sourceName}${photo.edit?' · Branding removed from image':''}${photo.colorEdit?' · Orange finish preview':''}`,sourceUrl:photo.sourceUrl,image:`/implements/assets/parts/photos/${photo.file}`,svg:null,photo:true};}
 let kind='unknown';
 if(/GASKET/.test(n))kind='gasket';
 else if(/SPRING WASHER/.test(n))kind='springwasher';
 else if(/WASHER|SHIM/.test(n))kind='washer';
 else if(/CASTLE.*NUT/.test(n))kind='castle';
 else if(/\bNUT\b/.test(n))kind='nut';
 else if(/\bHHB\b|\bHHS\b|\bBOLT\b|SCREW/.test(n))kind='bolt';
 else if(/CIRCLIP/.test(n))kind='circlip';
 else if(/SLEEVE|SPACER/.test(n))kind='spacer';
 else if(/O.?RING|\bOR \d/.test(n))kind='ring';
 else if(/DUCON|DUO.?CONE|OIL SEAL/.test(n))kind='seal';
 else if(/BEARING/.test(n))kind='bearing';
 else if(/GEAR\s*BOX|GEARBOX/.test(n))kind='gearbox';
 else if(/GEAR.*COVER|COVER.*GEAR|DUST COVER|SHIELD/.test(n))kind='cover';
 else if(/\bGEAR\b/.test(n))kind='gear';
 else if(/STAR CAP|END COVER/.test(n))kind='end-cover';
 else if(/STUB.*AX[EL]/.test(n))kind='stub-axle';
 else if(/RD AX|R D SHAFT/.test(n))kind='rd-axle';
 else if(/HOUSING/.test(n))kind='housing';
 else if(/SPLIT PIN|CUTTER PIN|COTTER PIN/.test(n))kind='splitpin';
 else if(/\bPIN\b/.test(n))kind='pin';
 else if(/CLAMP/.test(n))kind='clamp';
 else if(/DAMPER|SPRING/.test(n))kind='damper';
 else if(/BREATHER|OIL CUP/.test(n))kind='breather';
 else if(/PTO/.test(n))kind='pto';
 else if(/ROTARY HOES|BLADE/.test(n))kind='blade';
 else if(/BUSH/.test(n))kind='bush';
 else if(/SLEEVE|SPACER|ADAPTER/.test(n))kind='spacer';
 else if(/SKID|STAND/.test(n))kind='skid';
 else if(/SHAFT|AXLE|AXEL|ROTOR/.test(n))kind='shaft';
 else if(/STICKER|NAME PLATE/.test(n))kind='label';
 else if(/PATTA|PLATE|BOARD|FLANGE|MUD FLAP|STOPPER/.test(n))kind='plate';
 else if(/FRAME|HULL|FABRICATED PARTS|TOP MASTER/.test(n))kind='frame';
 const reference=kind==='gearbox'&&/SINGLE|S\/\s*SPEED/.test(n)?null:catalogue[kind];
 return {kind,photoPending:true,label:reference?.label||({springwasher:'Spring washer',splitpin:'Split / cotter pin',pto:'PTO shaft',gearbox:'Gearbox',unknown:'Component reference pending'}[kind]||kind[0].toUpperCase()+kind.slice(1)),reference:reference?`Photo pending · Shaktiman catalogue reference, PDF page ${reference.page}, position ${reference.position}`:'Photo pending · Illustrative shape based on the component name',image:reference?`/implements/assets/parts/${kind}.png`:null,svg:reference?null:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${drawings[kind]||drawings.unknown}</svg>`};
}
export function partDetails(name=''){
 const normalized=name.replaceAll('×','X'),details=[];
 const thread=normalized.match(/M\d+(?:\.\d+)?\s*[xX]\s*\d+(?:\.\d+)?(?:\s*[xX]\s*\d+(?:\.\d+)?)?/i);if(thread)details.push(['Size / thread as named',thread[0]]);
 const grade=name.match(/\((8\.8|10\.9|12\.9)\)/);if(grade)details.push(['Fastener grade',grade[1]]);
 const teeth=name.match(/(?:GEAR\s*)?(\d+)\s*[- ]?TEETH/i);if(teeth)details.push(['Gear teeth as named',teeth[1]]);
 const bearing=name.match(/BEARING\s*-?\s*(\d{4,5})/i);if(bearing)details.push(['Bearing number as named',bearing[1]]);
 return details;
}
