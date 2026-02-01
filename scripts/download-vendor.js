const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const axios = require("axios");

const files = [
  {
    url: "https://cdntx.moecube.com/libocgcore-koishi/wasm_cjs/libocgcore.cjs",
    dest: path.join("src", "vendor", "wasm_cjs", "libocgcore.cjs"),
  },
  {
    url: "https://cdntx.moecube.com/libocgcore-koishi/wasm_cjs/libocgcore.wasm",
    dest: path.join("src", "vendor", "wasm_cjs", "libocgcore.wasm"),
  },
  {
    url: "https://cdntx.moecube.com/libocgcore-koishi/wasm_esm/libocgcore.mjs",
    dest: path.join("src", "vendor", "wasm_esm", "libocgcore.mjs"),
  },
  {
    url: "https://cdntx.moecube.com/libocgcore-koishi/wasm_esm/libocgcore.wasm",
    dest: path.join("src", "vendor", "wasm_esm", "libocgcore.wasm"),
  },
];

async function download(url, dest) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  const response = await axios.get(url, { responseType: "stream" });
  const fileStream = fs.createWriteStream(dest);
  await pipeline(response.data, fileStream);
}

async function main() {
  for (const file of files) {
    await download(file.url, file.dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
