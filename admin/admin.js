/* =========================================================
   ADMIN.JS
   Handles: login/logout, loading products (including hidden
   ones), the add/edit form, image upload to Supabase Storage,
   and delete/hide/feature actions. Every change here writes
   straight to Supabase, so the public storefront picks it up
   on its next page load automatically — no other file to touch.
   ========================================================= */

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
let editingId = null;

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");

async function checkSession() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showDashboard();
  } else {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.textContent = "Logging in…";
  loginBtn.disabled = true;

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { error } = await sb.auth.signInWithPassword({ email, password });

  loginBtn.textContent = "Log in";
  loginBtn.disabled = false;

  if (error) {
    loginError.textContent = "Couldn't log in — check your email and password.";
    loginError.hidden = false;
    return;
  }
  showDashboard();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  loginView.hidden = false;
  dashboardView.hidden = true;
  loginForm.reset();
});

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  loadProducts();
}

// ---------------------------------------------------------
// TABS
// ---------------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
    document.getElementById("panel-" + btn.dataset.tab).hidden = false;
  });
});

function goToTab(name) {
  document.querySelector(`.tab-btn[data-tab="${name}"]`).click();
}

// ---------------------------------------------------------
// LOAD PRODUCTS (admin sees hidden ones too, via RLS policy)
// ---------------------------------------------------------
async function loadProducts() {
  const { data, error } = await sb
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  allProducts = data || [];
  renderOverview();
  renderManageList();
}

// ---------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------
function renderOverview() {
  document.getElementById("statTotal").textContent = allProducts.length;
  document.getElementById("statVisible").textContent = allProducts.filter((p) => !p.hidden).length;
  document.getElementById("statFeatured").textContent = allProducts.filter((p) => p.featured).length;

  const catStats = document.getElementById("categoryStats");
  catStats.innerHTML = CATEGORIES.map((cat) => {
    const count = allProducts.filter((p) => (p.category || []).includes(cat.id)).length;
    return `<span class="chip">${cat.label} <b>${count}</b></span>`;
  }).join("");

  const recent = document.getElementById("recentList");
  const recentProducts = allProducts.slice(0, 5);
  recent.innerHTML = recentProducts.length
    ? recentProducts
        .map(
          (p) => `
      <div class="recent-item">
        <img src="${p.image || ""}" alt="">
        <div>
          <p class="recent-item-name">${p.name}</p>
          <p class="recent-item-meta">₹${p.price}${p.hidden ? " · hidden" : ""}${p.featured ? " · featured" : ""}</p>
        </div>
      </div>`
        )
        .join("")
    : `<p class="recent-item-meta">No products yet — add your first one.</p>`;
}

// ---------------------------------------------------------
// ADD / EDIT FORM
// ---------------------------------------------------------
const catCheckboxWrap = document.getElementById("categoryCheckboxes");
catCheckboxWrap.innerHTML = CATEGORIES.map(
  (cat) => `
  <label>
    <input type="checkbox" value="${cat.id}" class="cat-checkbox">
    <span>${cat.label}</span>
  </label>`
).join("");

const productForm = document.getElementById("productForm");
const formStatus = document.getElementById("formStatus");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

function resetForm() {
  productForm.reset();
  document.getElementById("productId").value = "";
  document.querySelectorAll(".cat-checkbox").forEach((c) => (c.checked = false));
  editingId = null;
  saveBtn.textContent = "Publish";
  cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener("click", () => {
  resetForm();
  formStatus.hidden = true;
});

function fillFormForEdit(product) {
  editingId = product.id;
  document.getElementById("productId").value = product.id;
  document.getElementById("f_name").value = product.name || "";
  document.getElementById("f_imageUrl").value = product.image || "";
  document.getElementById("f_price").value = product.price ?? "";
  document.getElementById("f_mrp").value = product.mrp ?? "";
  document.getElementById("f_discount").value = product.discount ?? "";
  document.getElementById("f_description").value = product.description || "";
  document.getElementById("f_rating").value = product.rating ?? "";
  document.getElementById("f_reviews").value = product.reviews ?? "";
  document.getElementById("f_link").value = product.affiliate_link || "";
  document.getElementById("f_featured").checked = !!product.featured;

  document.querySelectorAll(".cat-checkbox").forEach((c) => {
    c.checked = (product.category || []).includes(c.value);
  });

  saveBtn.textContent = "Save changes";
  cancelEditBtn.hidden = false;
  formStatus.hidden = true;
  goToTab("add");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function uploadImageIfNeeded() {
  const fileInput = document.getElementById("f_imageFile");
  const urlInput = document.getElementById("f_imageUrl");
  const file = fileInput.files[0];

  if (!file) {
    return urlInput.value.trim() || null;
  }

  const ext = file.name.split(".").pop();
  const path = `product-${Date.now()}.${ext}`;

  const { error: uploadError } = await sb.storage.from("product-images").upload(path, file, {
    upsert: false,
  });

  if (uploadError) {
    throw new Error("Image upload failed: " + uploadError.message);
  }

  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formStatus.hidden = true;
  saveBtn.disabled = true;
  const wasEditing = !!editingId;
  saveBtn.textContent = wasEditing ? "Saving…" : "Publishing…";

  try {
    const imageUrl = await uploadImageIfNeeded();

    const selectedCategories = Array.from(document.querySelectorAll(".cat-checkbox:checked")).map(
      (c) => c.value
    );

    const discountVal = document.getElementById("f_discount").value;
    const mrpVal = document.getElementById("f_mrp").value;
    const ratingVal = document.getElementById("f_rating").value;
    const reviewsVal = document.getElementById("f_reviews").value;

    const payload = {
      name: document.getElementById("f_name").value.trim(),
      image: imageUrl,
      price: Number(document.getElementById("f_price").value),
      mrp: mrpVal ? Number(mrpVal) : null,
      discount: discountVal ? Number(discountVal) : null,
      description: document.getElementById("f_description").value.trim(),
      category: selectedCategories,
      rating: ratingVal ? Number(ratingVal) : null,
      reviews: reviewsVal ? Number(reviewsVal) : null,
      affiliate_link: document.getElementById("f_link").value.trim(),
      featured: document.getElementById("f_featured").checked,
    };

    let error;
    if (wasEditing) {
      ({ error } = await sb.from("products").update(payload).eq("id", editingId));
    } else {
      payload.hidden = false;
      ({ error } = await sb.from("products").insert([payload]));
    }

    if (error) throw new Error(error.message);

    resetForm();
    formStatus.textContent = wasEditing ? "Changes saved. The public store is updated." : "Product published to the store.";
    formStatus.className = "form-status ok";
    formStatus.hidden = false;

    await loadProducts();
  } catch (err) {
    formStatus.textContent = err.message || "Something went wrong. Please try again.";
    formStatus.className = "form-status err";
    formStatus.hidden = false;
  } finally {
    saveBtn.disabled = false;
    if (!wasEditing || editingId === null) saveBtn.textContent = "Publish";
  }
});

// ---------------------------------------------------------
// MANAGE LIST
// ---------------------------------------------------------
const manageList = document.getElementById("manageList");
const manageSearch = document.getElementById("manageSearch");

function renderManageList() {
  const term = manageSearch.value.trim().toLowerCase();
  const items = allProducts.filter((p) => !term || p.name.toLowerCase().includes(term));

  manageList.innerHTML = items.length
    ? items.map(manageCardHTML).join("")
    : `<p class="recent-item-meta">No products found.</p>`;

  items.forEach((p) => {
    document.getElementById(`edit-${p.id}`)?.addEventListener("click", () => fillFormForEdit(p));
    document.getElementById(`hide-${p.id}`)?.addEventListener("click", () => toggleField(p.id, "hidden", !p.hidden));
    document.getElementById(`feature-${p.id}`)?.addEventListener("click", () => toggleField(p.id, "featured", !p.featured));
    document.getElementById(`delete-${p.id}`)?.addEventListener("click", () => deleteProduct(p.id, p.name));
  });
}

function manageCardHTML(p) {
  return `
    <div class="manage-card ${p.hidden ? "is-hidden" : ""}">
      <div class="manage-card-top">
        <img src="${p.image || ""}" alt="">
        <div>
          <p class="manage-card-name">${p.name}</p>
          <p class="manage-card-price">₹${p.price}</p>
          <div class="manage-card-tags">
            ${p.hidden ? `<span class="tag-pill">Hidden</span>` : `<span class="tag-pill on">Visible</span>`}
            ${p.featured ? `<span class="tag-pill on">Featured</span>` : ""}
          </div>
        </div>
      </div>
      <div class="manage-card-actions">
        <button class="btn btn-small btn-neutral" id="edit-${p.id}">Edit</button>
        <button class="btn btn-small btn-cyan-outline" id="feature-${p.id}">${p.featured ? "Unfeature" : "Feature"}</button>
        <button class="btn btn-small btn-neutral" id="hide-${p.id}">${p.hidden ? "Show" : "Hide"}</button>
        <button class="btn btn-small btn-danger" id="delete-${p.id}">Delete</button>
      </div>
    </div>`;
}

manageSearch.addEventListener("input", renderManageList);

async function toggleField(id, field, value) {
  const { error } = await sb.from("products").update({ [field]: value }).eq("id", id);
  if (error) {
    alert("Couldn't update product: " + error.message);
    return;
  }
  await loadProducts();
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) {
    alert("Couldn't delete product: " + error.message);
    return;
  }
  await loadProducts();
}

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
checkSession();
