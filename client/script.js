const els = {
  form: document.querySelector("#review-form"),
  formTitle: document.querySelector("#form-title"),
  cancelEdit: document.querySelector("#cancel-edit"),
  submitBtn: document.querySelector("#submit-btn"),
  list: document.querySelector("#reviews"),
  template: document.querySelector("#card-template"),
  featured: document.querySelector("#featured"),
  search: document.querySelector("#search"),
  sort: document.querySelector("#sort"),
  stats: document.querySelector("#stats"),
  modal: document.querySelector("#review-modal"),
  modalMeta: document.querySelector("#modal-meta"),
  modalTitle: document.querySelector("#modal-title"),
  modalExcerpt: document.querySelector("#modal-excerpt"),
  modalTags: document.querySelector("#modal-tags"),
  modalBody: document.querySelector("#modal-body"),
  closeModal: document.querySelector("#close-modal"),
};

const fields = ["title", "film", "director", "rating", "watchDate", "tags", "excerpt", "body"];

let reviews = [];
let editingId = null;

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const readingMinutes = (text) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));

const renderTags = (container, tags) => {
  container.innerHTML = "";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = `#${tag}`;
    container.appendChild(chip);
  });
};

const setEditingState = (review = null) => {
  editingId = review?.id || null;
  els.formTitle.textContent = editingId ? "Edit review" : "New review";
  els.submitBtn.textContent = editingId ? "Save changes" : "Publish review";
  els.cancelEdit.classList.toggle("hidden", !editingId);

  if (!review) {
    els.form.reset();
    return;
  }

  fields.forEach((field) => {
    if (field === "tags") {
      els.form.elements[field].value = review.tags.join(", ");
      return;
    }
    els.form.elements[field].value = review[field];
  });

  document.querySelector("#composer").scrollIntoView({ behavior: "smooth", block: "start" });
};

const openModal = (review) => {
  els.modalMeta.textContent = `${review.film} · ${review.director} · Watched ${formatDate(review.watchDate)}`;
  els.modalTitle.textContent = review.title;
  els.modalExcerpt.textContent = review.excerpt;
  els.modalBody.textContent = review.body;
  renderTags(els.modalTags, review.tags);
  els.modal.showModal();
};

const renderStats = (items) => {
  const avg = items.length ? (items.reduce((sum, r) => sum + Number(r.rating), 0) / items.length).toFixed(1) : "0.0";
  const latest = items.length ? formatDate(items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt) : "—";
  els.stats.innerHTML = `
    <div class="stat"><b>${items.length}</b><p>Published Reviews</p></div>
    <div class="stat"><b>${avg}/10</b><p>Average Rating</p></div>
    <div class="stat"><b>${latest}</b><p>Last Published</p></div>
  `;
};

const renderFeatured = (items) => {
  if (!items.length) {
    els.featured.innerHTML = "";
    return;
  }

  const top = items.slice().sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  els.featured.innerHTML = `
    <article class="featured">
      <strong>Featured Review</strong>
      <h3>${top.title}</h3>
      <p>${top.film} · Directed by ${top.director}</p>
      <p>${top.excerpt}</p>
      <small>${top.rating}/10 · ${readingMinutes(top.body)} min read</small>
    </article>
  `;
};

const filterAndSort = () => {
  const query = els.search.value.trim().toLowerCase();
  const sort = els.sort.value;

  let next = reviews.filter((r) => {
    if (!query) return true;
    return [r.title, r.film, r.director, r.excerpt, r.tags.join(" ")].join(" ").toLowerCase().includes(query);
  });

  return next.sort((a, b) => {
    if (sort === "rating") return Number(b.rating) - Number(a.rating);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

const render = () => {
  const items = filterAndSort();
  els.list.innerHTML = "";
  renderStats(reviews);
  renderFeatured(reviews);

  if (!items.length) {
    els.list.innerHTML = '<p class="empty">No matching reviews found.</p>';
    return;
  }

  items.forEach((review) => {
    const node = els.template.content.cloneNode(true);
    node.querySelector(".card-meta").textContent = `${review.film} · ${review.director} · ${formatDate(review.createdAt)}`;
    node.querySelector(".card-title").textContent = review.title;
    node.querySelector(".card-excerpt").textContent = review.excerpt;
    node.querySelector(".rating-pill").textContent = `${review.rating}/10 · ${readingMinutes(review.body)} min read`;
    renderTags(node.querySelector(".card-tags"), review.tags);

    node.querySelector(".read-btn").addEventListener("click", () => openModal(review));
    node.querySelector(".edit-btn").addEventListener("click", () => setEditingState(review));
    node.querySelector(".delete-btn").addEventListener("click", async () => {
      const ok = window.confirm("Delete this review?");
      if (!ok) return;
      await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      await loadReviews();
      if (editingId === review.id) setEditingState(null);
    });

    els.list.appendChild(node);
  });
};

const normalizePayload = (data) => ({
  title: String(data.get("title") || "").trim(),
  film: String(data.get("film") || "").trim(),
  director: String(data.get("director") || "").trim(),
  rating: Number(data.get("rating")),
  watchDate: String(data.get("watchDate") || "").trim(),
  tags: String(data.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6),
  excerpt: String(data.get("excerpt") || "").trim(),
  body: String(data.get("body") || "").trim(),
});

const isValidPayload = (payload) => {
  if (
    !payload.title ||
    !payload.film ||
    !payload.director ||
    !payload.watchDate ||
    !payload.excerpt ||
    !payload.body ||
    Number.isNaN(payload.rating)
  ) {
    return false;
  }
  return payload.rating >= 1 && payload.rating <= 10;
};

const loadReviews = async () => {
  const response = await fetch("/api/reviews");
  reviews = await response.json();
  render();
};

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = normalizePayload(new FormData(els.form));
  if (!isValidPayload(payload)) return;

  if (editingId) {
    await fetch(`/api/reviews/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  setEditingState(null);
  await loadReviews();
});

els.cancelEdit.addEventListener("click", () => setEditingState(null));
els.search.addEventListener("input", render);
els.sort.addEventListener("change", render);
els.closeModal.addEventListener("click", () => els.modal.close());
els.modal.addEventListener("click", (event) => {
  if (event.target === els.modal) {
    els.modal.close();
  }
});

loadReviews();
