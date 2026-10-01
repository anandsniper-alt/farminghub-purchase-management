export {validateItemImages} from '../../shared/implements/item-images.mjs';
export async function prepareItemImage(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a PNG, JPG or WebP image up to 10 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000)throw Error('Choose an image smaller than 40 megapixels.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,480/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let image=canvas.toDataURL('image/webp',.8);
  if(image.length>100000)image=canvas.toDataURL('image/jpeg',.65);
  validateItemImages({upload:{originalName:'Upload',image}});return image;
 }finally{bitmap.close();}
}
