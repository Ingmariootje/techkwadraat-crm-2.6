const state = {
  view: "dashboard",
  relationType: null,
  selectedRelationId: null,
  selectedRelationSection: null,
  organizations: [],
  team: [],
  appointments: [],
  notes: [],
  selectedDate: new Date().toISOString().slice(0, 10),
  calendarMonth: new Date(),
  search: "",
  relationCityFilter: "alles",
  relationFoundationFilter: "alles"
};

const views = {
  dashboard: { title: "", subtitle: "", render: renderDashboard },
  agenda: { title: "Agenda", subtitle: "Kalender met activiteiten en dagplanning.", render: renderAgenda },
  scholen: { title: "Scholen", subtitle: "Schoolrelaties, activiteiten en notities.", render: s => renderRelaties(s, "school") },
  bedrijven: { title: "Bedrijven", subtitle: "Bedrijfspartners en bedrijfsbezoeken.", render: s => renderRelaties(s, "bedrijf") },
  instellingen: { title: "Instellingen", subtitle: "Partners zoals bibliotheek, museum en andere instellingen.", render: s => renderRelaties(s, "instelling") },
  team: { title: "Team", subtitle: "Teamleden, werkdagen en gekoppelde activiteiten.", render: renderTeam }
};

async function loadData() {
  const [organizations, team, appointments, notes] = await Promise.all([
    db.from("organizations").select("*").order("name", { ascending: true }),
    db.from("team_members").select("*").order("name", { ascending: true }),
    db.from("appointments").select("*").order("date", { ascending: true }),
    db.from("notes").select("*").order("created_at", { ascending: false })
  ]);

  if (organizations.error) console.error(organizations.error);
  if (team.error) console.error(team.error);
  if (appointments.error) console.error(appointments.error);
  if (notes.error) console.error(notes.error);

  state.organizations = organizations.data || [];
  state.team = team.data || [];
  state.appointments = appointments.data || [];
  state.notes = notes.data || [];
}

async function refresh() {
  await loadData();
  render();
}

function render() {
  const view = views[state.view];

  document.getElementById("page-title").textContent = view.title;
  document.getElementById("page-subtitle").textContent = view.subtitle;
  document.getElementById("page-actions").innerHTML = renderPageActions();

  document.querySelector(".page-header").classList.toggle(
    "is-empty",
    !view.title && !view.subtitle && !renderPageActions()
  );

  document.getElementById("app-view").innerHTML = view.render(state);
  bindViewActions();
}

function renderPageActions() {
  switch (state.view) {
    case "agenda":
      return `<button type="button" onclick="openAppointmentModal(state.selectedDate)">+ Activiteit</button>`;

    case "scholen":
      return `<button type="button" onclick="openRelationModal('school')">+ School</button>`;

    case "bedrijven":
      return `<button type="button" onclick="openRelationModal('bedrijf')">+ Bedrijf</button>`;

    case "instellingen":
      return `<button type="button" onclick="openRelationModal('instelling')">+ Instelling</button>`;

    case "team":
      return `<button type="button" onclick="openTeamModal()">+ Teamlid</button>`;

    default:
      return "";
  }
}

function setView(viewName) {
  state.view = viewName;
  state.selectedRelationId = null;
  state.selectedRelationSection = null;
  state.search = "";
  state.relationCityFilter = "alles";
  state.relationFoundationFilter = "alles";

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  render();
}

function bindNavigation() {
  document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
}

function bindViewActions() {
  if (state.view === "agenda") bindAgendaActions();
  if (["scholen", "bedrijven", "instellingen"].includes(state.view)) bindRelatieActions();
  if (state.view === "team") bindTeamActions();
}

function viewToType(viewName) {
  if (viewName === "scholen") return "school";
  if (viewName === "bedrijven") return "bedrijf";
  return "instelling";
}

function typeToView(type) {
  if (type === "school") return "scholen";
  if (type === "bedrijf") return "bedrijven";
  return "instellingen";
}

function typeLabel(type) {
  if (type === "school") return "school";
  if (type === "bedrijf") return "bedrijf";
  return "instelling";
}

function typeLabelCapital(type) {
  if (type === "school") return "School";
  if (type === "bedrijf") return "Bedrijf";
  return "Instelling";
}

function typePluralLabel(type) {
  if (type === "school") return "scholen";
  if (type === "bedrijf") return "bedrijven";
  return "instellingen";
}

function phoneHref(phone) {
  return String(phone || "").replace(/[^+0-9]/g, "");
}

function getOrganizationName(id) {
  const org = state.organizations.find(item => item.id === id);
  return org ? org.name : "Geen organisatie";
}

function getTeamNames(ids) {
  const selected = Array.isArray(ids) ? ids : [];
  return state.team
    .filter(member => selected.includes(member.id))
    .map(member => member.name)
    .join(", ");
}

function cleanTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function formatDateLong(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function activityClass(type) {
  const value = String(type || "").toLowerCase();

  if (value.includes("bus")) return "event-bus";
  if (value.includes("techhub")) return "event-techhub";
  if (value.includes("gast")) return "event-gastles";
  if (value.includes("bedrijf")) return "event-bedrijf";

  return "event-techhub";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(html) {
  document.getElementById("modal-root").innerHTML = html;
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function openRelationModal(type) {
  const label = typeLabelCapital(type);

  openModal(`
    <div class="modal-backdrop" onclick="closeModal()">
      <div class="modal large-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h2>+ ${label}</h2>
            <p>Nieuwe ${typeLabel(type)} toevoegen aan Techkwadraat CRM.</p>
          </div>
          <button type="button" class="secondary" onclick="closeModal()">Sluiten</button>
        </div>

        <form id="relation-create-form" class="form-grid">
          <input type="hidden" name="type" value="${type}">

          <label>
            Naam
            <input name="name" class="form-input" required placeholder="Naam ${typeLabel(type)}">
          </label>

          <label>
            Contactpersoon
            <input name="contact_person" class="form-input" placeholder="Naam contactpersoon">
          </label>

          ${
            type === "school"
              ? `
                <label>
                  Directeur
                  <input name="director" class="form-input" placeholder="Naam directeur">
                </label>
              `
              : `
                <label>
                  Directeur / leidinggevende
                  <input name="director" class="form-input" placeholder="Optioneel">
                </label>
              `
          }

          <label>
            Telefoon
            <input name="phone" class="form-input" placeholder="06-12345678">
          </label>

          <label>
            E-mail
            <input name="email" class="form-input" placeholder="naam@organisatie.nl">
          </label>

          <label>
            Plaats
            <input name="city" class="form-input" placeholder="Bijvoorbeeld Tilburg">
          </label>

          ${
            type === "school"
              ? `
                <label>
                  Stichting
                  <input name="foundation" class="form-input" placeholder="Bijvoorbeeld Xpect013">
                </label>
              `
              : `
                <label>
                  Stichting / koepel
                  <input name="foundation" class="form-input" placeholder="Optioneel">
                </label>
              `
          }

          <label class="full">
            Adres
            <input name="address" class="form-input" placeholder="Straat, huisnummer, plaats">
          </label>

          <div class="full modal-actions">
            <button type="submit">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const form = document.getElementById("relation-create-form");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(form);

    const payload = {
      type: formData.get("type"),
      name: String(formData.get("name") || "").trim(),
      contact_person: String(formData.get("contact_person") || "").trim() || null,
      director: String(formData.get("director") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      foundation: String(formData.get("foundation") || "").trim() || null,
      status: "nieuw"
    };

    const { error } = await db.from("organizations").insert(payload);

    if (error) {
      alert(`${label} toevoegen mislukt.`);
      console.error(error);
      return;
    }

    closeModal();
    await refresh();
  });
}

function openTeamModal() {
  openModal(`
    <div class="modal-backdrop" onclick="closeModal()">
      <div class="modal large-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h2>+ Teamlid</h2>
            <p>Nieuw teamlid toevoegen.</p>
          </div>
          <button type="button" class="secondary" onclick="closeModal()">Sluiten</button>
        </div>

        <form id="team-create-form" class="form-grid">
          <label>
            Naam
            <input name="name" class="form-input" required placeholder="Naam teamlid">
          </label>

          <label>
            Functie
            <input name="role" class="form-input" placeholder="Bijvoorbeeld Techcoach">
          </label>

          <label>
            E-mail
            <input name="email" class="form-input" placeholder="naam@techkwadraat.nl">
          </label>

          <label>
            Telefoon
            <input name="phone" class="form-input" placeholder="06-12345678">
          </label>

          <fieldset class="full checkbox-group">
            <legend>Werkdagen</legend>

            <label><input type="checkbox" name="workdays" value="maandag"> Maandag</label>
            <label><input type="checkbox" name="workdays" value="dinsdag"> Dinsdag</label>
            <label><input type="checkbox" name="workdays" value="woensdag"> Woensdag</label>
            <label><input type="checkbox" name="workdays" value="donderdag"> Donderdag</label>
            <label><input type="checkbox" name="workdays" value="vrijdag"> Vrijdag</label>
          </fieldset>

          <div class="full modal-actions">
            <button type="submit">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const form = document.getElementById("team-create-form");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      role: String(formData.get("role") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      workdays: formData.getAll("workdays")
    };

    const { error } = await db.from("team_members").insert(payload);

    if (error) {
      alert("Teamlid toevoegen mislukt.");
      console.error(error);
      return;
    }

    closeModal();
    await refresh();
  });
}

async function deleteRecord(table, id) {
  const confirmation = prompt("Typ VERWIJDEREN om definitief te verwijderen.");
  if (confirmation !== "VERWIJDEREN") return;

  const { error } = await db.from(table).delete().eq("id", id);

  if (error) {
    alert("Verwijderen mislukt.");
    console.error(error);
    return;
  }

  await refresh();
}

async function init() {
  bindNavigation();
  await refresh();
}

init();