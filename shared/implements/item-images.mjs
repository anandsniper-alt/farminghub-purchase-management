// Only bounded raster data is persisted; never accept executable SVG or remote URLs.
export function validateItemImages(images={}){
 if(!images||typeof images!=='object'||Array.isArray(images)||Object.keys(images).length>5000)throw Error('Invalid item images.');
 let size=0;
 for(const [id,v] of Object.entries(images)){
  if(['__proto__','constructor','prototype'].includes(id)||!v||typeof v.originalName!=='string'||v.originalName.length>500)throw Error('Invalid item image identity.');
  if(v.image!=null&&(typeof v.image!=='string'||v.image.length>100000||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v.image)))throw Error('Use a PNG, JPG or WebP item image.');
  size+=(v.image?.length||0);
 }
 if(size>2000000)throw Error('The photo allowance is full (2 MB). Restore unused photos or download a backup first.');
 return images;
}
