---
title: "Implementar Exportación Profesional para Arquitectos (DXF/PDF)"
labels:
  - enhancement
  - architect-tools
  - feature
assignees: []
---

## Descripción
Habilitar una funcionalidad profesional para compartir el diseño de la casa con arquitectos, permitiendo la interoperabilidad con software CAD (AutoCAD, Revit) y la presentación formal de planos.

## Enfoque Técnico Recomendado
1. **Exportación DXF (Vectorial)**: Generar archivos DXF directamente desde el modelo JSON. Esto permitirá al arquitecto importar el plano sin perder precisión ni escalas. Usaremos `dxf-writer` o una implementación manual de la especificación DXF.
2. **Plano Técnico PDF**: Exportar un PDF de alta resolución que incluya un "Cajetín Arquitectónico" (Título, Escala 1:50, Fecha, Propietario) similar a la estética blueprint implementada.
3. **Parametrización JSON**: El archivo JSON servirá como el "modelo fuente" para cualquier modificación posterior por parte del arquitecto si usa herramientas compatibles.

## Tareas
- [ ] Investigar e instalar librería `dxf-writer` o equivalente para Svelte.
- [ ] Implementar mapeador `JSON -> DXF` (Muros, Zonas, Dimensiones).
- [ ] Crear componente de "Cajetín" (Title Block) para exportaciones formales.
- [ ] Implementar exportación PDF usando `html2canvas` + `jsPDF` con DPI alto (300dpi).
- [ ] Añadir botón "Generar Paquete para Arquitecto" (ZIP con JSON, DXF y PDF).

## Criterios de Aceptación
- El archivo DXF abre correctamente en un visor CAD conservando las medidas.
- El PDF exportado mantiene la escala y es legible en tamaño A1/A2.
- Se incluye la información del ancho de los muros (15cm) en los metadatos.
