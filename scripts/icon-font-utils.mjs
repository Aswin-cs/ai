import zlib from "node:zlib";

const KNOWN_WOFF2_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm",
  "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern",
  "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC",
  "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty",
  "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat",
  "Gloc", "Feat", "Sill",
];

function readUIntBase128(buf, pos) {
  let accum = 0;
  let offset = pos;
  for (let i = 0; i < 5; i++) {
    const byte = buf.readUInt8(offset++);
    if (i === 0 && byte === 0x80) throw new Error("Invalid UIntBase128 leading zero");
    if ((accum & 0xfe000000) !== 0) throw new Error("UIntBase128 overflow");
    accum = (accum << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value: accum, nextOffset: offset };
  }
  throw new Error("UIntBase128 exceeds 5 bytes");
}

function extractWoff2Tables(woff2Buf) {
  if (woff2Buf.toString("ascii", 0, 4) !== "wOF2") {
    throw new Error("Not a valid WOFF2 font file");
  }
  const numTables = woff2Buf.readUInt16BE(12);
  const totalCompressedSize = woff2Buf.readUInt32BE(20);

  let offset = 48;
  const entries = [];
  for (let i = 0; i < numTables; i++) {
    const flags = woff2Buf.readUInt8(offset++);
    const tagIndex = flags & 0x3f;
    const transformVersion = (flags >> 6) & 0x03;
    let tag;
    if (tagIndex === 63) {
      tag = woff2Buf.toString("ascii", offset, offset + 4);
      offset += 4;
    } else {
      tag = KNOWN_WOFF2_TAGS[tagIndex];
    }
    const orig = readUIntBase128(woff2Buf, offset);
    offset = orig.nextOffset;
    const isTransformed =
      tag === "glyf" || tag === "loca" ? transformVersion !== 3 : transformVersion !== 0;
    let lengthInStream = orig.value;
    if (isTransformed) {
      const tr = readUIntBase128(woff2Buf, offset);
      offset = tr.nextOffset;
      lengthInStream = tr.value;
    }
    entries.push({ tag, isTransformed, lengthInStream });
  }

  const compressedSlice = woff2Buf.subarray(offset, offset + totalCompressedSize);
  const decompressed = zlib.brotliDecompressSync(compressedSlice);

  const tables = new Map();
  let streamPos = 0;
  for (const entry of entries) {
    if (!entry.isTransformed) {
      tables.set(entry.tag, decompressed.subarray(streamPos, streamPos + entry.lengthInStream));
    }
    streamPos += entry.lengthInStream;
  }
  return tables;
}

function parseGlyphToCharMap(cmapBuf) {
  const numSubtables = cmapBuf.readUInt16BE(2);
  let chosenOffset = null;
  let chosenFormat = 0;
  for (let i = 0; i < numSubtables; i++) {
    const recOff = 4 + i * 8;
    const platformId = cmapBuf.readUInt16BE(recOff);
    const encodingId = cmapBuf.readUInt16BE(recOff + 2);
    const subOff = cmapBuf.readUInt32BE(recOff + 4);
    const fmt = cmapBuf.readUInt16BE(subOff);
    if ((platformId === 3 && (encodingId === 10 || encodingId === 1)) || platformId === 0) {
      if (fmt === 12 || (fmt === 4 && chosenFormat !== 12)) {
        chosenOffset = subOff;
        chosenFormat = fmt;
      }
    }
  }
  if (chosenOffset == null) throw new Error("Unsupported cmap table");

  const glyphToChar = new Map();
  if (chosenFormat === 12) {
    const numGroups = cmapBuf.readUInt32BE(chosenOffset + 12);
    for (let i = 0; i < numGroups; i++) {
      const gOff = chosenOffset + 16 + i * 12;
      const startCp = cmapBuf.readUInt32BE(gOff);
      const endCp = cmapBuf.readUInt32BE(gOff + 4);
      const startGlyph = cmapBuf.readUInt32BE(gOff + 8);
      for (let cp = startCp; cp <= endCp; cp++) {
        glyphToChar.set(startGlyph + (cp - startCp), String.fromCodePoint(cp));
      }
    }
  } else if (chosenFormat === 4) {
    const segCount = cmapBuf.readUInt16BE(chosenOffset + 6) / 2;
    const endCodeBase = chosenOffset + 14;
    const startCodeBase = endCodeBase + segCount * 2 + 2;
    const idDeltaBase = startCodeBase + segCount * 2;
    const idRangeOffBase = idDeltaBase + segCount * 2;
    for (let i = 0; i < segCount; i++) {
      const endCode = cmapBuf.readUInt16BE(endCodeBase + i * 2);
      const startCode = cmapBuf.readUInt16BE(startCodeBase + i * 2);
      if (startCode === 0xffff && endCode === 0xffff) continue;
      const idDelta = cmapBuf.readInt16BE(idDeltaBase + i * 2);
      const idRangeOff = cmapBuf.readUInt16BE(idRangeOffBase + i * 2);
      for (let cp = startCode; cp <= endCode; cp++) {
        let gid;
        if (idRangeOff === 0) {
          gid = (cp + idDelta) & 0xffff;
        } else {
          const ptr = idRangeOffBase + i * 2 + idRangeOff + (cp - startCode) * 2;
          const raw = cmapBuf.readUInt16BE(ptr);
          gid = raw === 0 ? 0 : (raw + idDelta) & 0xffff;
        }
        if (gid !== 0) glyphToChar.set(gid, String.fromCodePoint(cp));
      }
    }
  }
  return glyphToChar;
}

function readCoverageGlyphs(buf, covOff) {
  const fmt = buf.readUInt16BE(covOff);
  const glyphs = [];
  if (fmt === 1) {
    const count = buf.readUInt16BE(covOff + 2);
    for (let i = 0; i < count; i++) {
      glyphs.push(buf.readUInt16BE(covOff + 4 + i * 2));
    }
  } else if (fmt === 2) {
    const rangeCount = buf.readUInt16BE(covOff + 2);
    for (let i = 0; i < rangeCount; i++) {
      const start = buf.readUInt16BE(covOff + 4 + i * 6);
      const end = buf.readUInt16BE(covOff + 4 + i * 6 + 2);
      for (let g = start; g <= end; g++) glyphs.push(g);
    }
  }
  return glyphs;
}

/**
 * Extracts all GSUB ligature strings (e.g. "location_on") from a WOFF2 font buffer.
 */
export function extractWoff2Ligatures(woff2Buf) {
  const tables = extractWoff2Tables(woff2Buf);
  const cmapBuf = tables.get("cmap");
  const gsubBuf = tables.get("GSUB");
  const maxpBuf = tables.get("maxp");
  if (!cmapBuf || !gsubBuf || !maxpBuf) {
    throw new Error("Missing required cmap, GSUB, or maxp table in WOFF2 font");
  }

  const numGlyphs = maxpBuf.readUInt16BE(4);
  const glyphToChar = parseGlyphToCharMap(cmapBuf);
  const ligatures = new Map();

  const lookupListOffset = gsubBuf.readUInt16BE(8);
  const lookupCount = gsubBuf.readUInt16BE(lookupListOffset);

  for (let i = 0; i < lookupCount; i++) {
    const lookupOff = lookupListOffset + gsubBuf.readUInt16BE(lookupListOffset + 2 + i * 2);
    const lookupType = gsubBuf.readUInt16BE(lookupOff);
    const subtableCount = gsubBuf.readUInt16BE(lookupOff + 4);

    for (let s = 0; s < subtableCount; s++) {
      let stOff = lookupOff + gsubBuf.readUInt16BE(lookupOff + 6 + s * 2);
      let effType = lookupType;
      if (lookupType === 7) {
        effType = gsubBuf.readUInt16BE(stOff + 2);
        stOff = stOff + gsubBuf.readUInt32BE(stOff + 4);
      }
      if (effType !== 4) continue;
      const substFormat = gsubBuf.readUInt16BE(stOff);
      if (substFormat !== 1) continue;

      const covOff = stOff + gsubBuf.readUInt16BE(stOff + 2);
      const firstGlyphs = readCoverageGlyphs(gsubBuf, covOff);
      const ligSetCount = gsubBuf.readUInt16BE(stOff + 4);

      for (let j = 0; j < ligSetCount; j++) {
        const firstGid = firstGlyphs[j];
        const firstCh = glyphToChar.get(firstGid);
        if (!firstCh) continue;

        const ligSetOff = stOff + gsubBuf.readUInt16BE(stOff + 6 + j * 2);
        const ligCount = gsubBuf.readUInt16BE(ligSetOff);
        for (let k = 0; k < ligCount; k++) {
          const ligOff = ligSetOff + gsubBuf.readUInt16BE(ligSetOff + 2 + k * 2);
          const ligGlyph = gsubBuf.readUInt16BE(ligOff);
          const compCount = gsubBuf.readUInt16BE(ligOff + 2);
          let seq = firstCh;
          let valid = ligGlyph > 0 && ligGlyph < numGlyphs;
          for (let c = 0; c < compCount - 1; c++) {
            const compGid = gsubBuf.readUInt16BE(ligOff + 4 + c * 2);
            const ch = glyphToChar.get(compGid);
            if (!ch) {
              valid = false;
              break;
            }
            seq += ch;
          }
          if (valid) ligatures.set(seq, ligGlyph);
        }
      }
    }
  }

  return ligatures;
}
