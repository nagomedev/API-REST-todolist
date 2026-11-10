/* Vista de la aplicación To-Do List.
   Consume la API REST expuesta por TaskController (/tasks). */

const API_URL = '/tasks';

const state = {
  tasks: [],
  filter: 'all',   // all | active | completed
  editingId: null,
  loading: true,
};

const els = {
  form: document.getElementById('task-form'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  submitBtn: document.getElementById('submit-btn'),
  list: document.getElementById('task-list'),
  filters: document.querySelectorAll('.filter'),
  statTotal: document.getElementById('stat-total'),
  statPending: document.getElementById('stat-pending'),
  statDone: document.getElementById('stat-done'),
  listCount: document.getElementById('list-count'),
  toast: document.getElementById('toast'),
};

const ICONS = {
  check: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5"/>
    </svg>`,
  edit: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>`,
  trash: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18"/>
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>`,
};

/* ---------- Utilidades ---------- */

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

let toastTimer;
function showToast(message, type = '') {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast is-visible${type ? ` is-${type}` : ''}`;
  toastTimer = setTimeout(() => {
    els.toast.className = 'toast';
  }, 3200);
}

async function api(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `Error ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.message) detail = body.message;
    } catch {
      /* la respuesta de error no era JSON */
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

/* ---------- Render ---------- */

function render() {
  const { tasks, filter } = state;
  const total = tasks.length;
  const done = tasks.filter((task) => task.completed).length;
  const pending = total - done;

  els.statTotal.textContent = total;
  els.statPending.textContent = pending;
  els.statDone.textContent = done;

  const filtered = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  els.listCount.textContent = total === 0 ? '' : `${filtered.length} de ${total}`;

  if (state.loading) {
    els.list.innerHTML = `
      <div class="state">
        <div class="spinner" aria-hidden="true"></div>
        Cargando tareas…
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    els.list.innerHTML = emptyState(filter, total);
    return;
  }

  els.list.innerHTML = filtered.map(taskTemplate).join('');
}

function emptyState(filter, total) {
  if (total === 0) {
    return `
      <div class="state">
        <div class="state-icon" aria-hidden="true">🗒️</div>
        <strong>Aún no hay tareas</strong>
        Añade tu primera tarea con el formulario de arriba.
      </div>`;
  }

  if (filter === 'active') {
    return `
      <div class="state">
        <div class="state-icon" aria-hidden="true">🎉</div>
        <strong>No hay tareas pendientes</strong>
        ¡Buen trabajo! Todo está al día.
      </div>`;
  }

  if (filter === 'completed') {
    return `
      <div class="state">
        <div class="state-icon" aria-hidden="true">⏳</div>
        <strong>Aún no has completado ninguna tarea</strong>
        Marca una tarea con el círculo de la izquierda.
      </div>`;
  }

  return `
    <div class="state">
      <div class="state-icon" aria-hidden="true">🗒️</div>
      <strong>Sin tareas</strong>
      Añade una nueva tarea para empezar.
    </div>`;
}

function taskTemplate(task) {
  if (state.editingId === task.id) {
    return editTemplate(task);
  }

  const created = formatDate(task.createdAt);
  const checkedLabel = task.completed ? 'Marcar como pendiente' : 'Marcar como completada';

  return `
    <article class="task${task.completed ? ' is-completed' : ''}" data-id="${task.id}">
      <button class="task-check" type="button" data-action="toggle"
              aria-label="${checkedLabel}" aria-pressed="${task.completed}">
        ${ICONS.check}
      </button>

      <div class="task-body">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        ${task.description
          ? `<p class="task-description">${escapeHtml(task.description)}</p>`
          : ''}
        ${created ? `<p class="task-meta">Creada el ${created}</p>` : ''}
      </div>

      <div class="task-actions">
        <button class="icon-btn" type="button" data-action="edit" aria-label="Editar tarea">
          ${ICONS.edit}
        </button>
        <button class="icon-btn is-danger" type="button" data-action="delete" aria-label="Eliminar tarea">
          ${ICONS.trash}
        </button>
      </div>
    </article>`;
}

function editTemplate(task) {
  return `
    <article class="task" data-id="${task.id}">
      <form class="edit-form" data-edit-form="${task.id}">
        <input class="edit-title" type="text" maxlength="120" required
               value="${escapeHtml(task.title)}" aria-label="Título de la tarea">

        <textarea class="edit-description" rows="2" maxlength="500"
                  aria-label="Descripción de la tarea">${escapeHtml(task.description || '')}</textarea>

        <div class="row">
          <button type="button" class="btn btn-sm btn-ghost" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-sm btn-primary">Guardar</button>
        </div>
      </form>
    </article>`;
}

function focusEdit() {
  requestAnimationFrame(() => {
    const input = els.list.querySelector('.edit-form .edit-title');
    if (input) {
      input.focus();
      input.select();
    }
  });
}

/* ---------- Operaciones contra la API ---------- */

async function loadTasks() {
  state.loading = true;
  render();

  try {
    const tasks = await api();
    state.tasks = tasks.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (error) {
    state.tasks = [];
    showToast(`No se pudieron cargar las tareas: ${error.message}`, 'error');
  } finally {
    state.loading = false;
    render();
  }
}

async function toggleTask(task) {
  try {
    const updated = await api(`/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        completed: !task.completed,
      }),
    });
    replaceTask(updated);
    render();
  } catch (error) {
    showToast(`No se pudo actualizar la tarea: ${error.message}`, 'error');
  }
}

async function saveTask(task, changes) {
  try {
    const updated = await api(`/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: changes.title,
        description: changes.description,
        completed: task.completed,
      }),
    });
    replaceTask(updated);
    state.editingId = null;
    render();
    showToast('Cambios guardados', 'success');
  } catch (error) {
    showToast(`No se pudo guardar la tarea: ${error.message}`, 'error');
  }
}

async function deleteTask(task) {
  const confirmed = window.confirm(`¿Eliminar la tarea "${task.title}"?`);
  if (!confirmed) return;

  try {
    await api(`/${task.id}`, { method: 'DELETE' });
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    if (state.editingId === task.id) state.editingId = null;
    render();
    showToast('Tarea eliminada', 'success');
  } catch (error) {
    showToast(`No se pudo eliminar la tarea: ${error.message}`, 'error');
  }
}

function replaceTask(updated) {
  state.tasks = state.tasks.map((task) =>
    task.id === updated.id ? updated : task
  );
}

/* ---------- Formulario de alta ---------- */

function setSubmitting(isSubmitting) {
  els.submitBtn.disabled = isSubmitting;
  els.submitBtn.style.opacity = isSubmitting ? '0.7' : '';
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = els.title.value.trim();
  const description = els.description.value.trim();

  if (!title) {
    els.title.classList.add('invalid');
    els.title.focus();
    showToast('Escribe un título para la tarea', 'error');
    return;
  }

  els.title.classList.remove('invalid');
  setSubmitting(true);

  try {
    const task = await api('', {
      method: 'POST',
      body: JSON.stringify({ title, description, completed: false }),
    });

    state.tasks.unshift(task);
    els.form.reset();
    state.filter = 'all';
    updateFilterButtons();
    render();
    showToast('Tarea añadida', 'success');
    els.title.focus();
  } catch (error) {
    showToast(`No se pudo añadir la tarea: ${error.message}`, 'error');
  } finally {
    setSubmitting(false);
  }
});

els.title.addEventListener('input', () => {
  els.title.classList.remove('invalid');
});

/* ---------- Acciones sobre la lista (delegación de eventos) ---------- */

els.list.addEventListener('click', async (event) => {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const taskEl = actionEl.closest('[data-id]');
  if (!taskEl) return;

  const id = Number(taskEl.dataset.id);
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  switch (actionEl.dataset.action) {
    case 'toggle':
      await toggleTask(task);
      break;
    case 'edit':
      state.editingId = id;
      render();
      focusEdit();
      break;
    case 'cancel':
      state.editingId = null;
      render();
      break;
    case 'delete':
      await deleteTask(task);
      break;
  }
});

els.list.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-edit-form]');
  if (!form) return;

  event.preventDefault();

  const id = Number(form.dataset.editForm);
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  const title = form.querySelector('.edit-title').value.trim();
  const description = form.querySelector('.edit-description').value.trim();

  if (!title) {
    form.querySelector('.edit-title').focus();
    showToast('El título no puede estar vacío', 'error');
    return;
  }

  await saveTask(task, { title, description });
});

/* ---------- Filtros ---------- */

function updateFilterButtons() {
  els.filters.forEach((button) => {
    const isActive = button.dataset.filter === state.filter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

els.filters.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    state.editingId = null;
    updateFilterButtons();
    render();
  });
});

/* ---------- Arranque ---------- */

updateFilterButtons();
loadTasks();
