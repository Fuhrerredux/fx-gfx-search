/*********************
 *  GLOBAL VARIABLES  *
 **********************/
let allImages = {};
let selectedFolders = new Set();

// Mapping for sprite files (update as needed)
const SPRITEFILES_TO_USE = [
  { name: "FX_goals.json", folder: "interface/goals" },
  { name: "FX_ideas.json", folder: "interface/ideas" }
];

/*********************
 *  INITIALIZATION    *
 **********************/
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  document.getElementById("search").addEventListener("input", searchImages);
  document.getElementById("modal-close").addEventListener("click", closeModal);
  window.addEventListener("click", event => {
    const modal = document.getElementById("modal");
    if (event.target === modal) closeModal();
  });
  fetchImages();
});

/*********************
 *  DATA MANAGEMENT   *
 **********************/
async function getImages(folder) {
  // Fetch images from GitHub using its API.
  // Replace "YourUser" and "YourRepo" with your actual GitHub username and repository.
  const apiUrl = `https://api.github.com/repos/fuhrerredux/fx-public/contents/${folder}`;
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/vnd.github.v3+json" }
  });
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const data = await response.json();
  return data.filter(item => item.type === "file" && /\.(png|dds)$/i.test(item.name))
    .map(item => ({
      name: item.name,
      path: item.download_url
    }));
}

async function fetchImages() {
  try {
    const folders = {};
    // Fetch images from two folders
    folders["interface/goals"] = await getImages("gfx/interface/goals");
    folders["interface/ideas"] = await getImages("gfx/interface/ideas");
    allImages = folders;
    Object.keys(allImages).forEach(folder => selectedFolders.add(folder));
    updateFolderButtons();
    displayImages();
  } catch (error) {
    console.error("Image loading error:", error);
    showToast('Failed to load images', 5000);
  }
}

/*********************
 *  UI COMPONENTS     *
 **********************/
function updateFolderButtons() {
  const container = document.getElementById("folder-buttons");
  container.innerHTML = '';
  Object.keys(allImages).forEach(folder => {
    const button = document.createElement("button");
    button.textContent = folder;
    button.classList.toggle("active", selectedFolders.has(folder));
    button.addEventListener("click", () => toggleFolder(folder));
    container.appendChild(button);
  });
}

function createImageElement(img, folder) {
  const container = document.createElement('div');
  container.className = 'image-container';

  const imgElement = document.createElement("img");
  imgElement.src = img.path;
  imgElement.alt = img.name;
  imgElement.title = `${img.name}\nFolder: ${folder}`;
  imgElement.classList.add("image-preview");

  // Event listeners
  imgElement.addEventListener("click", () => getSpriteNameAndCopy(img));
  imgElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openModal(img, folder);
  });

  container.appendChild(imgElement);
  return container;
}

/*********************
 *  DISPLAY LOGIC     *
 **********************/
function displayImages() {
  const container = document.getElementById("images");
  container.innerHTML = "";

  const searchQuery = document.getElementById("search").value.toLowerCase();

  Object.keys(allImages).forEach(folder => {
    if (!selectedFolders.has(folder)) return;
    allImages[folder].forEach(img => {
      if (!img.name.toLowerCase().includes(searchQuery)) return;
      const imgElement = createImageElement(img, folder);
      container.appendChild(imgElement);
    });
  });
}

/*********************
 *  USER INTERACTIONS *
 **********************/
function toggleFolder(folderName) {
  if (selectedFolders.has(folderName)) {
    selectedFolders.delete(folderName);
  } else {
    selectedFolders.add(folderName);
  }
  updateFolderButtons();
  displayImages();
}

function searchImages() {
  displayImages();
}

/*********************
 *  MODAL FUNCTIONS   *
 **********************/
function openModal(img, folder) {
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modal-img');
  const modalImgName = document.getElementById('modal-img-name');
  const modalFilePath = document.getElementById('modal-file-path');
  // Optionally, display folder info if desired
  // const modalFolder = document.getElementById('modal-folder');

  modalImg.src = img.path;
  modalImgName.textContent = img.name;
  modalFilePath.textContent = img.path;
  // modalFolder.textContent = folder;

  // Load image dimensions
  const imgObj = new Image();
  imgObj.src = img.path;
  imgObj.onload = function () {
    document.getElementById('modal-dimensions').textContent = `${this.naturalWidth} × ${this.naturalHeight}px`;
  };

  // Fetch and display the sprite name (client-side parsing using Jomini)
  getSpriteName(img.path).then(spriteName => {
    document.getElementById('modal-sprite-name').textContent = spriteName || 'Not found';
  }).catch(() => {
    document.getElementById('modal-sprite-name').textContent = 'Not found';
  });

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

/*********************
 *  SPRITE NAME PARSING  *
 **********************/
async function getSpriteName(textureFile) {
  try {
    console.log(textureFile)

    textureFile = textureFile.substring(textureFile.indexOf("gfx/"));
    // Extract folder path from textureFile (assuming the format remains consistent)
    const folderPath = textureFile.substring(textureFile.indexOf("/") + 1);
    console.log(folderPath, textureFile);
    let matchedSpriteName = null;

    for (const entry of SPRITEFILES_TO_USE) {
      console.log("Checking sprite file:", entry.name);
      if (folderPath.includes(entry.folder)) {
        console.log("Matched folder path:", entry.folder);
        const spriteFileUrl = `interface/${entry.name}`;
        console.log(spriteFileUrl);
        const response = await fetch(spriteFileUrl);
        if (!response.ok) {
          console.error(`Failed to fetch sprite file: ${response.status}`);
          continue;
        }
        const parsedData = await JSON.parse(await response.text());

        console.log(parsedData)
        if (!parsedData.spriteTypes || !parsedData.spriteTypes.spriteType) {
          console.error("Invalid sprite file format");
          continue;
        }
        const foundSprite = parsedData.spriteTypes.spriteType.find(sprite => {
          const spriteTextureFile = sprite.texturefile?.trim().replace(/\\/g, "/");
          return spriteTextureFile === textureFile;
        });
        if (foundSprite) {
          console.log("Matched sprite:", foundSprite.name);
          matchedSpriteName = foundSprite.name;
          break;
        }
      }
    }
    return matchedSpriteName;
  } catch (error) {
    console.error("Error in getSpriteName:", error);
    return null;
  }
}

function getSpriteNameAndCopy(img) {
  getSpriteName(img.path)
    .then(spriteName => {
      console.log("Sprite name:", spriteName);
      if (spriteName) {
        console.log("Sprite name exists:", spriteName);
        navigator.clipboard.writeText(spriteName)
          .then(() => showToast(`Copied: ${spriteName}`))
          .catch(() => showToast('Failed to copy'));
      } else {
        showToast('Sprite name not found');
      }
    })
    .catch((e) => showToast(`Error fetching sprite name: ${e}`));
}

function copySpriteName() {
  const name = document.getElementById('modal-sprite-name').textContent;
  if (name && name !== 'Not found') {
    navigator.clipboard.writeText(name)
      .then(() => showToast('Copied to clipboard'))
      .catch(() => showToast('Failed to copy'));
  }
}

/*********************
 *  THEME MANAGEMENT  *
 **********************/
function toggleTheme() {
  const body = document.body;
  const isDark = body.getAttribute('data-theme') === 'dark';
  body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  document.getElementById('moon-icon').style.display = isDark ? 'none' : 'block';
  document.getElementById('sun-icon').style.display = isDark ? 'block' : 'none';
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme === 'dark');
}

/*********************
 *  TOAST SYSTEM      *
 **********************/
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.querySelector('#toast-message').textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}