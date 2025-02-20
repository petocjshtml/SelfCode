// routes/file-system.js
const express = require("express");
const path = require("path");
const router = express.Router();
const fileService = require("../services/fileService");

const publicDir = path.join(__dirname, "..", "public");

// Získanie stromovej štruktúry súborov
router.get("/files", async (req, res) => {
  try {
    const files = await fileService.listFilesRecursively(publicDir);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Načítanie obsahu konkrétneho súboru
router.get("/file", async (req, res) => {
  const filePath = req.query.path;
  try {
    const data = await fileService.readFileContent(publicDir, filePath);
    res.send(data);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// Uloženie zmien do súboru
router.post("/save", async (req, res) => {
  const { path: filePath, content } = req.body;
  try {
    await fileService.saveFileContent(publicDir, filePath, content);
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ message: err.toString() });
  }
});

// Vytvorenie novej položky (súbor alebo priečinok)
router.post("/create", async (req, res) => {
  const { name, type, currentPath = "" } = req.body;
  try {
    await fileService.createItem(publicDir, currentPath, name, type);
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ message: err.toString() });
  }
});

// Vymazanie položky
router.post("/delete", async (req, res) => {
  const filePath = req.body.path;
  try {
    await fileService.deleteItem(publicDir, filePath);
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ message: err.toString() });
  }
});

// Premenovanie položky
router.post("/rename", async (req, res) => {
  const { oldPath, newName } = req.body;
  try {
    await fileService.renameItem(publicDir, oldPath, newName);
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ message: err.toString() });
  }
});

module.exports = router;
