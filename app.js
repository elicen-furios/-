const API_SOURCE =
"https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";

const API_SOURCE_BACKUP =
"https://cdn.jsdelivr.net/gh/public-apis/public-apis@master/README.md";

let APIs = [];
let filtered = [];

let currentPage = 1;

let currentCategory = "All";
let currentView = "all";
let currentFilter = "all";

let currentAPI = null;

const PER_PAGE = 18;


function $(id) {
  return document.getElementById(id);
}


/* =========================
   FETCH DATA
========================= */

async function getData(url) {

  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      "HTTP " + response.status
    );
  }

  return response.text();
}


async function loadAPIs() {

  try {

    let markdown;

    try {

      markdown =
        await getData(API_SOURCE);

    } catch {

      markdown =
        await getData(API_SOURCE_BACKUP);

    }

    APIs =
      parsePublicApis(markdown);

    $("loading").style.display =
      "none";

    updateStats();

    createCategories();

    applyFilters();

  } catch (error) {

    $("loading").innerHTML = `
      <h3>Unable to load APIs</h3>

      <p>
        Internet connection or GitHub
        access may be unavailable.
      </p>

      <button
        onclick="location.reload()"
        class="primaryBtn">
        Try Again
      </button>
    `;

    console.error(error);

  }

}


/* =========================
   PARSE GITHUB README
========================= */

function parsePublicApis(markdown) {

  const lines =
    markdown.split(/\r?\n/);

  let category = "";

  const result = [];

  for (const line of lines) {

    const text =
      line.trim();

    if (text.startsWith("### ")) {

      category =
        cleanText(
          text.substring(4)
        );

      continue;
    }

    if (!text.startsWith("|")) {
      continue;
    }

    if (
      text.includes(":---") ||
      text.toLowerCase()
        .includes("|api|")
    ) {
      continue;
    }

    const columns =
      splitTable(text);

    if (columns.length < 5) {
      continue;
    }

    const apiColumn =
      columns[0];

    const match =
      apiColumn.match(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/
      );

    let name = "";
    let url = "";

    if (match) {

      name = match[1];
      url = match[2];

    } else {

      const urlMatch =
        apiColumn.match(
          /https?:\/\/\S+/
        );

      url =
        urlMatch
          ? urlMatch[0]
          : "#";

      name =
        apiColumn
          .replace(url, "");

    }

    result.push({

      name: cleanText(name),

      description:
        cleanText(columns[1])
        || "No description available.",

      auth:
        cleanText(columns[2])
        || "No",

      https:
        cleanText(columns[3])
        || "No",

      cors:
        cleanText(columns[4])
        || "Unknown",

      category:
        category || "Other",

      url

    });

  }

  const unique = [];

  const seen =
    new Set();

  for (const api of result) {

    const key =
      api.name +
      api.url +
      api.category;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    unique.push(api);
  }

  return unique;
}


function splitTable(row) {

  let value =
    row.trim();

  if (value.startsWith("|")) {
    value = value.substring(1);
  }

  if (value.endsWith("|")) {
    value =
      value.substring(
        0,
        value.length - 1
      );
  }

  return value
    .split("|")
    .map(x => x.trim());
}


function cleanText(value) {

  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    )
    .trim();

}


/* =========================
   STATS
========================= */

function updateStats() {

  $("totalApis").textContent =
    APIs.length;

  $("allCount").textContent =
    APIs.length;

  const categories =
    new Set(
      APIs.map(
        api => api.category
      )
    );

  $("totalCategories").textContent =
    categories.size;

  $("httpsApis").textContent =
    APIs.filter(
      api =>
        api.https.toLowerCase()
        === "yes"
    ).length;

  $("noAuthApis").textContent =
    APIs.filter(
      api =>
        ["no", "none", ""]
          .includes(
            api.auth.toLowerCase()
          )
    ).length;

}


/* =========================
   CATEGORIES
========================= */

function createCategories() {

  const count = {};

  APIs.forEach(api => {

    count[api.category] =
      (count[api.category] || 0) + 1;

  });

  const sorted =
    Object.entries(count)
      .sort((a,b) =>
        a[0].localeCompare(b[0])
      );

  $("categories").innerHTML =
    sorted.map(
      ([category,total]) => `
        <button
          class="sideBtn categoryButton"
          data-category="${escapeHTML(category)}">

          ${escapeHTML(category)}

          <span>${total}</span>

        </button>
      `
    ).join("");

}


/* =========================
   FILTER
========================= */

function applyFilters() {

  const input =
    $("searchInput")
      .value
      .toLowerCase()
      .trim();

  const favorites =
    JSON.parse(
      localStorage.getItem(
        "favorites"
      ) || "[]"
    );

  const recent =
    JSON.parse(
      localStorage.getItem(
        "recent"
      ) || "[]"
    );


  filtered =
    APIs.filter(api => {

      if (
        currentView ===
        "favorites"
      ) {

        if (
          !favorites.includes(
            api.url
          )
        ) {
          return false;
        }

      }


      if (
        currentView ===
        "recent"
      ) {

        if (
          !recent.includes(
            api.url
          )
        ) {
          return false;
        }

      }


      if (
        currentCategory !==
        "All"
      ) {

        if (
          api.category !==
          currentCategory
        ) {
          return false;
        }

      }


      if (
        currentFilter ===
        "noauth"
      ) {

        if (
          !["no","none",""]
            .includes(
              api.auth.toLowerCase()
            )
        ) {
          return false;
        }

      }


      if (
        currentFilter ===
        "https"
      ) {

        if (
          api.https
            .toLowerCase()
          !== "yes"
        ) {
          return false;
        }

      }


      if (
        currentFilter ===
        "cors"
      ) {

        if (
          api.cors
            .toLowerCase()
          !== "yes"
        ) {
          return false;
        }

      }


      if (!input) {
        return true;
      }


      const searchable = [

        api.name,

        api.description,

        api.category,

        api.auth,

        api.https,

        api.cors

      ]
      .join(" ")
      .toLowerCase();


      return searchable
        .includes(input);

    });


  currentPage = 1;

  renderAPIs();

}


/* =========================
   RENDER
========================= */

function renderAPIs() {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
        PER_PAGE
      )
    );

  const start =
    (currentPage - 1)
    * PER_PAGE;

  const items =
    filtered.slice(
      start,
      start + PER_PAGE
    );


  $("sectionTitle")
    .textContent =
      currentView === "favorites"
        ? "Favorites"
        : currentView === "recent"
        ? "Recently Viewed"
        : currentCategory;


  $("resultText")
    .textContent =
      filtered.length +
      " API" +
      (filtered.length === 1
        ? ""
        : "s") +
      " found";


  $("apiGrid").innerHTML =
    items.map(
      (api,index) =>
        createCard(
          api,
          start + index
        )
    ).join("");


  renderPagination(
    totalPages
  );

}


function createCard(api,index) {

  const favorites =
    JSON.parse(
      localStorage.getItem(
        "favorites"
      ) || "[]"
    );

  const saved =
    favorites.includes(
      api.url
    );

  const noAuth =
    ["no","none",""]
      .includes(
        api.auth.toLowerCase()
      );

  return `

    <article
      class="apiCard"
      data-index="${index}">

      <div class="apiTop">

        <div>

          <h3>
            ${escapeHTML(api.name)}
          </h3>

          <div class="category">
            ${escapeHTML(
              api.category
            )}
          </div>

        </div>

        <button
          class="star
          ${saved ? "saved" : ""}"
          data-star="${escapeHTML(api.url)}">

          ${saved ? "★" : "☆"}

        </button>

      </div>


      <p class="description">
        ${escapeHTML(
          api.description
        )}
      </p>


      <div class="badges">

        <span
          class="badge
          ${noAuth ? "good" : ""}">

          Auth:
          ${escapeHTML(api.auth)}

        </span>

        <span
          class="badge
          ${
            api.https.toLowerCase()
            === "yes"
              ? "good"
              : ""
          }">

          HTTPS:
          ${escapeHTML(api.https)}

        </span>

        <span class="badge">

          CORS:
          ${escapeHTML(api.cors)}

        </span>

      </div>


      <div class="apiFooter">

        <span>
          ${escapeHTML(
            api.url
              .replace(
                /^https?:\/\//,
                ""
              )
              .substring(0,30)
          )}
        </span>

        <b>
          Details →
        </b>

      </div>

    </article>

  `;

}


/* =========================
   PAGINATION
========================= */

function renderPagination(
  totalPages
) {

  const container =
    $("pagination");

  container.innerHTML = "";

  for (
    let i = 1;
    i <= totalPages;
    i++
  ) {

    if (
      totalPages > 10 &&
      Math.abs(i - currentPage) > 2 &&
      i !== 1 &&
      i !== totalPages
    ) {
      continue;
    }

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "page" +
      (
        i === currentPage
          ? " active"
          : ""
      );

    button.textContent =
      i;

    button.onclick = () => {

      currentPage = i;

      renderAPIs();

      $("directory")
        .scrollIntoView({
          behavior: "smooth"
        });

    };

    container.appendChild(
      button
    );

  }

}


/* =========================
   API POPUP
========================= */

function openAPI(api) {

  currentAPI = api;

  saveRecent(
    api.url
  );

  $("modalCategory")
    .textContent =
      api.category;

  $("modalName")
    .textContent =
      api.name;

  $("modalDescription")
    .textContent =
      api.description;

  $("modalUrl")
    .textContent =
      api.url;

  $("visitBtn").href =
    api.url;

  $("testUrl").value =
    api.url;


  $("modalDetails")
    .innerHTML = `

      <div class="detail">
        <small>Authentication</small>
        <b>${escapeHTML(
          api.auth
        )}</b>
      </div>

      <div class="detail">
        <small>HTTPS</small>
        <b>${escapeHTML(
          api.https
        )}</b>
      </div>

      <div class="detail">
        <small>CORS</small>
        <b>${escapeHTML(
          api.cors
        )}</b>
      </div>

      <div class="detail">
        <small>Category</small>
        <b>${escapeHTML(
          api.category
        )}</b>
      </div>

    `;


  updateFavoriteButton();

  $("tester")
    .classList
    .remove("show");

  $("modal")
    .classList
    .add("show");

  document.body.style.overflow =
    "hidden";

}


function closeModal() {

  $("modal")
    .classList
    .remove("show");

  document.body.style.overflow =
    "";

}


/* =========================
   FAVORITES
========================= */

function toggleFavorite(url) {

  let favorites =
    JSON.parse(
      localStorage.getItem(
        "favorites"
      ) || "[]"
    );


  if (
    favorites.includes(url)
  ) {

    favorites =
      favorites.filter(
        x => x !== url
      );

    showToast(
      "Removed from favorites"
    );

  } else {

    favorites.push(url);

    showToast(
      "Added to favorites"
    );

  }


  localStorage.setItem(
    "favorites",
    JSON.stringify(
      favorites
    )
  );


  $("favCount")
    .textContent =
      favorites.length;


  updateFavoriteButton();

  applyFilters();

}


function updateFavoriteButton() {

  if (!currentAPI) {
    return;
  }

  const favorites =
    JSON.parse(
      localStorage.getItem(
        "favorites"
      ) || "[]"
    );

  $("favBtn")
    .textContent =
      favorites.includes(
        currentAPI.url
      )
        ? "Remove Favorite"
        : "Add to Favorites";

}


/* =========================
   RECENT
========================= */

function saveRecent(url) {

  let recent =
    JSON.parse(
      localStorage.getItem(
        "recent"
      ) || "[]"
    );

  recent =
    recent.filter(
      x => x !== url
    );

  recent.unshift(url);

  recent =
    recent.slice(0,20);

  localStorage.setItem(
    "recent",
    JSON.stringify(
      recent
    )
  );

  $("recentCount")
    .textContent =
      recent.length;

}


/* =========================
   API TESTER
========================= */

async function testAPI() {

  const url =
    $("testUrl")
      .value
      .trim();


  if (!url) {

    showToast(
      "Enter an API URL"
    );

    return;
  }


  $("responseBox")
    .textContent =
      "Sending request...";


  const started =
    Date.now();


  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    const text =
      await response.text();


    let output =
      text;


    try {

      output =
        JSON.stringify(
          JSON.parse(text),
          null,
          2
        );

    } catch {}


    const time =
      Date.now() -
      started;


    $("responseBox")
      .textContent =

      `HTTP ${response.status}
${response.statusText}

Time: ${time} ms

${output.substring(
  0,
  15000
)}`;

  } catch (error) {

    $("responseBox")
      .textContent =

`REQUEST FAILED

${error.message}

Possible reasons:

• CORS blocked the request
• API requires authentication
• Invalid URL
• Rate limit
• Internet problem`;

  }

}


/* =========================
   COPY
========================= */

$("copyBtn").onclick =
  async () => {

    try {

      await navigator
        .clipboard
        .writeText(
          currentAPI.url
        );

      showToast(
        "API URL copied"
      );

    } catch {

      showToast(
        "Copy failed"
      );

    }

  };


/* =========================
   EVENTS
========================= */

$("apiGrid").onclick =
  event => {

    const star =
      event.target.closest(
        "[data-star]"
      );

    if (star) {

      event.stopPropagation();

      toggleFavorite(
        star.dataset.star
      );

      return;
    }


    const card =
      event.target.closest(
        ".apiCard"
      );

    if (!card) {
      return;
    }


    const index =
      Number(
        card.dataset.index
      );


    const start =
      (currentPage - 1)
      * PER_PAGE;


    openAPI(
      filtered[
        start + index
      ]
    );

  };


$("searchInput").oninput =
  applyFilters;


document
  .querySelectorAll(
    ".filter"
  )
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(
          ".filter"
        )
        .forEach(
          x =>
            x.classList
             .remove(
               "active"
             )
        );

      button.classList
        .add("active");

      currentFilter =
        button.dataset.filter;

      applyFilters();

    };

  });


document
  .querySelectorAll(
    "[data-view]"
  )
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(
          ".sideBtn"
        )
        .forEach(
          x =>
            x.classList
             .remove(
               "active"
             )
        );

      button.classList
        .add("active");

      currentView =
        button.dataset.view;

      currentCategory =
        "All";

      applyFilters();

    };

  });


$("categories").onclick =
  event => {

    const button =
      event.target.closest(
        "[data-category]"
      );

    if (!button) {
      return;
    }

    document
      .querySelectorAll(
        ".sideBtn"
      )
      .forEach(
        x =>
          x.classList
           .remove(
             "active"
           )
      );

    button.classList
      .add("active");

    currentCategory =
      button.dataset.category;

    currentView =
      "category";

    applyFilters();

  };


$("closeModal").onclick =
  closeModal;


$("modal").onclick =
  event => {

    if (
      event.target ===
      $("modal")
    ) {
      closeModal();
    }

  };


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {
      closeModal();
    }

    if (
      (event.ctrlKey ||
       event.metaKey) &&
      event.key.toLowerCase()
      === "k"
    ) {

      event.preventDefault();

      $("searchInput")
        .focus();

    }

  }
);


$("favBtn").onclick =
  () =>
    toggleFavorite(
      currentAPI.url
    );


$("testerBtn").onclick =
  () =>
    $("tester")
      .classList
      .toggle("show");


$("sendBtn").onclick =
  testAPI;


/* =========================
   THEME
========================= */

$("themeBtn").onclick =
  () => {

    document.body
      .classList
      .toggle("light");

    localStorage.setItem(
      "theme",
      document.body.classList.contains(
        "light"
      )
        ? "light"
        : "dark"
    );

  };


if (
  localStorage.getItem(
    "theme"
  ) === "light"
) {

  document.body
    .classList
    .add("light");

}


/* =========================
   MUSIC
========================= */

$("musicBtn").onclick =
  async () => {

    const music =
      $("music");

    try {

      if (
        music.paused
      ) {

        await music.play();

        $("musicBtn")
          .textContent =
          "♫ On";

      } else {

        music.pause();

        $("musicBtn")
          .textContent =
          "♫ Off";

      }

    } catch {

      showToast(
        "Put music.mp3 beside index.html"
      );

    }

  };


/* =========================
   MOBILE SIDEBAR
========================= */

$("menuBtn").onclick =
  () =>
    $("sidebar")
      .classList
      .toggle("open");


$("exploreBtn").onclick =
  () =>
    $("directory")
      .scrollIntoView({
        behavior: "smooth"
      });


/* =========================
   HELPERS
========================= */

function escapeHTML(value) {

  return String(value || "")
    .replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char])
    );

}


function showToast(message) {

  const toast =
    $("toast");

  toast.textContent =
    message;

  toast.classList
    .add("show");

  clearTimeout(
    window.toastTimer
  );

  window.toastTimer =
    setTimeout(
      () =>
        toast.classList
          .remove("show"),
      1800
    );

}


/* START */

const favorites =
  JSON.parse(
    localStorage.getItem(
      "favorites"
    ) || "[]"
  );

const recent =
  JSON.parse(
    localStorage.getItem(
      "recent"
    ) || "[]"
  );

$("favCount")
  .textContent =
  favorites.length;

$("recentCount")
  .textContent =
  recent.length;

loadAPIs();