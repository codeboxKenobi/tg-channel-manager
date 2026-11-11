// Шифрование паролей перед отправкой: RSA-OAEP (SHA-256) публичным ключом сервера.
// Реализовано на чистом JS (BigInt), потому что crypto.subtle недоступен на страницах по http://,
// а сайт может работать без HTTPS. Случайность берётся из crypto.getRandomValues (доступен и без HTTPS).
// Это не замена HTTPS: открытого пароля в запросе не будет, но активный перехватчик по HTTP всё равно может подменить страницу.

export interface SealChallenge {
  kid: string
  n: string // модуль RSA, base64url
  e: string // экспонента, base64url
  nonce: string
}

const H = 32 // длина SHA-256

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))

export function sha256(msg: Uint8Array): Uint8Array {
  const len = msg.length
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6)
  padded.set(msg)
  padded[len] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 8, Math.floor(len / 0x20000000))
  dv.setUint32(padded.length - 4, (len << 3) >>> 0)

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h[0] += a
    h[1] += b
    h[2] += c
    h[3] += d
    h[4] += e
    h[5] += f
    h[6] += g
    h[7] += hh
  }
  const out = new Uint8Array(H)
  const odv = new DataView(out.buffer)
  h.forEach((v, i) => odv.setUint32(i * 4, v))
  return out
}

function mgf1(seed: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(Math.ceil(length / H) * H)
  const buf = new Uint8Array(seed.length + 4)
  buf.set(seed)
  for (let counter = 0; counter * H < length; counter++) {
    new DataView(buf.buffer).setUint32(seed.length, counter)
    out.set(sha256(buf), counter * H)
  }
  return out.subarray(0, length)
}

/** RSAES-OAEP (RFC 8017) с SHA-256 и пустой меткой: M → EM длиной k байт. */
function oaepEncode(message: Uint8Array, k: number): Uint8Array {
  const maxLen = k - 2 * H - 2
  if (message.length > maxLen) throw new Error('Сообщение слишком длинное для RSA-блока')
  const db = new Uint8Array(k - H - 1)
  db.set(sha256(new Uint8Array(0))) // lHash; дальше нули (PS), 0x01 и сообщение
  db[db.length - message.length - 1] = 0x01
  db.set(message, db.length - message.length)

  const seed = crypto.getRandomValues(new Uint8Array(H))
  const maskedDb = mgf1(seed, db.length).map((m, i) => m ^ db[i])
  const maskedSeed = mgf1(maskedDb, H).map((m, i) => m ^ seed[i])

  const em = new Uint8Array(k) // 0x00 || maskedSeed || maskedDB
  em.set(maskedSeed, 1)
  em.set(maskedDb, 1 + H)
  return em
}

const b64urlToBytes = (s: string): Uint8Array => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const bytesToBig = (b: Uint8Array): bigint => b.reduce((acc, x) => (acc << BigInt(8)) | BigInt(x), BigInt(0))
const bigToBytes = (v: bigint, k: number): Uint8Array => {
  const out = new Uint8Array(k)
  for (let i = k - 1; i >= 0; i--, v >>= BigInt(8)) out[i] = Number(v & BigInt(255))
  return out
}
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1)
  base %= mod
  for (; exp > BigInt(0); exp >>= BigInt(1)) {
    if (exp & BigInt(1)) result = (result * base) % mod
    base = (base * base) % mod
  }
  return result
}

/** Шифрует поля (пароли) ключом сервера. Длинные значения режутся на блоки, у каждого свой случайный seed. */
export function sealWith(challenge: SealChallenge, fields: Record<string, string>): { enc: string; kid: string } {
  const nBytes = b64urlToBytes(challenge.n)
  const k = nBytes.length
  const n = bytesToBig(nBytes)
  const e = bytesToBig(b64urlToBytes(challenge.e))
  // nonce лежит внутри шифротекста: подменить его или переиспользовать запрос нельзя
  const plain = new TextEncoder().encode(JSON.stringify({ n: challenge.nonce, f: fields }))
  const step = k - 2 * H - 2

  const blocks: Uint8Array[] = []
  for (let i = 0; i < plain.length; i += step) {
    blocks.push(bigToBytes(modPow(bytesToBig(oaepEncode(plain.subarray(i, i + step), k)), e, n), k))
  }
  const all = new Uint8Array(blocks.length * k)
  blocks.forEach((b, i) => all.set(b, i * k))
  let bin = ''
  for (const byte of all) bin += String.fromCharCode(byte)
  return { enc: btoa(bin), kid: challenge.kid }
}

/** Запрашивает у сервера ключ и nonce и шифрует поля. Результат подмешивается в тело запроса: { ...sealed }. */
export async function sealFields(fields: Record<string, string>): Promise<{ enc: string; kid: string }> {
  const challenge = await $fetch<SealChallenge>('/api/auth/key', { cache: 'no-store' })
  return sealWith(challenge, fields)
}
