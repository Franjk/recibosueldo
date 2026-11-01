# Recibo de Sueldo Argentina

Recibo de Sueldo Argentina es una aplicación web gratuita para completar recibos de sueldo argentinos. Funciona en el navegador y permite editar datos del empleador, del empleado y del período, cargar conceptos salariales, revisar los totales e imprimir el recibo o guardarlo como PDF.

## Qué se puede hacer

- Agregar, editar, quitar y reordenar filas de haberes remunerativos, haberes no remunerativos, deducciones y contribuciones del empleador.
- Elegir conceptos sugeridos o escribir conceptos propios.
- Cargar importes manualmente o calcular conceptos porcentuales a partir de una base y un porcentaje ingresados por la persona usuaria.
- Consultar el sueldo bruto, el sueldo neto, el costo del empleador y la composición salarial.
- Imprimir en formato A4 o guardar el resultado como PDF desde el diálogo de impresión del navegador.
- Guardar una copia editable en JSON e importar después ese archivo.

## Cómo se calculan los totales

- **Sueldo bruto:** suma de los haberes remunerativos.
- **Sueldo neto:** haberes remunerativos más haberes no remunerativos, menos deducciones.
- **Costo del empleador:** haberes remunerativos más contribuciones del empleador.

En los conceptos porcentuales automáticos, el importe se calcula con la base y el porcentaje que se ingresen. Si falta alguno de esos datos, el importe de esa fila cuenta como cero en los totales. Los conceptos con fórmulas particulares, como horas extra, aguinaldo y vacaciones, se cargan manualmente.

## Datos y límites

Los cambios se conservan en el almacenamiento local del navegador. La aplicación no utiliza un servidor para almacenar recibos. Para trasladar un recibo a otro navegador o equipo, hay que descargar el archivo JSON y cargarlo allí.

La plantilla inicial incluye conceptos habituales, pero deja las bases y tasas vacías y los importes en cero. La aplicación no determina las alícuotas legales vigentes ni verifica que un recibo cumpla con un convenio colectivo o la normativa aplicable. La exportación a Excel no está disponible en la interfaz actual.

Esta guía describe el funcionamiento de la aplicación; no es asesoramiento laboral, contable ni legal.
