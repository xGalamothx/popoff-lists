#!/usr/bin/env node
"use strict";

// Builds index.json only from complete, cryptographically valid PopOff packages.
// No private key or credential is used here; this script only verifies signatures.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const OWNER = "xGalamothx";
const REPO = "popoff-lists";
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/`;
const MAX_PACK_BYTES = 6 * 1024 * 1024;
const MAX_INDEX_PACKAGES = 100;
const PUBLIC_KEY_DER_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAroJLI+9YBL4bNZBVdGFmeJELBgMwijIS7Ij6A79oWgBLSK22AMq3BqyOo+7eE0ojWuA+KItBWSzYEcHZCw+js3GI+Uxb1RiXsGqWRGk7j1Sovyu9TlkR+eFStYmHa02hBk8Gh/rwmzOkKa9ypYnbCmmC4htWoJT9OEbJTmrxJt09b2fjWaerget8wxV2JDErlool2aRGK/U6QXnuCbN2vQS3B7VzGGSXy+pGYpMmqas3X/KtSeSASWYtinjgz2GJ6q/b9xPIyZSOjdAhdkZsPUTLFYjkzyWkHCctyxOha/lJTgP9AWClCu52QKmBSQKxBiRM9RBsttNzG6z8OWcLPQIDAQAB";

function canonicalize(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalize(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function parseStamp(file) {
  const match = file.match(/^(\d{2})(\d{2})(\d{4})\.(\d{2})(\d{2})([BC]?)\.popoff$/i);
  if (!match) throw new Error(`Nombre de paquete no válido: ${file}`);
  const [, dd, mm, yyyy, hh, min, suffix] = match;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)));
  if (d.getUTCFullYear() !== Number(yyyy) || d.getUTCMonth() !== Number(mm) - 1 ||
      d.getUTCDate() !== Number(dd) || Number(hh) > 23 || Number(min) > 59) {
    throw new Error(`Fecha/hora inválida en el nombre: ${file}`);
  }
  return { key: `${yyyy}${mm}${dd}${hh}${min}`, rank: suffix.toUpperCase() === "C" ? 2 : suffix.toUpperCase() === "B" ? 1 : 0 };
}

function validatePackage(file) {
  const fullPath = path.join(process.cwd(), file);
  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size < 2 || stat.size > MAX_PACK_BYTES) throw new Error(`Tamaño no permitido: ${file}`);
  const rawText = fs.readFileSync(fullPath, "utf8");
  const pack = JSON.parse(rawText);
  if (!pack || Array.isArray(pack) || pack.format !== "bp-lists" || pack.schema !== 1) throw new Error(`Formato/esquema no válido: ${file}`);
  if (!Number.isSafeInteger(pack.listVersion) || pack.listVersion < 1) throw new Error(`listVersion inválida: ${file}`);
  if (typeof pack.name !== "string" || !pack.name.trim()) throw new Error(`Nombre interno ausente: ${file}`);
  if (typeof pack.updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(pack.updated) ||
      Number.isNaN(Date.parse(pack.updated)) || new Date(pack.updated).toISOString().slice(0, 10) !== pack.updated) {
    throw new Error(`Fecha updated inválida: ${file}`);
  }
  if (typeof pack.minExtension !== "string" || !/^\d+(\.\d+){1,3}$/.test(pack.minExtension)) {
    throw new Error(`minExtension inválida: ${file}`);
  }
  if (!pack.lists || typeof pack.lists !== "object" || Array.isArray(pack.lists)) throw new Error(`Falta lists: ${file}`);
  const arrayKeys = ["fullBlockSites", "blacklist", "whitelist", "permanentBlacklist", "hidden", "authAllowlist", "neverBlock", "safeSelectors"];
  for (const key of arrayKeys) if (pack.lists[key] !== undefined && !Array.isArray(pack.lists[key])) throw new Error(`Lista ${key} inválida: ${file}`);
  if (pack.lists.remove !== undefined) {
    if (!pack.lists.remove || typeof pack.lists.remove !== "object" || Array.isArray(pack.lists.remove)) throw new Error(`remove inválido: ${file}`);
    for (const key of ["fullBlockSites", "blacklist", "whitelist"]) if (pack.lists.remove[key] !== undefined && !Array.isArray(pack.lists.remove[key])) throw new Error(`remove.${key} inválido: ${file}`);
  }

  const integrityBody = { ...pack };
  delete integrityBody.integrity;
  delete integrityBody.signature;
  const expectedIntegrity = "sha256-" + crypto.createHash("sha256").update(canonicalize(integrityBody), "utf8").digest("hex");
  if (pack.integrity !== expectedIntegrity) throw new Error(`Huella SHA-256 incorrecta: ${file}`);

  if (!pack.signature || pack.signature.algorithm !== "RSA-PSS-SHA256" || typeof pack.signature.value !== "string") {
    throw new Error(`Firma RSA-PSS ausente o con formato incorrecto: ${file}`);
  }
  const signature = Buffer.from(pack.signature.value, "base64");
  if (!signature.length || signature.toString("base64") !== pack.signature.value) throw new Error(`Firma Base64 inválida: ${file}`);
  const signedBody = { ...pack };
  delete signedBody.signature;
  const publicKey = crypto.createPublicKey({ key: Buffer.from(PUBLIC_KEY_DER_B64, "base64"), format: "der", type: "spki" });
  const valid = crypto.verify("sha256", Buffer.from(canonicalize(signedBody), "utf8"), {
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32
  }, signature);
  if (!valid) throw new Error(`Firma RSA-PSS no válida: ${file}`);

  const stamp = parseStamp(file);
  return {
    file,
    listVersion: pack.listVersion,
    updated: pack.updated,
    minExtension: pack.minExtension,
    url: RAW_BASE + encodeURIComponent(file),
    _stamp: stamp
  };
}

const files = fs.readdirSync(process.cwd()).filter((name) => name.toLowerCase().endsWith(".popoff")).sort();
if (!files.length) throw new Error("No se encontró ningún paquete .popoff; no se modificó index.json.");

const packages = files.map(validatePackage);
packages.sort((a, b) => b._stamp.key.localeCompare(a._stamp.key) || b._stamp.rank - a._stamp.rank || b.listVersion - a.listVersion);
const index = {
  project: "PopOff",
  format: 1,
  packages: packages.slice(0, MAX_INDEX_PACKAGES).map(({ _stamp, ...entry }) => entry)
};
const target = path.join(process.cwd(), "index.json");
const temporary = target + ".tmp";
fs.writeFileSync(temporary, JSON.stringify(index, null, 2) + "\n", { encoding: "utf8", flag: "w" });
fs.renameSync(temporary, target);
console.log(`Índice actualizado: ${index.packages.length} paquetes verificados; el más reciente es ${index.packages[0].file} (lista v${index.packages[0].listVersion}).`);
