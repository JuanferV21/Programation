# Guía de Estilo

Esta guía resume la identidad visual y las convenciones de diseño para el proyecto **SecureAuth**.

## Paleta de colores

| Uso               | Claro              | Oscuro             |
|-------------------|--------------------|--------------------|
| Fondo principal   | `#f4f6f9`          | `#121212`          |
| Tarjetas          | `#ffffff`          | `#1e1e1e`          |
| Texto principal   | `#212529`          | `#e1e1e1`          |
| Enlaces           | `#1a73e8`          | `#9bbcff`          |

Los colores se han verificado para cumplir las recomendaciones WCAG 2.1 en cuanto a contraste.

## Tipografías

- **Principal:** Poppins (`400`, `500`, `600`).
- **Complementaria:** el sistema utiliza las alternativas genéricas `sans-serif`.

## Espaciados

- Margen estándar: `1rem`.
- Radio de tarjeta: `1rem`.
- Ancho de barra lateral: `250px`.

## Componentes

El proyecto usa Bootstrap 5 como base. Los componentes se personalizan mediante las variables definidas en `css/modules/variables.css` y los estilos de `layout.css` y `components.css`.

## Accesibilidad

- Todos los botones tienen estados de foco visibles.
- Se utilizan etiquetas ARIA en controles interactivos.
- El tema seleccionado se almacena en `localStorage` y se aplica en todas las páginas.

