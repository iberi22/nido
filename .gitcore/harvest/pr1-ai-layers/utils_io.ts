import { floorPlanStore } from '../stores/floorPlanStore.svelte';

export class IOManager {
  static exportDesign() {
    const data = {
      project: floorPlanStore.project,
      config: floorPlanStore.config,
      norms: floorPlanStore.norms,
      floors: floorPlanStore.floors
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-plan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static importDesign(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        // Update store
        if (data.project) floorPlanStore.project = data.project;
        if (data.config) floorPlanStore.config = data.config;
        if (data.norms) floorPlanStore.norms = data.norms;
        if (data.floors) floorPlanStore.floors = data.floors;

        // Reset view
        floorPlanStore.currentFloorId = Object.keys(data.floors)[0] || 'ground';

        alert('Diseño importado exitosamente.');
      } catch (err) {
        console.error('Error importing design:', err);
        alert('Error al importar el archivo JSON.');
      }
    };
    reader.readAsText(file);
  }
}
