# Talonario

Recibos de haberes en el navegador, con la estructura del Decreto 407/2026. No hay servidor de datos: todo queda en este navegador.

```bash
npm install
npm run dev
npm test
npm run build
```

`dist/` se sirve como sitio estático. Hay un `Caddyfile` de ejemplo en la raíz.

Desde «Archivo» en el sidebar, «Exportar a Excel» descarga un `.xlsx` cuya primera hoja, «Recibo», reproduce la distribución de impresión: encabezado, tablas, totales, composición salarial, gráfico y firmas, en A4 vertical. Las tablas contienen celdas editables e importes numéricos. El gráfico conserva sus etiquetas y la selección de color o blanco y negro como imagen de alta resolución; representa los valores al exportar y no se recalcula al editar Excel. La hoja «Datos» conserva además el detalle tabular y los cálculos pendientes. El nombre incluye el empleado y el período. «Guardar» y «Cargar» siguen usando JSON para continuar editando un recibo.

Al escribir un concepto aparecen sugerencias según el tipo de fila. Se pueden elegir con mouse o flechas y Enter; Escape cierra la lista. También se puede escribir cualquier concepto propio, con monto manual.

Los recibos nuevos y la acción «Vaciar» incluyen una plantilla editable con sueldo básico, descuentos de jubilación, Ley 19032 y obra social, y contribuciones de jubilación, Ley 19032, FNE, asignaciones familiares, obra social, ART porcentual y fija, y seguro de vida obligatorio. Las bases y tasas quedan vacías y los importes comienzan en cero. Los recibos guardados o importados conservan sus propias filas.

Los conceptos porcentuales del catálogo calculan el monto al completar Base y el porcentaje en Unidad. Las tasas las ingresa el usuario: no se asume un convenio ni régimen. El control «Automático» permite pasar a monto manual y volver a calcular. Los conceptos con fórmulas particulares (horas extra, aguinaldo y vacaciones) se cargan manualmente.

Los archivos nuevos usan la versión 2 y conservan la regla de cálculo. Se siguen aceptando archivos de versión 1; sus importes se mantienen manuales, igual que los recibos anteriores guardados en el navegador.
