function renderRelaties(state, type) {
  const label = typeLabel(type);
  const active = state.selectedRelationId ? state.organizations.find(o => o.id === state.selectedRelationId) : null;

  if (active && state.selectedRelationSection === "notes") return renderRelationNotesPage(active, type);
  if (active && state.selectedRelationSection === "documents") return renderRelationDocumentsPage(active, type);
  if (active && state.selectedRelationSection === "contacts") return renderRelationContactsPage(active, type);
  if (active) return renderRelationDetail(active, type);

  const baseItems = state.organizations.filter(org => org.type === type);
  const cities = uniqueValues(baseItems.map(org => org.city || cityFromAddress(org.address)));
  const foundations = uniqueValues(baseItems.map(org => org.foundation));

  const items = baseItems.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(state.search.toLowerCase());
    const city = org.city || cityFromAddress(org.address);
    const matchesCity = state.relationCityFilter === "alles" || city === state.relationCityFilter;
    const matchesFoundation = type !== "school" || state.relationFoundationFilter === "alles" || (org.foundation || "") === state.relationFoundationFilter;
    return matchesSearch && matchesCity && matchesFoundation;
  });

  return `
    <section class="toolbar compact-toolbar">
      <div class="toolbar-left relation-filter-row">
        <input id="relation-search" class="search-input" placeholder="Zoek ${label}..." value="${escapeHtml(state.search)}">
        <select id="city-filter" class="filter-select small-filter">
          <option value="alles">Alle plaatsen</option>
          ${cities.map(city => `<option value="${escapeHtml(city)}" ${state.relationCityFilter === city ? "selected" : ""}>${escapeHtml(city)}</option>`).join("")}
        </select>
        ${type === "school" ? `
          <select id="foundation-filter" class="filter-select small-filter">
            <option value="alles">Alle stichtingen</option>
            ${foundations.map(foundation => `<option value="${escapeHtml(foundation)}" ${state.relationFoundationFilter === foundation ? "selected" : ""}>${escapeHtml(foundation)}</option>`).join("")}
          </select>
        ` : ""}
      </div>
    </section>
    <section class="card-grid ${type === "school" ? "school-card-grid" : ""}">
      ${items.map(org => relationCard(org)).join("") || `<p class="empty">Geen ${typePluralLabel(type)} gevonden.</p>`}
    </section>`;
}

function relationCard(org) {
  const appointments = state.appointments.filter(a => a.organization_id === org.id);
  const future = appointments.filter(a => a.date >= new Date().toISOString().slice(0, 10)).sort((a,b) => a.date.localeCompare(b.date))[0];
  const notes = state.notes.filter(n => n.organization_id === org.id);
  const documents = state.documents.filter(d => d.organization_id === org.id);
  const contactMoments = state.contactMoments.filter(m => m.organization_id === org.id);
  const status = future ? "actief" : appointments.length ? "nieuw" : "leeg";
  const city = org.city || cityFromAddress(org.address);
  const relationExtra = `<p class="school-meta-line">${escapeHtml(city || "Plaats onbekend")}${org.type === "school" && org.foundation ? ` · ${escapeHtml(org.foundation)}` : ""}</p>`;

  return `
    <article class="crm-card relation-card ${org.type === "school" ? "school-relation-card" : ""} status-${status}" onclick="openRelationDetail('${org.id}')">
      <div class="card-logo ${org.type}">${org.type.toUpperCase()}</div>
      <h2>${escapeHtml(org.name)}</h2>
      ${relationExtra}
      <p class="card-meta compact-meta">Contact: ${escapeHtml(org.contact_person) || "-"}<br>Telefoon: ${escapeHtml(org.phone) || "-"}</p>
      <div class="note-card compact-planning"><strong>${future ? "Volgende activiteit" : "Planning"}</strong><p class="card-meta">${future ? `${formatDate(future.date)} · ${escapeHtml(future.title)}` : "Nog niets gepland"}</p></div>
      <p class="card-meta">${notes.length} notitie(s) · ${contactMoments.length} contactmoment(en) · ${documents.length} document(en)</p>
      <div class="card-actions"><button class="danger small-button" onclick="event.stopPropagation(); deleteRecord('organizations', '${org.id}')">Verwijderen</button></div>
    </article>`;
}

function renderRelationDetail(org, type) {
  const appointments = state.appointments.filter(a => a.organization_id === org.id).sort((a,b) => `${a.date} ${a.start_time || ""}`.localeCompare(`${b.date} ${b.start_time || ""}`));
  const notes = state.notes.filter(n => n.organization_id === org.id);
  const documents = state.documents.filter(d => d.organization_id === org.id);
  const contactMoments = state.contactMoments.filter(m => m.organization_id === org.id);
  const future = appointments.filter(a => a.date >= new Date().toISOString().slice(0, 10));
  const city = org.city || cityFromAddress(org.address);
  const pastAppointments = appointments.filter(isPastAppointment);
  const missingAccountability = appointments.filter(needsAccountability);
  const childrenTotal = appointments.reduce((sum, item) => sum + (Number(item.participant_children) || 0), 0);
  const teachersTotal = appointments.reduce((sum, item) => sum + (Number(item.participant_teachers) || 0), 0);

  return `
    <button class="ghost" onclick="closeRelationDetail()">← Terug naar ${typePluralLabel(type)}</button><br><br>
    <section class="detail-layout detail-layout-compact">
      <div class="panel relation-main-panel">
        <div class="detail-title"><div><h2>${escapeHtml(org.name)}</h2><p class="page-subtitle">${typeLabel(type)}detail</p></div><span class="event-label ${future.length ? "label-green" : "label-orange"}">${future.length ? "ingepland" : "nog plannen"}</span></div>
        <div class="contact-summary contact-summary-compact">
          <p><strong>Contactpersoon</strong><br>${escapeHtml(org.contact_person) || "-"}</p>
          <p><strong>Telefoon</strong><br>${org.phone ? `<a href="tel:${phoneHref(org.phone)}">${escapeHtml(org.phone)}</a>` : "-"}</p>
          <p><strong>Mail</strong><br>${org.email ? `<a href="mailto:${escapeHtml(org.email)}">${escapeHtml(org.email)}</a>` : "-"}</p>
          <p><strong>Adres</strong><br>${escapeHtml(org.address) || "-"}</p>
          <p><strong>Plaats</strong><br>${escapeHtml(city) || "-"}</p>
          ${type === "school" ? `<p><strong>Stichting</strong><br>${escapeHtml(org.foundation) || "-"}</p><p><strong>Directeur</strong><br>${escapeHtml(org.director) || "-"}</p>` : ""}
        </div>
        <div class="kpi-grid relation-kpi-grid">
          <div class="kpi"><strong>${appointments.length}</strong><span>Activiteiten</span></div>
          <button type="button" class="kpi kpi-button" onclick="openRelationContacts('${org.id}')"><strong>${contactMoments.length}</strong><span>Contactmomenten</span></button>
          <button type="button" class="kpi kpi-button" onclick="openRelationNotes('${org.id}')"><strong>${notes.length}</strong><span>Notities</span></button>
          <button type="button" class="kpi kpi-button" onclick="openRelationDocuments('${org.id}')"><strong>${documents.length}</strong><span>Documenten</span></button>
        </div>
        <section class="accountability-summary-card ${missingAccountability.length ? "has-missing" : ""}">
          <div>
            <strong>Verantwoording</strong>
            <p>${childrenTotal} kinderen · ${teachersTotal} leerkrachten · ${pastAppointments.length} uitgevoerde activiteit(en)</p>
            ${missingAccountability.length ? `
              <div class="relation-open-actions">
                ${missingAccountability.slice(0, 3).map(item => `
                  <button type="button" class="relation-open-action" onclick="openAccountabilityModal('${item.id}')">
                    ⚠ ${formatDate(item.date)} · ${escapeHtml(item.title)}
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
          ${missingAccountability.length ? `<button type="button" onclick="openAccountabilityModal('${missingAccountability[0].id}')">${missingAccountability.length} open</button>` : `<span class="accountability-complete">Compleet</span>`}
        </section>
        <div class="panel-header">Activiteiten</div>
        <div class="compact-activity-list">
          ${appointments.map(a => relationActivityRow(a)).join("") || `<p class="empty">Nog geen activiteiten.</p>`}
        </div>
      </div>
      <aside class="panel notes-side-panel relation-side-panel">
        <section class="side-block">
          <div class="side-block-header">
            <div>
              <div class="panel-header">Communicatie</div>
              <p class="card-meta">Mails, contactmomenten en losse notities.</p>
            </div>
            <button type="button" class="ghost small-button" onclick="openRelationContacts('${org.id}')">Alles</button>
          </div>

          <div class="notes-action-row side-action-grid">
            <button type="button" onclick="openContactMomentModal('${org.id}', 'Mail')">+ Mail registreren</button>
            <button type="button" onclick="openContactMomentModal('${org.id}')">+ Contactmoment</button>
            <button type="button" class="ghost" onclick="openNoteModal('${org.id}')">+ Notitie</button>
          </div>

          <div class="side-section-title">Laatste contactmomenten</div>
          ${contactMoments.slice(0, 3).map(moment => contactMomentRow(moment, org.id)).join("") || `<p class="empty">Nog geen contactmomenten.</p>`}
        </section>

        <section class="side-block side-block-separated">
          <div class="side-block-header">
            <div>
              <div class="panel-header">Documenten</div>
              <p class="card-meta">Inspanningsverklaringen en andere bestanden.</p>
            </div>
            <button type="button" class="ghost small-button" onclick="openRelationDocuments('${org.id}')">Alles</button>
          </div>

          <div class="notes-action-row side-action-grid">
            <button type="button" onclick="openDocumentModal('${org.id}')">+ Document</button>
          </div>

          <div class="side-section-title">Laatste documenten</div>
          ${documents.slice(0, 3).map(document => documentRow(document)).join("") || `<p class="empty">Nog geen documenten.</p>`}
        </section>
      </aside>
    </section>`;
}

function renderRelationNotesPage(org, type) {
  const notes = state.notes.filter(n => n.organization_id === org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button><br><br>
    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div><h2>Notities</h2><p class="page-subtitle">${escapeHtml(org.name)}</p></div>
          <button type="button" onclick="openNoteModal('${org.id}')">+ Nieuwe notitie</button>
        </div>
        <div class="notes-page-list">
          ${notes.map(note => `<article class="note-row note-row-page"><div class="note-date">${formatDateLong(note.created_at ? note.created_at.slice(0,10) : "")}</div><div class="note-text">${escapeHtml(note.text)}</div><div class="card-actions"><button class="danger small-button" onclick="deleteRecord('notes', '${note.id}')">Verwijderen</button></div></article>`).join("") || `<p class="empty">Nog geen notities.</p>`}
        </div>
      </div>
    </section>`;
}

function renderRelationContactsPage(org, type) {
  const moments = state.contactMoments.filter(m => m.organization_id === org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button><br><br>
    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div><h2>Contactgeschiedenis</h2><p class="page-subtitle">${escapeHtml(org.name)}</p></div>
          <div class="notes-action-row"><button type="button" onclick="openContactMomentModal('${org.id}', 'Mail')">+ Mail registreren</button><button type="button" onclick="openContactMomentModal('${org.id}')">+ Contactmoment</button></div>
        </div>
        <div class="notes-page-list">
          ${moments.map(moment => contactMomentPageRow(moment)).join("") || `<p class="empty">Nog geen contactmomenten.</p>`}
        </div>
      </div>
    </section>`;
}

function renderRelationDocumentsPage(org, type) {
  const documents = state.documents.filter(d => d.organization_id === org.id);

  return `
    <button class="ghost" onclick="backToRelationDetail()">← Terug naar ${typeLabel(type)}detail</button><br><br>
    <section class="notes-page-layout">
      <div class="panel notes-page-main">
        <div class="notes-page-header">
          <div><h2>Documenten</h2><p class="page-subtitle">${escapeHtml(org.name)}</p></div>
          <button type="button" onclick="openDocumentModal('${org.id}')">+ Document uploaden</button>
        </div>
        <div class="document-grid">
          ${documents.map(document => documentCard(document)).join("") || `<p class="empty">Nog geen documenten.</p>`}
        </div>
      </div>
    </section>`;
}

function relationActivityRow(appointment) {
  const teamNames = getTeamNames(appointment.team_member_ids);
  const missing = needsAccountability(appointment);
  const filled = isPastAppointment(appointment) && !missing;

  return `
    <article class="relation-activity-row ${missing ? "accountability-missing" : ""}">
      <div class="relation-activity-date">
        <strong>${formatDate(appointment.date)}</strong>
        <span>${cleanTime(appointment.start_time)} - ${cleanTime(appointment.end_time)}</span>
      </div>
      <div class="relation-activity-main">
        <strong>${escapeHtml(appointment.title)}</strong>
        <span>${teamNames ? escapeHtml(teamNames) : "Geen teamleden gekoppeld"}</span>
        ${missing ? `<em>Verantwoording ontbreekt</em>` : ""}
        ${filled ? `<em>${accountabilitySummary(appointment)}</em>` : ""}
      </div>
      <div class="relation-activity-actions">
        <span class="event-label ${activityClass(appointment.activity_type)}">${escapeHtml(appointment.activity_type)}</span>
        <button type="button" class="ghost small-button" onclick="openAccountabilityModal('${appointment.id}')">Verantwoording</button>
      </div>
    </article>`;
}

function contactMomentRow(moment, orgId) {
  return `
    <button type="button" class="note-row note-row-large note-clickable contact-row-small" onclick="openRelationContacts('${orgId}')">
      <div class="note-date">${escapeHtml(moment.contact_type || "Contact")} · ${formatDate(moment.contact_date)}</div>
      <div class="note-text"><strong>${escapeHtml(moment.subject || "Geen onderwerp")}</strong><br>${escapeHtml(moment.summary || "")}</div>
    </button>`;
}

function contactMomentPageRow(moment) {
  return `
    <article class="note-row note-row-page contact-moment-card">
      <div class="note-date">${escapeHtml(moment.contact_type || "Contact")} · ${formatDateLong(moment.contact_date)}</div>
      <h3>${escapeHtml(moment.subject || "Geen onderwerp")}</h3>
      <p>${escapeHtml(moment.summary || "")}</p>
      <p class="card-meta">Contactpersoon: ${escapeHtml(moment.contact_person) || "-"}${moment.direction ? ` · Richting: ${escapeHtml(moment.direction)}` : ""}</p>
      <div class="card-actions"><button class="danger small-button" onclick="deleteRecord('contact_moments', '${moment.id}')">Verwijderen</button></div>
    </article>`;
}

function documentRow(document) {
  return `
    <div class="document-row-small">
      <strong>${escapeHtml(document.title || document.file_name)}</strong>
      <span>${escapeHtml(document.document_type || "Document")} · ${escapeHtml(document.status || "")}</span>
      <a href="${escapeHtml(document.file_url)}" target="_blank" rel="noopener">Openen</a>
    </div>`;
}

function documentCard(document) {
  return `
    <article class="document-card">
      <div class="document-icon">📄</div>
      <div>
        <h3>${escapeHtml(document.title || document.file_name)}</h3>
        <p class="card-meta">${escapeHtml(document.document_type || "Document")} · ${escapeHtml(document.status || "Status onbekend")}</p>
        <p class="card-meta">${formatDateLong(document.created_at ? document.created_at.slice(0,10) : "")}</p>
        <div class="card-actions">
          <a class="button secondary" href="${escapeHtml(document.file_url)}" target="_blank" rel="noopener">Openen</a>
          <button class="danger small-button" onclick="deleteDocument('${document.id}', '${escapeHtml(document.file_path)}')">Verwijderen</button>
        </div>
      </div>
    </article>`;
}

function openRelationDetail(id) { state.selectedRelationId = id; state.selectedRelationSection = null; render(); }
function closeRelationDetail() { state.selectedRelationId = null; state.selectedRelationSection = null; render(); }
function openRelationNotes(id) { state.selectedRelationId = id; state.selectedRelationSection = "notes"; render(); }
function openRelationContacts(id) { state.selectedRelationId = id; state.selectedRelationSection = "contacts"; render(); }
function openRelationDocuments(id) { state.selectedRelationId = id; state.selectedRelationSection = "documents"; render(); }
function backToRelationDetail() { state.selectedRelationSection = null; render(); }

function bindRelatieActions() {
  const search = document.getElementById("relation-search");
  if (search) search.addEventListener("input", event => { state.search = event.target.value; render(); });

  const cityFilter = document.getElementById("city-filter");
  if (cityFilter) cityFilter.addEventListener("change", event => { state.relationCityFilter = event.target.value; render(); });

  const foundationFilter = document.getElementById("foundation-filter");
  if (foundationFilter) foundationFilter.addEventListener("change", event => { state.relationFoundationFilter = event.target.value; render(); });
}

function openRelationModal(type) {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Nieuwe ${typeLabel(type)}</h2><p class="page-subtitle">Incidenteel beheer, daarom in een pop-up.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="relation-form"><div class="modal-content form-grid">
        <input name="name" class="form-input full" placeholder="Naam" required>
        <input name="contact_person" class="form-input" placeholder="Contactpersoon">
        <input name="director" class="form-input" placeholder="Directeur">
        <input name="phone" class="form-input" placeholder="Telefoon">
        <input name="email" class="form-input" placeholder="E-mail">
        <input name="city" class="form-input" placeholder="Plaats">
        ${type === "school" ? `<input name="foundation" class="form-input" placeholder="Stichting">` : ""}
        <input name="address" class="form-input full" placeholder="Adres">
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Opslaan</button></div></form>
    </div></div>`);
  document.getElementById("relation-form").addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = { type, name: formData.get("name"), contact_person: formData.get("contact_person"), director: formData.get("director"), phone: formData.get("phone"), email: formData.get("email"), city: formData.get("city"), foundation: type === "school" ? formData.get("foundation") : null, address: formData.get("address"), status: "nieuw" };
    const { error } = await db.from("organizations").insert(payload);
    if (error) { alert("Toevoegen mislukt."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

function openNoteModal(organizationId) {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Nieuwe notitie</h2><p class="page-subtitle">Koppel een losse notitie aan ${escapeHtml(getOrganizationName(organizationId))}.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="note-form"><div class="modal-content"><textarea name="text" placeholder="Typ je notitie..." required></textarea></div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Notitie opslaan</button></div></form>
    </div></div>`);
  document.getElementById("note-form").addEventListener("submit", async event => {
    event.preventDefault();
    const text = new FormData(event.target).get("text");
    const { error } = await db.from("notes").insert({ organization_id: organizationId, text });
    if (error) { alert("Notitie toevoegen mislukt."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

function openContactMomentModal(organizationId, preferredType = "") {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>${preferredType === 'Mail' ? 'Mail registreren' : 'Contactmoment opslaan'}</h2><p class="page-subtitle">Bij ${escapeHtml(getOrganizationName(organizationId))}. Registreer kort wat er is besproken of gemaild.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="contact-moment-form"><div class="modal-content form-grid">
        <select name="contact_type" class="form-select">
          ${["Mail", "Telefoon", "Overleg", "Bezoek", "Notitie"].map(type => `<option value="${type}" ${preferredType === type ? "selected" : ""}>${type}</option>`).join("")}
        </select>
        <input name="contact_date" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" required>
        <input name="contact_person" class="form-input" placeholder="Contactpersoon">
        <select name="direction" class="form-select">
          <option value="">Richting onbekend</option>
          <option value="Inkomend">Inkomend</option>
          <option value="Uitgaand">Uitgaand</option>
        </select>
        <input name="subject" class="form-input full" placeholder="Onderwerp" required>
        <textarea name="summary" class="full" placeholder="Korte samenvatting of plak hier de belangrijkste tekst uit de mail..." required></textarea>
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Opslaan</button></div></form>
    </div></div>`);

  document.getElementById("contact-moment-form").addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      organization_id: organizationId,
      contact_type: formData.get("contact_type"),
      contact_date: formData.get("contact_date"),
      contact_person: formData.get("contact_person"),
      direction: formData.get("direction"),
      subject: formData.get("subject"),
      summary: formData.get("summary")
    };
    const { error } = await db.from("contact_moments").insert(payload);
    if (error) { alert("Contactmoment toevoegen mislukt. Controleer of het SQL-script is uitgevoerd."); console.error(error); return; }
    closeModal(); await refresh();
  });
}

function openDocumentModal(organizationId) {
  openModal(`
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-header"><div><h2>Document uploaden</h2><p class="page-subtitle">Koppel een document aan ${escapeHtml(getOrganizationName(organizationId))}.</p></div><button type="button" class="close-button" onclick="closeModal()">×</button></div>
      <form id="document-form"><div class="modal-content form-grid">
        <input name="title" class="form-input full" placeholder="Titel, bijvoorbeeld Inspanningsverklaring 2026" required>
        <select name="document_type" class="form-select">
          <option value="Inspanningsverklaring">Inspanningsverklaring</option>
          <option value="Overeenkomst">Overeenkomst</option>
          <option value="Evaluatie">Evaluatie</option>
          <option value="Offerte">Offerte</option>
          <option value="Overig">Overig</option>
        </select>
        <select name="status" class="form-select">
          <option value="Concept">Concept</option>
          <option value="Verzonden">Verzonden</option>
          <option value="Ondertekend">Ondertekend</option>
          <option value="Vervallen">Vervallen</option>
        </select>
        <input name="file" type="file" class="form-input full" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" required>
      </div><div class="modal-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Uploaden</button></div></form>
    </div></div>`);

  document.getElementById("document-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!file || !file.name) return;

    const filePath = `${organizationId}/${Date.now()}-${safeFileName(file.name)}`;
    const uploadButton = form.querySelector("button[type='submit']");
    uploadButton.disabled = true;
    uploadButton.textContent = "Uploaden...";

    const uploadResult = await db.storage.from("crm-documents").upload(filePath, file, { upsert: false });
    if (uploadResult.error) {
      alert("Upload mislukt. Controleer of de storage bucket crm-documents bestaat.");
      console.error(uploadResult.error);
      uploadButton.disabled = false;
      uploadButton.textContent = "Uploaden";
      return;
    }

    const publicUrlResult = db.storage.from("crm-documents").getPublicUrl(filePath);
    const fileUrl = publicUrlResult.data.publicUrl;

    const payload = {
      organization_id: organizationId,
      title: formData.get("title"),
      document_type: formData.get("document_type"),
      status: formData.get("status"),
      file_name: file.name,
      file_path: filePath,
      file_url: fileUrl
    };

    const { error } = await db.from("documents").insert(payload);
    if (error) {
      alert("Documentgegevens opslaan mislukt.");
      console.error(error);
      return;
    }

    closeModal(); await refresh();
  });
}

async function deleteDocument(id, filePath) {
  const confirmation = prompt("Typ VERWIJDEREN om dit document definitief te verwijderen.");
  if (confirmation !== "VERWIJDEREN") return;

  if (filePath) {
    const storageResult = await db.storage.from("crm-documents").remove([filePath]);
    if (storageResult.error) console.warn("Bestand verwijderen uit storage mislukt.", storageResult.error);
  }

  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) { alert("Document verwijderen mislukt."); console.error(error); return; }
  await refresh();
}

function uniqueValues(values) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));
}

function cityFromAddress(address) {
  if (!address) return "";
  const parts = String(address).split(",").map(part => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}
