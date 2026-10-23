'use strict';
const sections = {
  inicio: ['Inicio', ''],
  conexiones: ['Conexiones', 'Administra conexiones PostgreSQL autorizadas.'],
  inspector: ['Inspector PostgreSQL', 'Explora esquemas, tablas, campos, claves y relaciones.'],
  diseno: ['Diseño de módulo', 'Configura recursos, formularios, permisos y reglas de negocio.'],
  generacion: ['Generación', 'Revisa el plan de backend, frontend, documentación y pruebas.'],
  modulos: ['Módulos', 'Gestiona los módulos y sus versiones.'],
  plantillas: ['Plantillas', 'Administra plantillas y convenciones SBN.'],
  reglas: ['Reglas SBN', 'Revisa estándares, validaciones y capacidades automáticas.'],
  historial: ['Historial', 'Consulta ejecuciones y registros de auditoría.'],
  configuracion: ['Configuración', 'Configura las preferencias de Studio.']
};
function showSection(id) {
  if (!Object.prototype.hasOwnProperty.call(sections, id)) { id = 'inicio'; }
  const [title, description] = sections[id];
  document.getElementById('current-section').textContent = title;
  document.getElementById('home-view').hidden = id !== 'inicio';
  document.getElementById('detail-view').hidden = id === 'inicio';
  document.getElementById('detail-title').textContent = title;
  document.getElementById('detail-description').textContent = description;
  document.getElementById('inspector-workspace').hidden = id !== 'inspector';
  document.getElementById('designer-workspace').hidden = id !== 'diseno';
  document.getElementById('generation-workspace').hidden = id !== 'generacion';
  document.getElementById('history-workspace').hidden = id !== 'historial';
  document.getElementById('detail-placeholder').hidden = id === 'inspector' || id === 'diseno' || id === 'generacion' || id === 'historial';
  document.querySelectorAll('[data-view]').forEach(el => {
    const selected = el.dataset.view === id;
    el.classList.toggle('active', selected);
    if (selected) { el.setAttribute('aria-current', 'page'); }
    else { el.removeAttribute('aria-current'); }
  });
  window.location.hash = id === 'inicio' ? '' : id;
  if (id === 'historial' || id === 'generacion') { refreshRuns().catch(() => {}); }
}
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => showSection(el.dataset.view)));
document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => showSection(el.dataset.go)));
document.getElementById('back-home').addEventListener('click', () => showSection('inicio'));
window.addEventListener('hashchange', () => showSection(window.location.hash.slice(1)));
showSection(window.location.hash.slice(1));

function addTextItem(parent, value) {
  const item = document.createElement('li');
  item.textContent = value;
  parent.appendChild(item);
}
let lastInspectedMetadata = null;
function renderMetadata(metadata) {
  lastInspectedMetadata = metadata;
  document.getElementById('inspect-heading').textContent = metadata.schema + '.' + metadata.table;
  const columns = document.getElementById('inspect-columns');
  columns.replaceChildren();
  for (const column of metadata.columns || []) {
    const row = document.createElement('tr');
    for (const value of [column.name, column.nativeType || column.dataType, column.nullable ? 'Sí' : 'No']) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      row.appendChild(cell);
    }
    columns.appendChild(row);
  }
  document.getElementById('inspect-primary-key').textContent = (metadata.primaryKey?.columns || []).join(', ') || 'Sin clave primaria';
  const fks = document.getElementById('inspect-foreign-keys');
  fks.replaceChildren();
  for (const fk of metadata.foreignKeys || []) {
    addTextItem(fks, fk.column + ' → ' + fk.referencedSchema + '.' + fk.referencedTable + '.' + fk.referencedColumn);
  }
  const indexes = document.getElementById('inspect-indexes');
  indexes.replaceChildren();
  for (const index of metadata.indexes || []) { addTextItem(indexes, index.name); }
  document.getElementById('inspect-results').hidden = false;
}
document.getElementById('inspect-form').addEventListener('submit', async event => {
  event.preventDefault();
  const schema = document.getElementById('inspect-schema').value.trim();
  const table = document.getElementById('inspect-table').value.trim();
  const message = document.getElementById('inspect-message');
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  message.textContent = 'Inspeccionando tabla...';
  document.getElementById('inspect-results').hidden = true;
  submit.disabled = true;
  try {
    const params = new URLSearchParams({ schema, table });
    const response = await fetch('/api/studio/inspect?' + params.toString());
    const data = await response.json();
    if (!response.ok) { throw new Error(data.error || 'No fue posible inspeccionar la tabla'); }
    renderMetadata(data);
    message.textContent = 'Inspección completada en modo de solo lectura.';
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

document.getElementById('inspect-load-tables').addEventListener('click', async () => {
  const schema = document.getElementById('inspect-schema').value.trim();
  const message = document.getElementById('inspect-message');
  const selector = document.getElementById('inspect-table-list');
  const button = document.getElementById('inspect-load-tables');
  button.disabled = true;
  message.textContent = 'Consultando tablas disponibles...';
  selector.replaceChildren();
  const initial = document.createElement('option');
  initial.value = '';
  initial.textContent = 'Seleccionar tabla…';
  selector.appendChild(initial);
  try {
    const response = await fetch('/api/studio/tables?' + new URLSearchParams({ schema }));
    const result = await response.json();
    if (!response.ok) { throw new Error(result.error || 'No fue posible consultar las tablas'); }
    for (const table of result.tables) {
      const option = document.createElement('option');
      option.value = table;
      option.textContent = table;
      selector.appendChild(option);
    }
    message.textContent = result.tables.length + ' tablas disponibles en ' + schema + '.';
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
document.getElementById('inspect-table-list').addEventListener('change', event => {
  if (event.target.value) { document.getElementById('inspect-table').value = event.target.value; }
});

function createDesignerCheckbox(column, property, checked, disabled) {
  const cell = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.column = column.name;
  input.dataset.property = property;
  input.checked = checked;
  input.disabled = disabled;
  cell.appendChild(input);
  return cell;
}
function renderDesigner(metadata, savedDefinition = null) {
  const message = document.getElementById('designer-message');
  if (!lastInspectedMetadata) {
    message.textContent = 'Primero inspecciona una tabla en Inspector PostgreSQL.';
    return;
  }
  const primaryKeys = new Set(metadata.primaryKey?.columns || []);
  document.getElementById('designer-name').value = metadata.table;
  document.getElementById('designer-source').textContent = metadata.schema + '.' + metadata.table;
  const rows = document.getElementById('designer-field-rows');
  rows.replaceChildren();
  for (const column of metadata.columns || []) {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = column.name;
    const type = document.createElement('td');
    type.textContent = column.nativeType || column.dataType;
    row.append(name, type);
    const saved = savedDefinition?.fields?.find(field => field.name === column.name);
    const systemField = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/.test(column.name);
    const protectedField = primaryKeys.has(column.name) || column.identity || systemField;
    const hasDefault = column.defaultValue !== null && column.defaultValue !== undefined;
    const required = !column.nullable && !hasDefault && !protectedField;
    row.appendChild(createDesignerCheckbox(column, 'visible', saved ? saved.visible : !systemField, false));
    row.appendChild(createDesignerCheckbox(column, 'editable', saved ? saved.editable : !protectedField, protectedField));
    row.appendChild(createDesignerCheckbox(column, 'required', saved ? saved.required : required, protectedField));
    rows.appendChild(row);
  }
  document.getElementById('designer-fields').hidden = false;
  document.getElementById('designer-export').disabled = false;
  document.getElementById('designer-save').disabled = false;
  message.textContent = savedDefinition ? 'Definición recuperada. Puedes modificarla y volver a guardarla.' : 'Campos importados. Ajusta su configuración y guarda o exporta la definición.';
}
document.getElementById('designer-import').addEventListener('click', () => {
  if (!lastInspectedMetadata) { document.getElementById('designer-message').textContent = 'Primero inspecciona una tabla en Inspector PostgreSQL.'; return; }
  renderDesigner(lastInspectedMetadata);
});
function buildDesignerDefinition() {
  if (!lastInspectedMetadata) { throw new Error('Primero importa o abre una definición'); }
  const metadata = lastInspectedMetadata;
  const fields = (metadata.columns || []).map(column => {
    const options = {};
    for (const property of ['visible', 'editable', 'required']) {
      const input = [...document.querySelectorAll('#designer-field-rows input')].find(el => el.dataset.column === column.name && el.dataset.property === property);
      options[property] = Boolean(input?.checked);
    }
    const field = { name: column.name, dataType: column.dataType, nullable: column.nullable, ...options };
    for (const property of ['defaultValue', 'identity', 'maxLength', 'precision', 'scale']) {
      if (Object.prototype.hasOwnProperty.call(column, property)) { field[property] = column[property]; }
    }
    return field;
  });
  return {
    version: 1,
    name: document.getElementById('designer-name').value.trim() || metadata.table,
    source: { type: 'postgresql', schema: metadata.schema, table: metadata.table },
    primaryKey: metadata.primaryKey,
    foreignKeys: metadata.foreignKeys,
    fields
  };
}
document.getElementById('designer-export').addEventListener('click', () => {
  const definition = buildDesignerDefinition();
  const metadata = lastInspectedMetadata;
  const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'forge-' + metadata.schema + '-' + metadata.table + '.json';
  link.click();
  URL.revokeObjectURL(url);
  document.getElementById('designer-message').textContent = 'Definición exportada. Todavía no se ha generado ni publicado ningún módulo.';
});

async function refreshSavedDefinitions() {
  const response = await fetch('/api/studio/definitions');
  const data = await response.json();
  if (!response.ok) { throw new Error(data.error || 'No fue posible consultar las definiciones'); }
  const select = document.getElementById('designer-saved-list');
  select.replaceChildren();
  const initial = document.createElement('option');
  initial.value = '';
  initial.textContent = 'Seleccionar definición…';
  select.appendChild(initial);
  for (const name of data.definitions) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
}
document.getElementById('designer-refresh').addEventListener('click', async () => {
  try {
    await refreshSavedDefinitions();
    document.getElementById('designer-message').textContent = 'Lista de definiciones actualizada.';
  } catch (error) { document.getElementById('designer-message').textContent = error.message; }
});
document.getElementById('designer-save').addEventListener('click', async () => {
  const message = document.getElementById('designer-message');
  const button = document.getElementById('designer-save');
  button.disabled = true;
  try {
    const response = await fetch('/api/studio/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDesignerDefinition())
    });
    const result = await response.json();
    if (!response.ok) { throw new Error(result.error || 'No fue posible guardar la definición'); }
    await refreshSavedDefinitions();
    document.getElementById('designer-saved-list').value = result.name;
    message.textContent = 'Definición guardada localmente: ' + result.name + '.';
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
document.getElementById('designer-open').addEventListener('click', async () => {
  const message = document.getElementById('designer-message');
  const name = document.getElementById('designer-saved-list').value;
  if (!name) { message.textContent = 'Selecciona una definición guardada.'; return; }
  try {
    const response = await fetch('/api/studio/definitions/' + encodeURIComponent(name));
    const definition = await response.json();
    if (!response.ok) { throw new Error(definition.error || 'No fue posible abrir la definición'); }
    lastInspectedMetadata = {
      schema: definition.source.schema,
      table: definition.source.table,
      primaryKey: definition.primaryKey,
      foreignKeys: definition.foreignKeys,
      columns: definition.fields
    };
    renderDesigner(lastInspectedMetadata, definition);
    document.getElementById('designer-name').value = definition.name;
  } catch (error) { message.textContent = error.message; }
});

document.getElementById('designer-preview').addEventListener('click', async () => {
  const message = document.getElementById('designer-message');
  const name = document.getElementById('designer-saved-list').value;
  const panel = document.getElementById('designer-preview-result');
  panel.hidden = true;
  if (!name) { message.textContent = 'Selecciona una definición guardada para previsualizar.'; return; }
  try {
    const response = await fetch('/api/studio/preview/' + encodeURIComponent(name));
    const result = await response.json();
    if (!response.ok) { throw new Error(result.error || 'No fue posible previsualizar'); }
    document.getElementById('designer-preview-json').textContent = JSON.stringify(result, null, 2);
    panel.hidden = false;
    message.textContent = !result.compatible
      ? 'Contrato Forge no compatible. Revisa las advertencias.'
      : result.readyForGeneration
        ? 'Contrato compatible y metadatos completos para revisión de generación. No se ha generado código.'
        : 'Contrato compatible, pero todavía NO está preparado para generación. Revisa blockers.';
  } catch (error) { message.textContent = error.message; }
});

async function refreshGenerationDefinitions() {
  const response = await fetch('/api/studio/definitions');
  const result = await response.json();
  if (!response.ok) { throw new Error(result.error || 'No se pudieron consultar las definiciones'); }
  const select = document.getElementById('generation-definition');
  const previous = select.value;
  select.replaceChildren();
  const initial = document.createElement('option');
  initial.value = '';
  initial.textContent = 'Seleccionar definición…';
  select.appendChild(initial);
  for (const name of result.definitions) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  if (result.definitions.includes(previous)) { select.value = previous; }
  document.getElementById('generation-message').textContent = select.value ? 'Definición seleccionada: ' + select.value : 'Selecciona una definición.';
}
document.getElementById('generation-refresh').addEventListener('click', async () => {
  try {
    await refreshGenerationDefinitions();
    document.getElementById('generation-message').textContent = 'Definiciones actualizadas.';
  } catch (error) { document.getElementById('generation-message').textContent = error.message; }
});
document.getElementById('generation-plan').addEventListener('click', async () => {
  const name = document.getElementById('generation-definition').value;
  const message = document.getElementById('generation-message');
  document.getElementById('generation-result').hidden = true;
  if (!name) { message.textContent = 'Selecciona una definición guardada.'; return; }
  try {
    const response = await fetch('/api/studio/generation-plan/' + encodeURIComponent(name));
    const plan = await response.json();
    if (!response.ok) { throw new Error(plan.error || 'No se pudo preparar el plan'); }
    document.getElementById('generation-json').textContent = JSON.stringify(plan, null, 2);
    document.getElementById('generation-result').hidden = false;
    message.textContent = plan.readyForGeneration
      ? 'Plan preparado para revisión. No se generaron archivos ni se publicó código.'
      : 'Plan preliminar con bloqueos. Revisa los detalles antes de continuar.';
  } catch (error) { message.textContent = error.message; }
});
refreshGenerationDefinitions().catch(() => {});

let activeRun = null;
const integrityLabels = {
  verified: 'Verificada (SHA-256)',
  'legacy-unverified': 'Sin huella histórica',
  corrupt: 'Alterada o incompleta',
  missing: 'Directorio no disponible'
};
function integrityText(run) { return integrityLabels[run.integrity] || 'Sin verificar'; }
async function refreshRuns() {
  const response = await fetch('/api/studio/runs');
  const data = await response.json();
  if (!response.ok) { throw new Error(data.error || 'Historial no disponible'); }
  const list = document.getElementById('generation-runs-list');
  list.replaceChildren();
  const counts = { verified: 0, 'legacy-unverified': 0, corrupt: 0, missing: 0 };
  for (const run of data.runs) {
    if (Object.prototype.hasOwnProperty.call(counts, run.integrity)) { counts[run.integrity]++; }
    const tr = document.createElement('tr');
    const values = [new Date(run.createdAt).toLocaleString('es-MX'), run.name,
      integrityText(run), String(run.totals.written), 'No'];
    for (const value of values) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'run-entry';
    button.textContent = 'Revisar';
    button.addEventListener('click', () => {
      showSection('generacion');
      selectRun(run);
    });
    action.appendChild(button);
    tr.appendChild(action);
    list.appendChild(tr);
  }
  document.getElementById('generation-integrity-summary').textContent =
    data.runs.length + ' ejecuciones · ' + counts.verified + ' verificadas · ' +
    counts['legacy-unverified'] + ' históricas sin SHA-256 · ' +
    (counts.corrupt + counts.missing) + ' con incidencias';
  const historyContainer = document.getElementById('history-table-container');
  const table = list.closest('table');
  const historyTable = table.cloneNode(true);
  historyTable.querySelectorAll('tbody tr').forEach((tr, index) => {
    const button = tr.querySelector('button');
    if (button) {
      const run = data.runs[index];
      button.addEventListener('click', () => { showSection('generacion'); selectRun(run); });
    }
  });
  historyContainer.replaceChildren(historyTable);
  document.getElementById('history-message').textContent =
    'Historial persistente: ' + data.runs.length + ' ejecuciones · sin publicación.';
  if (activeRun) {
    const updated = data.runs.find(run => run.id === activeRun.id);
    if (updated) { selectRun(updated); }
    else {
      activeRun = null;
      document.getElementById('generation-run-detail').hidden = true;
      document.getElementById('generation-file').replaceChildren();
      document.getElementById('generation-file-content').textContent = '';
    }
  }
}
function selectRun(run) {
  activeRun = run;
  const select = document.getElementById('generation-file');
  const previous = select.value;
  select.replaceChildren();
  const rows = document.getElementById('generation-artifact-rows');
  rows.replaceChildren();
  for (const file of run.artifacts) {
    const option = document.createElement('option');
    option.value = file.path;
    option.textContent = file.path + ' (' + file.bytes + ' bytes)';
    select.appendChild(option);
    const tr = document.createElement('tr');
    for (const value of [file.path, String(file.bytes), file.sha256 || 'No disponible (histórico)']) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }
    rows.appendChild(tr);
  }
  if ([...select.options].some(option => option.value === previous)) { select.value = previous; }
  const status = document.getElementById('generation-run-status');
  status.textContent = 'Integridad: ' + integrityText(run) + '. Publicación: No. ' +
    ((run.integrity === 'corrupt' || run.integrity === 'missing')
      ? 'Advertencia: no se permite revisar los archivos de esta ejecución.'
      : run.integrity === 'legacy-unverified'
        ? 'Esta ejecución es anterior al registro de huellas SHA-256.'
        : 'Los archivos coinciden con las huellas registradas.');
  status.className = run.integrity === 'corrupt' || run.integrity === 'missing' ? 'integrity-warning' : '';
  const diagnosticStatus = document.getElementById('generation-diagnostics-status');
  const diagnosticChecks = document.getElementById('generation-diagnostics-checks');
  diagnosticChecks.replaceChildren();
  diagnosticStatus.textContent = run.diagnostics ? 'Resultado: ' + run.diagnostics.status : 'Diagnóstico no disponible para esta ejecución histórica.';
  for (const check of run.diagnostics?.checks || []) {
    const li = document.createElement('li');
    li.textContent = check.status.toUpperCase() + ' · ' + check.check + ' · ' + (check.path || 'General') + ' · ' + check.message;
    if (check.status === 'failed') { li.className = 'integrity-warning'; }
    diagnosticChecks.appendChild(li);
  }
  const installationStatus = document.getElementById('generation-installation-status');
  const installationChecks = document.getElementById('generation-installation-checks');
  installationChecks.replaceChildren();
  installationStatus.textContent = run.installation
    ? 'Resultado: ' + run.installation.status + ' · Instalación: deshabilitada · Publicación: no'
    : 'Informe no disponible para esta ejecución histórica.';
  for (const check of run.installation?.checks || []) {
    const li = document.createElement('li');
    li.textContent = check.status.toUpperCase() + ' · ' + check.check + ' · ' + check.message;
    if (check.status === 'blocked') { li.className = 'integrity-warning'; }
    installationChecks.appendChild(li);
  }
  document.getElementById('generation-run-detail').hidden = false;
  document.getElementById('generation-open-file').disabled = run.integrity === 'corrupt' || run.integrity === 'missing';
  document.getElementById('generation-file-content').textContent = '';
  renderCode('', 'Sin archivo seleccionado');
}
document.getElementById('generation-history').addEventListener('click', async () => {
  try { await refreshRuns(); } catch (error) { document.getElementById('generation-message').textContent = error.message; }
});
document.getElementById('generation-execute').addEventListener('click', async () => {
  const name = document.getElementById('generation-definition').value;
  const message = document.getElementById('generation-message');
  if (!name) { message.textContent = 'Selecciona una definición.'; return; }
  if (!window.confirm('Generar únicamente en una carpeta temporal local, sin publicar?')) { return; }
  const button = document.getElementById('generation-execute');
  button.disabled = true;
  try {
    const response = await fetch('/api/studio/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok) { throw new Error(result.error || 'Generación no autorizada'); }
    await refreshRuns();
    const latest = await fetch('/api/studio/runs').then(response => response.json());
    selectRun(latest.runs.find(run => run.id === result.id) || result);
    message.textContent = 'Generados ' + result.totals.written + ' archivos aislados. No publicados.';
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});
document.getElementById('generation-open-file').addEventListener('click', async () => {
  const file = document.getElementById('generation-file').value;
  if (!activeRun || !file) { return; }
  try {
    const response = await fetch('/api/studio/runs/' + activeRun.id + '/file?' + new URLSearchParams({ path: file }));
    const data = await response.json();
    if (!response.ok) { throw new Error(data.error || 'Archivo no disponible'); }
    document.getElementById('generation-file-content').textContent = data.content;
    renderCode(data.content, file);
  } catch (error) { document.getElementById('generation-message').textContent = error.message; }
});
refreshRuns().catch(() => {});

function renderCode(content, filename) {
  document.getElementById('generation-code-filename').textContent = filename;
  const container = document.getElementById('generation-code-lines');
  container.replaceChildren();
  if (!content) { return; }
  const lines = content.split('\\n');
  lines.forEach((line, index) => {
    const row = document.createElement('div');
    row.className = 'code-line';
    const number = document.createElement('span');
    number.className = 'code-number';
    number.textContent = String(index + 1);
    const text = document.createElement('span');
    text.className = 'code-text';
    text.textContent = line;
    row.append(number, text);
    container.appendChild(row);
  });
}
document.getElementById('history-refresh').addEventListener('click', async () => {
  try { await refreshRuns(); }
  catch (error) { document.getElementById('history-message').textContent = error.message; }
});
document.getElementById('history-go-generation').addEventListener('click', () => showSection('generacion'));

document.getElementById('generation-code-wrap').addEventListener('change', event => {
  document.getElementById('generation-code-lines').classList.toggle('code-wrapped', event.target.checked);
});
