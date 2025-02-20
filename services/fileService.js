// services/fileService.js
const path = require('path');
const fs = require('fs').promises;

// Overí, že cesta patrí do adresára publicDir
function resolvePath(publicDir, filePath) {
  const resolvedPath = path.resolve(publicDir, filePath);
  if (!resolvedPath.startsWith(publicDir)) {
    throw new Error("Neplatná cesta.");
  }
  return resolvedPath;
}

// Rekurzívne načítanie súborov a priečinkov
async function listFilesRecursively(dir, relative = "") {
  let results = [];
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    const relPath = path.join(relative, dirent.name).replace(/\\/g, '/');
    const item = {
      name: dirent.name,
      path: relPath,
      isDirectory: dirent.isDirectory()
    };
    if (dirent.isDirectory()) {
      item.children = await listFilesRecursively(fullPath, relPath);
    }
    results.push(item);
  }
  return results;
}

// Načítanie obsahu súboru
async function readFileContent(publicDir, filePath) {
  const resolvedPath = resolvePath(publicDir, filePath);
  return await fs.readFile(resolvedPath, 'utf8');
}

// Uloženie obsahu do súboru
async function saveFileContent(publicDir, filePath, content) {
  const resolvedPath = resolvePath(publicDir, filePath);
  return await fs.writeFile(resolvedPath, content, 'utf8');
}

// Vytvorenie novej položky (súbor alebo priečinok)
async function createItem(publicDir, currentPath, name, type) {
  const targetPath = path.join(publicDir, currentPath, name);
  try {
    await fs.stat(targetPath);
    throw new Error("Položka už existuje.");
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    if (type === 'directory') {
      await fs.mkdir(targetPath);
    } else {
      await fs.writeFile(targetPath, '', 'utf8');
    }
  }
}

// Vymazanie položky
async function deleteItem(publicDir, filePath) {
  const resolvedPath = resolvePath(publicDir, filePath);
  const stats = await fs.stat(resolvedPath);
  if (stats.isDirectory()) {
    await fs.rm(resolvedPath, { recursive: true, force: true });
  } else {
    await fs.unlink(resolvedPath);
  }
}

// Premenovanie položky
async function renameItem(publicDir, oldPath, newName) {
  const resolvedOld = resolvePath(publicDir, oldPath);
  const validRegex = /^[a-zA-Z0-9\-_.]+$/;
  if (!validRegex.test(newName)) {
    throw new Error("Neplatný názov.");
  }
  if (path.basename(resolvedOld) === newName) return;
  
  const parentDir = path.dirname(resolvedOld);
  const resolvedNew = path.join(parentDir, newName);
  try {
    await fs.stat(resolvedNew);
    throw new Error("Položka s týmto názvom už existuje.");
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  await fs.rename(resolvedOld, resolvedNew);
}

module.exports = {
  listFilesRecursively,
  readFileContent,
  saveFileContent,
  createItem,
  deleteItem,
  renameItem,
  resolvePath,
};
