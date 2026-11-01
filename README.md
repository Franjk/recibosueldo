# Recibo de Sueldo Argentina

Recibo de Sueldo Argentina es una aplicación web para completar recibos de haberes en el navegador. Permite editar los datos del empleador y del empleado, cargar conceptos, consultar los totales y la composición salarial, e imprimir el recibo o guardarlo como PDF. Los datos se conservan en el almacenamiento local del navegador; la aplicación no usa un servidor de datos.

## Usar la aplicación

1. Completá los datos del encabezado y del período.
2. Editá las filas de contribuciones, haberes y descuentos. Podés agregar o quitar filas, cambiar su tipo o rubro y reordenarlas arrastrando el control de cada fila o con sus flechas del teclado.
3. Escribí un concepto propio o elegí una sugerencia del catálogo. Las sugerencias se pueden recorrer con las flechas, seleccionar con `Enter` y cerrar con `Escape`.
4. Revisá el sueldo bruto, el neto, el costo total del empleador y el detalle de la composición salarial. El gráfico puede mostrarse en color o en blanco y negro.
5. Usá **Imprimir o guardar PDF** para abrir el diálogo de impresión del navegador. El recibo está preparado para papel A4.

Los recibos nuevos incluyen una plantilla editable con sueldo básico, aportes y contribuciones habituales. Las bases y los porcentajes empiezan vacíos, y los montos en cero. La aplicación no carga tasas por defecto: ingresá las que correspondan a cada recibo.

Al seleccionar un concepto porcentual, completá **Base** y el porcentaje en **Unidad** para calcular el monto. Si falta alguno, la fila indica qué dato falta y su monto se considera cero en los totales. El control **Automático** permite pasar a un monto manual y volver al cálculo. Los conceptos con fórmulas particulares, como horas extra, aguinaldo y vacaciones, se cargan manualmente.

## Guardar y recuperar recibos

- Los cambios se conservan automáticamente en el almacenamiento local de este navegador.
- **Guardar** descarga una copia editable en formato JSON y guarda otra copia local. El nombre del archivo toma los datos disponibles del empleado y del período.
- **Cargar** abre un archivo JSON y, tras pedir confirmación, reemplaza el recibo que está en pantalla.
- **Vaciar** pide confirmación y restaura la plantilla inicial con los datos del recibo en blanco.

Conservá el archivo JSON si necesitás abrir el recibo en otro navegador o equipo. Los archivos nuevos usan la versión 2 del formato; también se aceptan archivos de la versión 1, cuyos montos se mantienen manuales.

La exportación a Excel está deshabilitada en la interfaz actual. El repositorio contiene código para generar archivos `.xlsx`, pero esa opción no aparece en la aplicación.

## Desarrollo local

Necesitás Node.js y npm. Desde la raíz del proyecto:

```bash
npm ci
npm run dev
```

Abrí la dirección local que muestra Vite. Para comprobar el proyecto:

```bash
npm test
npm run lint
npm run build
```

`npm test` ejecuta las pruebas con Vitest; `npm run lint` ejecuta Oxlint. `npm run build` comprueba TypeScript y genera el sitio estático en `dist/`. Podés revisar ese resultado localmente con `npm run preview`.

## Publicación

Publicá el contenido de `dist/` en un servidor de archivos estáticos. El [`Caddyfile`](Caddyfile) de la raíz es un ejemplo: reemplazá el dominio y ajustá la ruta del directorio antes de usarlo.

El build de GitHub Pages incluye la URL canónica `https://franjk.github.io/recibosueldo/` y un `sitemap.xml`. Para publicar en otro dominio, ejecutá el build con `SITE_URL=https://tu-dominio.example/` para generar ambos con la URL correcta. Si no definís `SITE_URL` fuera de GitHub Pages, se omiten la URL canónica y el sitemap.

Para facilitar la lectura por asistentes de IA, el sitio publica [`llms.txt`](public/llms.txt) y una [guía en Markdown](public/recibo-de-sueldo.md) con las funciones, los cálculos y los límites de la aplicación. Ambos archivos se copian al sitio durante el build.

## Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).
