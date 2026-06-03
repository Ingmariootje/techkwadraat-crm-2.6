function renderRelaties(state, type) {
  const label = typeLabel(type);
  const active = state.selectedRelationId ? state.organizations.find(o => o.id === state.selectedRelationId) : null;

  if (active && state.selectedRelationSection === "notes") return renderRelationNotesPage(active, type);
  if (active) return renderRelationDetail(active, type);

  const baseItems = state.organizations.filter(org => org.type === type);
  const cities = uniqueValues(baseItems.map(org => org.city || cityFromAddress(org.address)));
  const foundations = uniqueValues(baseItems.map(org => org.foundation));

  const items = baseItems.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(state.search.toLowerCase());
    const city = org.city || cityFromAddress(org.address);

    const matchesCity =
      state.relationCityFilter === "alles" ||
      city === state.relationCityFilter;

    const matchesFoundation =
      type !== "school" ||
      state.relationFoundationFilter === "alles" ||
      (org.foundation || "") === state.relationFoundationFilter;

    return matchesSearch && matchesCity && matchesFoundation;
  });

  return `
    <section class="toolbar compact-toolbar">
      <div class="toolbar-left relation-filter-row">
        <input id="relation-search" class="search-input" placeholder="Zoek ${label}..." value="${escapeHtml(state.search)}">

        <select id="city-filter" class="filter-select small-filter">
          <option value="alles">Alle plaatsen</option>
          ${cities.map(city => `
            <option value="${escapeHtml(city)}" ${state.relationCityFilter === city ? "selected" : ""}>
              ${escapeHtml(city)}
            </option>
          `).join("")}
        </select>

        ${type === "school" ? `
          <select id="foundation-filter" class="filter-select small-filter">
            <option value="alles">Alle stichtingen</option>
            ${foundations.map(foundation => `
              <option value="${escapeHtml(foundation)}" ${state.relationFoundationFilter === foundation ? "selected" : ""}>
                ${escapeHtml(foundation)}
              </option>
            `).join("")}
          </select>
        ` : ""}
      </div>
    </section>

    <section class="card-grid ${type === "school" ? "school-card-grid" : ""}">
      ${items.map(org => relationCard(org)).join("") || `<p class="empty">Geen ${typePluralLabel(type)} gevonden.</p>`}
    </section>
  `;
}

function relationCard(org) {
  const appointments = state.appointments.filter(a => a.organization_id === org.id);
  const future = appointments
    .filter(a => a.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const notes = state.notes.filter(n => n.organization_id === org.id);
  const status = future ? "actief" : appointments.length ? "nieuw" : "leeg";
  const city = org.city || cityFromAddress(org.address);

  const relationExtra = `
    <p class="school-meta-line">
      ${escapeHtml(city || "Plaats onbekend")}
      ${org.type === "school" && org.foundation ? ` · ${escapeHtml(org.foundation)}` : ""}
    </p>
  `;

  return `
    <article class="crm-card relation-card ${org.type === "school" ? "school-relation-card" : ""} status-${status}" onclick="openRelationDetail('${org.id}')">
      <div class="card-logo ${org.type}">${org.type.toUpperCase()}</div>
      <h2>${escapeHtml(org.name)}</h2>

      ${relationExtra}

      <p class="card-meta compact-meta">
        Contact: ${escapeHtml(org.contact_person) || "-"}<br>
        Telefoon: ${escapeHtml(org.phone) || "-"}
      </p>

      <div class="note-card compact-planning">
        <strong>${future ? "Volgende activiteit" : "Planning"}</strong>
        <p class="card-meta">
          ${future ? `${formatDate(future.date)} · ${escapeHtml(future.title)}` : "Nog niets gepland"}
        </p>
      </div>

      <p class="card-meta">${notes.length} notitie(s) · ${appointments.length} activiteit(en)</p>

      <div class="card-actions">
        <button class="danger small-button" onclick="event.stopPropagation(); deleteRecord('organizations', '${org.id}')">
          Verwijderen
        </button>
      </div>
    </article>
  `;
}

function renderRelationDetail(org, type) {
  const appointments = state.appointments
    .filter(a => a.organization_id === org.id)
    .sort((a, b) => `${a.date} ${a.start_time || ""}`.localeCompare(`${b.date} ${b.start_time || ""}`));

  const notes = state.notes.filter(n => n.organization_id === org.id);
  const future = appointments.filter(a => a.date >= new Date().toISOString().slice(0, 10));
  const city = org.city || cityFromAddress(org.address);

  return `
    <button class="ghost" onclick="closeRelationDetail()">← Terug naar ${typePluralLabel(type)}</button>
    <br><br>

    <section class="detail-layout detail-layout-compact">
      <div class="panel relation-main-panel">
        <div class="detail-title">
          <div>
            <h2>${escapeHtml(org.name)}</h2>
            <p class="page-subtitle">${typeLabel(type)}detail</p>
          </div>
          <span class="event-label ${future.length ? "label-green" : "label-orange"}">
            ${future.length ? "ingepland" : "nog plannen"}
          </span>
        </div>

        <div class="contact-summary contact-summary-compact">
          <p><strong>Contactpersoon</strong><br>${escapeHtml(org.contact_person) || "-"}</p>
          <p><strong>Telefoon</strong><br>${org.phone ? `<a href="tel:${phoneHref(org.phone)}">${escapeHtml(org.phone)}</a>` : "-"}</p>
          <p><strong>Mail</strong><br>${org.email ? `<a href="mailto:${escapeHtml(org.email)}">${escapeHtml(org.email)}</a>` : "-"}</p>
          <p><strong>Adres</strong><br>${escapeHtml(org.address) || "-"}</p>
          <p><strong>Plaats</strong><br>${escapeHtml(city) || "-"}</p>
          ${type === "school" ? `<p><strong>Stichting</strong><br>${escapeHtml(org.foundation) || "-"}</p><p><strong>Directeur</strong><br>${escapeHtml(org.director) || "-"}</p>` : ""}
        </div>

        <div class="kpi-grid">
          <div class="kpi"><strong>${appointments.length}</strong><span>Activiteiten</span></div>
          <div class="kpi"><strong>${future.length}</strong><span>Komend</span></div>
          <button type="button" class="kpi kpi-button" onclick="openRelationNotes('${org.id}')">
            <strong>${notes.length}</strong>
            <span>Notities</span>
          </button>
        </div>

        <div class="panel-header">Activiteiten</div>

        ${appointments.map(a => `
          <div class="agenda-item">
            <strong>${escapeHtml(a.title)}</strong>
            ${formatDate(a.date)} · ${cleanTime(a.start_time)} - ${cleanTime(a.end_time)}<br>
            <span>${escapeHtml(getTeamNames(a.team_member_ids))}</span><br>
            <span class="event-label ${activityClass(a.activity_type)}">${escapeHtml(a.activity_type)}</span>
          </div>
        `).join("") || `<p class="empty">Nog geen activiteiten.</p>`}
      </div>

      <aside class="panel notes-side-panel">
        <div class="panel-header">Laatste notities</div>

        <div class="notes-action-row">
          <button type="button" onclick="openNoteModal('${org.id}')">+ Nieuwe notitie</button>
          <button type="button" class="ghost" onclick="openRelationNotes('${org.id}')">Alle notities</button>
        </div>

        ${notes.slice(0, 4).map(note => `
          <button type="button" class="note-row note-row-large note-clickable" onclick="openRelationNotes('${org.id}')">
            <div class="note-date">${formatDate(note.created_at.slice(0, 10))}</div>
            <div class="note-text">${escapeHtml(note.text)}</div>
          </button>
        `).join("") || `<p class="empty">Nog geen notities.</p>`}
      </aside>
    </section>
  `;
}

function renderRelationNotesPage(org, type) {
  const notes = state.notes.filter(n => n.organization_id === org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button>
    <br><br>

    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div>
            <h2>Notities en contactmomenten</h2>
            <p class="page-subtitle">${escapeHtml(org.name)}</p>
          </div>
          <button type="button" onclick="openNoteModal('${org.id}')">+ Nieuwe notitie</button>
        </div>

        <div class="notes-page-list">
          ${notes.map(note => `
            <article class="note-row note-row-page">
              <div class="note-date">${formatDateLong(note.created_at ? note.created_at.slice(0, 10) : "")}</div>
              <div class="note-text">${escapeHtml(note.text)}</div>
              <div class="card-actions">
                <button class="danger small-button" onclick="deleteRecord('notes', '${note.id}')">Verwijderen</button>
              </div>
            </article>
          `).join("") || `<p class="empty">Nog geen notities.</p>`}
        </div>
      </div>
    </section>
  `;
}

function openRelationDetail(id) {
  state.selectedRelationId = id;
  render();
}

function closeRelationDetail() {
  state.selectedRelationId = null;
  state.selectedRelationSection = null;
  render();
}

function openRelationNotes(id) {
  state.selectedRelationId = id;
  state.selectedRelationSection = "notes";
  render();
}

function backToRelationDetail() {
  state.selectedRelationSection = null;
  render();
}

function bindRelatieActions() {
  const search = document.getElementById("relation-search");
  if (search) {
    search.addEventListener("input", event => {
      state.search = event.target.value;
      render();
    });
  }

  const cityFilter = document.getElementById("city-filter");
  if (cityFilter) {
    cityFilter.addEventListener("change", event => {
      state.relationCityFilter = event.target.value;
      render();
    });
  }

  const foundationFilter = document.getElementById("foundation-filter");
  if (foundationFilter) {
    foundationFilter.addEventListener("change", event => {
      state.relationFoundationFilter = event.target.value;
      render();
    });
  }
}

function openRelationModal(type) {
  openModal(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Nieuwe ${typeLabel(type)}</h2>
            <p class="page-subtitle">Incidenteel beheer, daarom in een pop-up.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>

        <form id="relation-form">
          <div class="modal-content form-grid">
            <input name="name" class="form-input full" placeholder="Naam" required>
            <input name="contact_person" class="form-input" placeholder="Contactpersoon">
            <input name="director" class="form-input" placeholder="Directeur">
            <input name="phone" class="form-input" placeholder="Telefoon">
            <input name="email" class="form-input" placeholder="E-mail">
            <input name="city" class="form-input" placeholder="Plaats">
            ${type === "school" ? `<input name="foundation" class="form-input" placeholder="Stichting">` : ""}
            <input name="address" class="form-input full" placeholder="Adres">
          </div>

          <div class="modal-footer">
            <button type="button" class="ghost" onclick="closeModal()">Annuleren</button>
            <button type="submit">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById("relation-form").addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(event.target);

    const payload = {
      type,
      name: formData.get("name"),
      contact_person: formData.get("contact_person"),
      director: formData.get("director"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      city: formData.get("city"),
      foundation: type === "school" ? formData.get("foundation") : null,
      address: formData.get("address"),
      status: "nieuw"
    };

    const { error } = await db.from("organizations").insert(payload);

    if (error) {
      alert("Toevoegen mislukt.");
      console.error(error);
      return;
    }

    closeModal();
    await refresh();
  });
}

function openNoteModal(organizationId) {
  openModal(`
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>Nieuwe notitie</h2>
            <p class="page-subtitle">Koppel een notitie aan ${getOrganizationName(organizationId)}.</p>
          </div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>

        <form id="note-form">
          <div class="modal-content">
            <textarea name="text" placeholder="Typ je notitie..." required></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="ghost" onclick="closeModal()">Annuleren</button>
            <button type="submit">Notitie opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.getElementById("note-form").addEventListener("submit", async event => {
    event.preventDefault();

    const text = new FormData(event.target).get("text");

    const { error } = await db.from("notes").insert({
      organization_id: organizationId,
      text
    });

    if (error) {
      alert("Notitie toevoegen mislukt.");
      console.error(error);
      return;
    }

    closeModal();
    await refresh();
  });
}

function uniqueValues(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "nl"));
}

function cityFromAddress(address) {
  if (!address) return "";
  const parts = String(address).split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}