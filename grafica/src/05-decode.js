// Apertura delle foto: il browser decodifica JPEG, PNG, WebP, AVIF, GIF e BMP e raddrizza la foto secondo
// l'orientamento scritto dalla fotocamera. HEIC e RAW non si possono aprire: si spiega che cosa fare.
const isHeic=f=>/\.(?:heic|heif)$/i.test(f.name)||/^image\/hei[cf]/i.test(f.type);
const isRaw=f=>/\.(?:cr2|cr3|nef|nrw|arw|srf|sr2|orf|rw2|raf|dng|pef|srw|x3f|3fr|iiq)$/i.test(f.name);
const isPhotoFile=f=>/^image\//i.test(f.type)||/\.(?:jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(f.name)||isRaw(f);
// Oltre questa dimensione la foto non si apre: l'esportazione a piena risoluzione richiederebbe troppa memoria.
const MAX_PIXELS=60e6;
async function decodePhoto(file){
 if(isHeic(file))throw Error('Le foto HEIC degli iPhone non si aprono in Chrome ed Edge. Sul telefono scegli Impostazioni › Fotocamera › Formati › Più compatibile, oppure condividi la foto come JPEG.');
 if(isRaw(file))throw Error('I file RAW delle fotocamere non si aprono ancora: esporta prima la foto in JPEG dalla fotocamera o dal suo programma.');
 if(/svg/i.test(file.type)||/\.svg$/i.test(file.name))throw Error('I disegni SVG si apriranno in Disegno: Immagini lavora sulle foto.');
 let bmp;try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){throw Error(`«${file.name}» non è un’immagine che il browser sa aprire`)}
 if(bmp.width*bmp.height>MAX_PIXELS){const w=bmp.width,h=bmp.height;bmp.close();throw Error(`La foto è troppo grande (${fmtInt(w)} × ${fmtInt(h)} pixel): il limite è di ${fmtInt(MAX_PIXELS/1e6)} milioni di pixel.`)}
 return bmp}
