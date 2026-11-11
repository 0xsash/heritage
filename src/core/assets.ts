// Asset loading helpers. Paths are relative to the page so the game works
// from any base URL.
//
// Some hosts only serve common web file types. For those, binary assets
// (models, HDR skies) can be shipped wrapped as JSON ({ "b64": "..." }) next to
// the original name plus ".json"; set window.BELFORT_WRAPPED = true to use them.
// See tools/package-wrapped.mjs.

export const asset = (p: string) => new URL(p, document.baseURI).toString();

const wrapped = () => (window as unknown as { BELFORT_WRAPPED?: boolean }).BELFORT_WRAPPED === true;

export async function fetchBinary(path: string): Promise<ArrayBuffer> {
  if (wrapped()) {
    const res = await fetch(asset(path + '.json'));
    if (!res.ok) throw new Error(`missing ${path} (${res.status})`);
    const { b64 } = (await res.json()) as { b64: string };
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  const res = await fetch(asset(path));
  if (!res.ok) throw new Error(`missing ${path} (${res.status})`);
  return res.arrayBuffer();
}
