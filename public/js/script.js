// Inicializácia globálnych premenných
let fileTreeData = [];
let expandedFolders = new Set();
let activePath = "";
let activeType = ""; // Hodnoty: "file" alebo "directory"
let originalContent = "";

const fileContent = document.getElementById("fileContent");
const saveBtn = document.getElementById("saveBtn");
const breadcrumb = document.getElementById("breadcrumb");

fileContent.addEventListener("input", () => {
  saveBtn.disabled = fileContent.value === originalContent;
});

// Aktualizácia navigačného breadcrumbs
function updateBreadcrumb() {
  breadcrumb.innerHTML = "";
  const publicCrumb = document.createElement("li");
  publicCrumb.className = "breadcrumb-item";
  publicCrumb.style.cursor = "pointer";
  publicCrumb.textContent = "@publicFolder";
  publicCrumb.style.color = "blue";
  publicCrumb.style.fontWeight = "bold";
  publicCrumb.addEventListener("click", () => {
    activePath = "";
    activeType = "";
    expandedFolders.clear();
    fileContent.value = "";
    originalContent = "";
    saveBtn.disabled = true;
    loadFileTree();
  });
  breadcrumb.appendChild(publicCrumb);
  if (activePath) {
    activePath.split("/").forEach((part, index, parts) => {
      const li = document.createElement("li");
      li.className =
        "breadcrumb-item" + (index === parts.length - 1 ? " active" : "");
      li.textContent = part;
      breadcrumb.appendChild(li);
    });
  }
}

// Rekurzívne zostavenie stromu súborov
function buildTree(nodes) {
  const ul = document.createElement("ul");
  ul.className = "file-list";
  nodes.forEach((node) => {
    const li = document.createElement("li");
    li.className = "file-item";
    li.dataset.path = node.path;
    li.dataset.isDirectory = node.isDirectory;
    const row = document.createElement("div");
    row.className = "item-row";
    if (node.path === activePath) row.classList.add("active");

    const icon = document.createElement("i");
    icon.className = node.isDirectory ? "bi bi-folder" : "bi bi-file-earmark";
    row.appendChild(icon);

    const span = document.createElement("span");
    span.textContent = " " + node.name;
    row.appendChild(span);

    const actionContainer = document.createElement("div");
    actionContainer.className = "action-container";

    // Funkcia pre premenovanie
    const renameIcon = document.createElement("i");
    renameIcon.className = "bi bi-pencil-square rename-icon";
    renameIcon.title = "Premenovať";
    renameIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      activePath = node.path;
      activeType = node.isDirectory ? "directory" : "file";
      row.classList.add("active");
      const currentName = node.name;
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentName;
      input.style.width = "100%";

      input.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      });
      input.addEventListener("click", (ev) => ev.stopPropagation());
      input.focus();
      setTimeout(() => {
        const dotIndex = currentName.lastIndexOf(".");
        if (dotIndex > 0) {
          input.select();
          input.setSelectionRange(0, dotIndex);
        } else {
          input.select();
        }
      }, 200);

      let renameFinished = false;
      function finishRename() {
        if (renameFinished) return;
        renameFinished = true;
        const newName = input.value.trim();
        if (!newName || newName === currentName) {
          row.replaceChild(span, input);
          return;
        }
        fetch("/file-system/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPath: node.path, newName }),
        })
          .then((response) => {
            if (!response.ok)
              return response.json().then((data) => {
                throw new Error(data.message);
              });
            return null;
          })
          .then(() => {
            const parent = node.path.substring(0, node.path.lastIndexOf("/"));
            activePath = (parent ? parent + "/" : "") + newName;
            loadFileTree();
          })
          .catch((err) => {
            alert("Chyba: " + err.message);
            row.replaceChild(span, input);
          });
      }
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") finishRename();
        if (ev.key === "Escape") row.replaceChild(span, input);
      });
      setTimeout(() => {
        input.addEventListener("blur", finishRename);
      }, 200);
      row.replaceChild(input, span);
    });
    actionContainer.appendChild(renameIcon);

    // Funkcia pre vymazanie
    const delIcon = document.createElement("i");
    delIcon.className = "bi bi-trash delete-icon";
    delIcon.title = "Vymazať";
    delIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Vymazať " + node.name + "?")) {
        fetch("/file-system/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: node.path }),
        })
          .then((response) => {
            if (!response.ok)
              return response.json().then((data) => {
                throw new Error(data.message);
              });
            return null;
          })
          .then(() => {
            if (activePath === node.path) {
              activePath = "";
              activeType = "";
              fileContent.value = "";
              originalContent = "";
              saveBtn.disabled = true;
            }
            loadFileTree();
          })
          .catch((err) => {
            alert("Chyba: " + err.message);
          });
      }
    });
    actionContainer.appendChild(delIcon);
    row.appendChild(actionContainer);

    row.addEventListener("click", (e) => {
      if (row.querySelector("input")) return;
      e.stopPropagation();
      if (node.isDirectory) {
        if (expandedFolders.has(node.path)) {
          expandedFolders.delete(node.path);
        } else {
          expandedFolders.add(node.path);
        }
        activePath = node.path;
        activeType = "directory";
        fileContent.value = "";
        originalContent = "";
        saveBtn.disabled = true;
        updateBreadcrumb();
        loadFileTree();
      } else {
        activePath = node.path;
        activeType = "file";
        const parts = activePath.split("/");
        if (parts.length > 1) {
          parts.pop();
          const parentPath = parts.join("/");
          if (parentPath) expandedFolders.add(parentPath);
        }

        updateBreadcrumb();
        fetch("/file-system/file?path=" + encodeURIComponent(node.path))
          .then((response) => {
            if (!response.ok)
              return response.text().then((text) => {
                throw new Error(text);
              });
            return response.text();
          })
          .then((text) => {
            fileContent.value = text;
            originalContent = text;
            saveBtn.disabled = true;
          })
          .catch((err) => {
            alert("Chyba pri načítaní súboru: " + err.message);
          });
        loadFileTree();
      }
    });

    li.appendChild(row);
    if (node.isDirectory && expandedFolders.has(node.path) && node.children) {
      li.appendChild(buildTree(node.children));
    }
    ul.appendChild(li);
  });
  return ul;
}

// Načítanie stromu súborov z file-system
function loadFileTree() {
  fetch("/file-system/files")
    .then((res) => res.json())
    .then((data) => {
      fileTreeData = data;
      updateBreadcrumb();
      const container = document.getElementById("fileTree");
      container.innerHTML = "";
      container.appendChild(buildTree(fileTreeData));
    })
    .catch((err) => {
      alert("Chyba pri načítaní stromu: " + err);
    });
}

// Vytvorenie novej položky inline (súbor alebo priečinok)
function createInlineItem(type) {
  let parentPath = "";
  if (activePath && activeType === "directory") {
    parentPath = activePath;
  } else if (activePath && activeType === "file") {
    const parts = activePath.split("/");
    parts.pop();
    parentPath = parts.join("/");
  }
  let container;
  if (!parentPath) {
    container = document.querySelector("#fileTree > ul");
    if (!container) {
      container = document.createElement("ul");
      container.className = "file-list";
      document.getElementById("fileTree").appendChild(container);
    }
  } else {
    const parentLi = document.querySelector(
      '.file-item[data-path="' + parentPath + '"]'
    );
    container = parentLi ? parentLi.querySelector("ul") : null;
    if (!container) {
      container = document.createElement("ul");
      container.className = "file-list";
      if (parentLi) parentLi.appendChild(container);
    }
  }
  const li = document.createElement("li");
  li.className = "file-item inline-input";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = type === "file" ? "Názov súboru" : "Názov priečinka";
  input.className = "form-control form-control-sm";
  li.appendChild(input);
  container.appendChild(li);
  input.focus();
  let finished = false;
  function finishCreation() {
    if (finished) return;
    finished = true;
    const name = input.value.trim();
    if (!name) {
      li.remove();
      return;
    }
    fetch("/file-system/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, currentPath: parentPath }),
    })
      .then((response) => {
        if (!response.ok)
          return response.json().then((data) => {
            throw new Error(data.message);
          });
        return null;
      })
      .then(() => {
        if (type === "file") {
          const newFilePath = (parentPath ? parentPath + "/" : "") + name;
          activePath = newFilePath;
          activeType = "file";
          if (parentPath) expandedFolders.add(parentPath);
          loadFileTree();
          fetch("/file-system/file?path=" + encodeURIComponent(activePath))
            .then((response) => {
              if (!response.ok)
                return response.text().then((text) => {
                  throw new Error(text);
                });
              return response.text();
            })
            .then((text) => {
              fileContent.value = text;
              originalContent = text;
              saveBtn.disabled = true;
            })
            .catch((err) => {
              alert("Chyba pri načítaní nového súboru: " + err.message);
            });
        } else {
          const newDirPath = (parentPath ? parentPath + "/" : "") + name;
          activePath = newDirPath;
          activeType = "directory";
          if (parentPath) expandedFolders.add(parentPath);
          loadFileTree();
        }
      })
      .catch((err) => {
        alert("Chyba: " + err.message);
        li.remove();
      });
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      finishCreation();
      input.removeEventListener("blur", finishCreation);
    }
    if (e.key === "Escape") li.remove();
  });
  input.addEventListener("blur", finishCreation);
}

document
  .getElementById("addFileBtn")
  .addEventListener("click", () => createInlineItem("file"));
document
  .getElementById("addFolderBtn")
  .addEventListener("click", () => createInlineItem("directory"));

saveBtn.addEventListener("click", () => {
  if (activeType !== "file") {
    alert("Vyberte súbor na uloženie.");
    return;
  }
  const content = fileContent.value;
  fetch("/file-system/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: activePath, content }),
  })
    .then((res) => {
      if (!res.ok)
        return res.json().then((data) => {
          throw new Error(data.message);
        });
      return null;
    })
    .then(() => {
      originalContent = content;
      saveBtn.disabled = true;
    })
    .catch((err) => {
      alert("Chyba pri ukladaní súboru: " + err.message);
    });
});

activePath = "";
activeType = "";
updateBreadcrumb();
loadFileTree();
