function renderAgenda(state) {
  const month = state.calendarMonth;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthName = month.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const firstDay = new Date(year, monthIndex, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let cells = "";

  for (let i = 0; i < startDay; i++) cells += `<div class="calendar-day"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayAppointments = state.appointments.filter(item => item.date === dateString);
    const today = new Date().toISOString().slice(0, 10);
    cells += `
      <div class="calendar-day ${dateString === today ? "today" : ""} ${dateString === state.selectedDate ? "selected-day" : ""}" data-date="${dateString}">
        <span class="day-number">${day}</span>
        ${dayAppointments.map(renderCalendarEvent).join("")}
      </div>`;
  }

  const selectedAppointments = state.appointments.filter(item => item.date === state.selectedDate);

  return `
    <section class="agenda-layout">
      <div class="calendar-panel">
        <div class="calendar-header">
          <button id="prev-month" class="secondary">‹</button>
          <h2>${monthName}</h2>
          <button id="next-month" class="secondary">›</button>
        </div>
        <div class="calendar-weekdays"><div>Ma</div><div>Di</div><div>Wo</div><div>Do</div><div>Vr</div><div>Za</div><div>Zo</div></div>
        <div class="calendar-grid">${cells}</div>
      </div>

      <aside class="agenda-side-panel">
        <div class="panel-header">${formatDateLong(state.selectedDate)}</div>
        <button type="button" onclick="openAppointmentModal('${state.selectedDate}')">+ Activiteit op deze dag</button>
        <br><br>
        ${selectedAppointments.map(renderAgendaItem).join("") || `<p class="empty">Geen activiteiten op deze dag.</p>`}
      </aside>
    </section>`;
}


function renderCalendarEvent(item) {
  const teamNames = getTeamNames(item.team_member_ids);
  return `
    <div class="calendar-event calendar-event-rich ${activityClass(item.activity_type)}">
      <div class="calendar-event-time">${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</div>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(getOrganizationName(item.organization_id))}</span>
      ${teamNames ? `<small>${escapeHtml(teamNames)}</small>` : ""}
    </div>`;
}

function renderAgendaItem(item) {
  const teamNames = getTeamNames(item.team_member_ids);
  return `
    <div class="agenda-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</span><br>
      <span>${getOrganizationName(item.organization_id)}</span><br>
      ${teamNames ? `<span>Team: ${teamNames}</span><br>` : ""}
      <span class="event-label ${activityClass(item.activity_type)}">${escapeHtml(item.activity_type)}</span>
      ${item.notes ? `<p class="card-meta">${escapeHtml(item.notes)}</p>` : ""}
      <div class="card-actions"><button class="danger small-button" onclick="deleteRecord('appointments', '${item.id}')">Verwijderen</button></div>
    </div>`;
}

function bindAgendaActions() {
  document.querySelectorAll(".calendar-day[data-date]").forEach(day => {
    day.addEventListener("click", () => { state.selectedDate = day.dataset.date; render(); });
  });
  document.getElementById("prev-month").addEventListener("click", () => { state.calendarMonth.setMonth(state.calendarMonth.getMonth() - 1); render(); });
  document.getElementById("next-month").addEventListener("click", () => { state.calendarMonth.setMonth(state.calendarMonth.getMonth() + 1); render(); });
}

function openAppointmentModal(date = state.selectedDate) {
  state.selectedDate = date || state.selectedDate;
  const suggestions = ["Gastles", "Busbezoek", "TechHub", "Bedrijfsbezoek", "Overleg", "Voorbereiding", "Evaluatie"];
  const dayAppointments = state.appointments
    .filter(item => item.date === state.selectedDate)
    .sort((a, b) => `${a.start_time || ""}`.localeCompare(`${b.start_time || ""}`));

  openModal(`
    <div class="modal-backdrop">
      <div class="modal modal-wide">
        <div class="modal-header">
          <div><h2>${formatDateLong(state.selectedDate)}</h2><p class="page-subtitle">Dagoverzicht en nieuwe activiteit.</p></div>
          <button type="button" class="close-button" onclick="closeModal()">×</button>
        </div>
        <div class="modal-content day-modal-layout">
          <section class="day-overview-panel">
            <h3>Deze dag</h3>
            ${dayAppointments.map(item => `<div class="agenda-item day-overview-item"><strong>${escapeHtml(item.title)}</strong><span>${cleanTime(item.start_time)} - ${cleanTime(item.end_time)}</span><br><span>${escapeHtml(getOrganizationName(item.organization_id))}</span><br>${getTeamNames(item.team_member_ids) ? `<span>${escapeHtml(getTeamNames(item.team_member_ids))}</span>` : ""}</div>`).join("") || `<p class="empty">Nog geen activiteiten op deze dag.</p>`}
          </section>

          <form id="appointment-form" class="appointment-form-panel">
            <h3>Nieuwe activiteit</h3>
            <div class="form-grid">
              <input name="title" class="form-input full" placeholder="Titel" required>
              <select name="organization_id" class="form-select full">
                <option value="">Geen organisatie</option>
                <optgroup label="Scholen">${state.organizations.filter(o => o.type === "school").map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")}</optgroup>
                <optgroup label="Bedrijven">${state.organizations.filter(o => o.type === "bedrijf").map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")}</optgroup>
                <optgroup label="Instellingen">${state.organizations.filter(o => o.type === "instelling").map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")}</optgroup>
              </select>
              <input name="date" type="date" class="form-input" value="${state.selectedDate}" required>
              <input name="start_time" type="time" class="form-input">
              <input name="end_time" type="time" class="form-input">
              <input name="activity_type" class="form-input full" list="activity-suggestions" placeholder="Activiteitstype zelf typen" required>
              <datalist id="activity-suggestions">${suggestions.map(s => `<option value="${s}"></option>`).join("")}</datalist>
              <div class="full suggestion-row">${suggestions.map(s => `<button type="button" class="suggestion-chip" data-activity="${s}">${s}</button>`).join("")}</div>
              <div class="full"><p class="page-subtitle" style="margin-bottom:10px;">Teamleden</p><div class="team-chip-list">${state.team.map(member => `<button type="button" class="team-chip" data-team-id="${member.id}">${escapeHtml(member.name)}</button>`).join("")}</div></div>
              <textarea name="notes" class="full" placeholder="Notities"></textarea>
            </div>
            <div class="modal-footer inline-footer"><button type="button" class="ghost" onclick="closeModal()">Annuleren</button><button type="submit">Activiteit opslaan</button></div>
          </form>
        </div>
      </div>
    </div>`);
  bindAppointmentModal();
}

function bindAppointmentModal() {
  const selectedTeamIds = new Set();
  document.querySelectorAll(".team-chip").forEach(chip => {
    chip.addEventListener("click", () => { chip.classList.toggle("selected"); chip.classList.contains("selected") ? selectedTeamIds.add(chip.dataset.teamId) : selectedTeamIds.delete(chip.dataset.teamId); });
  });
  document.querySelectorAll(".suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => { document.querySelector("#appointment-form [name='activity_type']").value = chip.dataset.activity; });
  });
  document.getElementById("appointment-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const payload = {
      title: formData.get("title"),
      activity_type: formData.get("activity_type"),
      date: formData.get("date"),
      start_time: formData.get("start_time") || null,
      end_time: formData.get("end_time") || null,
      organization_id: formData.get("organization_id") || null,
      team_member_ids: Array.from(selectedTeamIds),
      notes: formData.get("notes")
    };
    const { error } = await db.from("appointments").insert(payload);
    if (error) { alert("Activiteit toevoegen mislukt."); console.error(error); return; }
    state.selectedDate = payload.date;
    state.calendarMonth = new Date(`${payload.date}T12:00:00`);
    closeModal();
    await refresh();
  });
}
