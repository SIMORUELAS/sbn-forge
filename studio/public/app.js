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
