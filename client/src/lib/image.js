// Phone photos are big (4-8 MB). We shrink them in the browser before uploading:
// faster upload on slow village internet, and cheaper AI calls.

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this image")); };
    img.src = url;
  });
}

function drawScaled(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Returns { photo: Blob (max 1280px JPEG), thumbnail: data URL (max 240px), preview: object URL }
export async function prepareImage(file) {
  const img = await loadImage(file);
  const big = drawScaled(img, 1280);
  const photo = await new Promise((r) => big.toBlob(r, "image/jpeg", 0.85));
  const thumbnail = drawScaled(img, 240).toDataURL("image/jpeg", 0.7);
  return { photo, thumbnail, preview: URL.createObjectURL(photo) };
}
