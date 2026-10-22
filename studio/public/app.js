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
  document.getElementById('detail-placeholder').hidden = id === 'inspector';
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
function renderMetadata(metadata) {
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
