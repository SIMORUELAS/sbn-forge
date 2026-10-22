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
  document.getElementById('detail-placeholder').hidden = id === 'inspector' || id === 'diseno';
  document.querySelectorAll('[data-view]').forEach(el => {
    const selected = el.dataset.view === id;
    el.classList.toggle('active', selected);
    if (selected) { el.setAttribute('aria-current', 'page'); }
    else { el.removeAttribute('aria-current'); }
  });
  window.location.hash = id === 'inicio' ? '' : id;
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
document.getElementById('designer-import').addEventListener('click', () => {
  const message = document.getElementById('designer-message');
  if (!lastInspectedMetadata) {
    message.textContent = 'Primero inspecciona una tabla en Inspector PostgreSQL.';
    return;
  }
  const metadata = lastInspectedMetadata;
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
    row.appendChild(createDesignerCheckbox(column, 'visible', true, false));
    row.appendChild(createDesignerCheckbox(column, 'editable', !primaryKeys.has(column.name) && !column.identity, primaryKeys.has(column.name) || column.identity));
    row.appendChild(createDesignerCheckbox(column, 'required', !column.nullable && column.defaultValue == null && !primaryKeys.has(column.name), primaryKeys.has(column.name)));
    rows.appendChild(row);
  }
  document.getElementById('designer-fields').hidden = false;
  document.getElementById('designer-export').disabled = false;
  message.textContent = 'Campos importados. Ajusta su configuración y exporta la definición.';
});
document.getElementById('designer-export').addEventListener('click', () => {
  if (!lastInspectedMetadata) { return; }
  const metadata = lastInspectedMetadata;
  const fields = (metadata.columns || []).map(column => {
    const options = {};
    for (const property of ['visible', 'editable', 'required']) {
      const input = [...document.querySelectorAll('#designer-field-rows input')].find(el => el.dataset.column === column.name && el.dataset.property === property);
      options[property] = Boolean(input?.checked);
    }
    return { name: column.name, dataType: column.dataType, nullable: column.nullable, ...options };
  });
  const definition = {
    version: 1,
    name: document.getElementById('designer-name').value.trim() || metadata.table,
    source: { type: 'postgresql', schema: metadata.schema, table: metadata.table },
    primaryKey: metadata.primaryKey,
    foreignKeys: metadata.foreignKeys,
    fields
  };
  const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'forge-' + metadata.schema + '-' + metadata.table + '.json';
  link.click();
  URL.revokeObjectURL(url);
  document.getElementById('designer-message').textContent = 'Definición exportada. Todavía no se ha generado ni publicado ningún módulo.';
});
