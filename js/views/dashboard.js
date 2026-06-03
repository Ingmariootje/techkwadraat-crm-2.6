function renderDashboard(state) {
  const schools = state.organizations.filter(item => item.type === "school");
  const companies = state.organizations.filter(item => item.type === "bedrijf");
  const institutions = state.organizations.filter(item => item.type === "instelling");

  const now = new Date();
  const thisWeekRange = getWeekRange(now);
  const nextWeekStart = new Date(thisWeekRange.start);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekRange = getWeekRange(nextWeekStart);

  const thisWeekAppointments = appointmentsInRange(state.appointments, thisWeekRange.start, thisWeekRange.end);
  const nextWeekAppointments = appointmentsInRange(state.appointments, nextWeekRange.start, nextWeekRange.end);

  const importantNotes = state.notes.slice(0, 12);

  return `
    <section class="dashboard-three-column">
      <div class="panel week-panel dashboard-week-card">
        <div class="week-panel-header">
          <div>
            <div class="panel-header">Deze week</div>
            <p class="week-range">${formatRange(thisWeekRange.start, thisWeekRange.end)}</p>
          </div>
          <span class="week-number">Week ${getIsoWeekNumber(thisWeekRange.start)}</span>
        </div>
        <div class="week-count">${thisWeekAppointments.length} activiteiten</div>
        ${thisWeekAppointments.map(appointment => dashboardEvent(appointment)).join("") || emptyText("Geen activiteiten deze week.")}
      </div>

      <div class="panel week-panel dashboard-week-card">
        <div class="week-panel-header">
          <div>
            <div class="panel-header">Volgende week</div>
            <p class="week-range">${formatRange(nextWeekRange.start, nextWeekRange.end)}</p>
          </div>
          <span class="week-number week-number-green">Week ${getIsoWeekNumber(nextWeekRange.start)}</span>
        </div>
        <div class="week-count">${nextWeekAppointments.length} activiteiten</div>
        ${nextWeekAppointments.map(appointment => dashboardEvent(appointment)).join("") || emptyText("Geen activiteiten volgende week.")}
      </div>

      <section class="panel notes-priority-panel dashboard-notes-column">
        <div class="notes-priority-header">
          <div>
            <div class="panel-header">Laatste notities en contactmomenten</div>
            </div>
        </div>
        <div class="priority-note-list">
          ${importantNotes.map(note => renderPriorityNote(note)).join("") || emptyText("Nog geen notities.")}
        </div>
      </section>
    </section>
  `;
}

function dashboardEvent(appointment) {
  const date = new Date(`${appointment.date}T12:00:00`);
  const day = date.toLocaleDateString("nl-NL", { weekday: "short" }).toUpperCase().replace(".", "");
  const number = date.getDate();
  const month = date.toLocaleDateString("nl-NL", { month: "short" }).toUpperCase().replace(".", "");
  const teamNames = getTeamNames(appointment.team_member_ids);
  const organizationName = getOrganizationName(appointment.organization_id);

  return `
    <div class="week-event week-event-rich">
      <div class="date-block"><span>${day}</span><strong>${number}</strong><small>${month}</small></div>
      <div class="week-event-content">
        <div class="event-time">${cleanTime(appointment.start_time)} - ${cleanTime(appointment.end_time)}</div>
        <strong>${escapeHtml(appointment.title)}</strong>
        <div class="event-organization">${escapeHtml(organizationName)}</div>
        ${teamNames ? `<div class="event-team">${escapeHtml(teamNames)}</div>` : `<div class="event-team muted">Geen teamleden gekoppeld</div>`}
        <span class="event-label ${activityClass(appointment.activity_type)}">${escapeHtml(appointment.activity_type)}</span>
      </div>
    </div>
  `;
}

function renderPriorityNote(note) {
  const organization = state.organizations.find(item => item.id === note.organization_id);
  const type = organization ? organization.type : "notitie";
  const label = organization ? typeLabel(type) : "notitie";
  return `
    <article class="priority-note-card">
      <div class="priority-note-topline">
        <span class="priority-note-type">${escapeHtml(label)}</span>
        <span class="note-date">${formatDate(note.created_at ? note.created_at.slice(0, 10) : "")}</span>
      </div>
      <h3>${escapeHtml(getOrganizationName(note.organization_id))}</h3>
      <p>${escapeHtml(note.text)}</p>
    </article>
  `;
}

function appointmentsInRange(appointments, start, end) {
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return appointments
    .filter(item => item.date >= startKey && item.date <= endKey)
    .sort((a, b) => `${a.date} ${a.start_time || ""}`.localeCompare(`${b.date} ${b.start_time || ""}`));
}

function getWeekRange(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRange(start, end) {
  const startText = start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  const endText = end.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  return `${startText} t/m ${endText}`;
}

function emptyText(text) { return `<p class="empty">${text}</p>`; }
