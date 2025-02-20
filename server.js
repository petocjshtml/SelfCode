// server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

const publicDir = path.join(__dirname, "public");

// Nastavenie middleware
app.use(express.static(publicDir));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Načítanie API routera
const fileSystemRouter = require("./routes/file-system");

// Hlavná stránka a editor
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Použitie API routera pre všetky požiadavky na /api
app.use("/file-system", fileSystemRouter);

app.listen(PORT, () => {
  console.log("Server beží na porte " + PORT);
});
