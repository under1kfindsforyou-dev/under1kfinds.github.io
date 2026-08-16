/* =========================================================
   SCRIPT.JS — public storefront
   ---------------------------------------------------------
   Products now live in Supabase, not in this file. This
   script fetches every non-hidden product on page load,
   then handles search / category filtering / rendering.
   You should not need to edit this file to manage products —
   use the /admin dashboard instead.
   ========================================================= */

(function () {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");
  const resultsMeta = document.getElementById("resultsMeta");
  const searchInput = document.getElementById("searchInput");
  const categoryScroll = document.getElementById("categoryScroll");

  // Category filter pills. If you add a brand-new category id
  // from the admin dashboard, add its label here too so it has
  // a filter pill on the storefront.
  const CATEGORIES = [
    { id: "trending",   label: "🔥 Trending" },
    { id: "audio",       label: "🎧 Audio" },
    { id: "tech",         label: "📱 Tech" },
    { id: "gadgets",      label: "💻 Gadgets" },
    { id: "student",      label: "🎒 Student Finds" },
    { id: "room-setup",   label: "🏠 Room Setup" },
    { id: "under-500",    label: "💰 Under ₹500" },
    { id: "under-1000",   label: "💸 Under ₹1000" },
  ];

  let allProducts = [];
  let activeCategory = "all";
  let searchTerm = "";

  // ---------- helpers ----------
  function formatINR(num) {
    return "₹" + Number(num).toLocaleString("en-IN");
  }

  function computeDiscount(product) {
    if (product.discount != null) return product.discount;
    if (product.mrp && product.price && product.mrp > product.price) {
      return Math.round(((product.mrp - product.price) / product.mrp) * 100);
    }
    return null;
  }

  function renderStars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function categoryLabel(id) {
    const found = CATEGORIES.find((c) => c.id === id);
    return found ? found.label.replace(/^\p{Emoji}\s*/u, "") : id;
  }

  // ---------- fetch products from Supabase ----------
  async function loadProducts() {
    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("hidden", false)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      errorState.hidden = false;
      return;
    }

    allProducts = data || [];
    buildCategoryPills();
    render();
  }

  // ---------- build category pills ----------
  function buildCategoryPills() {
    categoryScroll.innerHTML = "";

    const allPill = document.createElement("button");
    allPill.className = "cat-pill active";
    allPill.textContent = "✨ All";
    allPill.dataset.cat = "all";
    categoryScroll.appendChild(allPill);

    CATEGORIES.forEach((cat) => {
      const pill = document.createElement("button");
      pill.className = "cat-pill";
      pill.textContent = cat.label;
      pill.dataset.cat = cat.id;
      categoryScroll.appendChild(pill);
    });
  }

  categoryScroll.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-pill");
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    categoryScroll
      .querySelectorAll(".cat-pill")
      .forEach((p) => p.classList.toggle("active", p === btn));
    render();
  });

  // ---------- card markup ----------
  function cardHTML(product) {
    const discount = computeDiscount(product);
    const primaryCategory = product.category && product.category[0];

    return `
      <article class="card">
        <div class="card-media">
          ${
            primaryCategory
              ? `<span class="card-category">${categoryLabel(primaryCategory)}</span>`
              : ""
          }
          ${discount ? `<span class="discount-tag">${discount}% OFF</span>` : ""}
          <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async">
        </div>
        <div class="card-body">
          <h3 class="card-name">${product.name}</h3>
          <p class="card-desc">${product.description || ""}</p>
          ${
            product.rating
              ? `<div class="card-rating"><span class="stars">${renderStars(
                  product.rating
                )}</span><span>${product.rating}${
                  product.reviews ? ` · ${product.reviews.toLocaleString("en-IN")} reviews` : ""
                }</span></div>`
              : ""
          }
          <div class="price-row">
            <span class="price-current">${formatINR(product.price)}</span>
            ${product.mrp ? `<span class="price-mrp">${formatINR(product.mrp)}</span>` : ""}
          </div>
          <a class="cta-btn" href="${product.affiliate_link}" target="_blank" rel="noopener sponsored nofollow">
            View on Amazon
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M7 17L17 7"/><path d="M8 7h9v9"/>
            </svg>
          </a>
          <p class="price-note">Price may change on Amazon.</p>
        </div>
      </article>
    `;
  }

  // ---------- filter + render ----------
  function getFilteredProducts() {
    const term = searchTerm.trim().toLowerCase();

    return allProducts.filter((p) => {
      const matchesCategory =
        activeCategory === "all" ||
        (p.category && p.category.includes(activeCategory));

      if (!matchesCategory) return false;
      if (!term) return true;

      const haystack = [
        p.name,
        p.description,
        ...(p.category || []).map(categoryLabel),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }

  function render() {
    const products = getFilteredProducts();

    grid.innerHTML = products.map(cardHTML).join("");
    emptyState.hidden = products.length !== 0 || allProducts.length === 0;

    resultsMeta.textContent =
      products.length === 0
        ? ""
        : `${products.length} find${products.length === 1 ? "" : "s"}`;

    grid.querySelectorAll(".card").forEach((card, i) => {
      card.style.animationDelay = `${Math.min(i, 8) * 45}ms`;
    });
  }

  // ---------- events ----------
  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchTerm = e.target.value;
      render();
    }, 120);
  });

  // ---------- init ----------
  loadProducts();
})();
