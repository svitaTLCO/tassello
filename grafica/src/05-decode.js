// Apertura delle foto: il browser decodifica JPEG, PNG, WebP, AVIF, GIF e BMP e raddrizza la foto secondo
// l'orientamento scritto dalla fotocamera. Le foto HEIC le ricompone heifDecode (05b) con il decodificatore HEVC del
// sistema. Dei RAW si apre l'anteprima JPEG che la fotocamera ha messo nel file (rawDecode, 05c).
const isHeic=f=>/\.(?:heic|heif)$/i.test(f.name)||/^image\/hei[cf]/i.test(f.type);
const isRaw=f=>/\.(?:cr2|cr3|nef|nrw|arw|srf|sr2|orf|rw2|raf|dng|pef|srw|x3f|3fr|iiq)$/i.test(f.name);
const isPhotoFile=f=>/^image\//i.test(f.type)||/\.(?:jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(f.name)||isRaw(f);
// Oltre questa dimensione la foto non si apre: l'esportazione a piena risoluzione richiederebbe troppa memoria.
const MAX_PIXELS=60e6;
async function decodePhoto(file){
 if(/svg/i.test(file.type)||/\.svg$/i.test(file.name))throw Error('I disegni SVG si apriranno in Disegno: Immagini lavora sulle foto.');
 let bmp;if(isHeic(file))bmp=await heifDecode(file);else if(isRaw(file))bmp=await rawDecode(file);else try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){throw Error(`«${file.name}» non è un’immagine che il browser sa aprire`)}
 if(bmp.width*bmp.height>MAX_PIXELS){const w=bmp.width,h=bmp.height;bmp.close();throw Error(`La foto è troppo grande (${fmtInt(w)} × ${fmtInt(h)} pixel): il limite è di ${fmtInt(MAX_PIXELS/1e6)} milioni di pixel.`)}
 return bmp}
