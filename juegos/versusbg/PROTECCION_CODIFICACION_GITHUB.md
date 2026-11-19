# Protección de Codificación y Seguridad — Versus Jugón (versusbg-web)

## Descripción General
Este repositorio contiene la aplicación **Versus Jugón (`versusbg-web`)**, parte de la suite oficial de **Amigos Jugones**.

## Protocolos de Marca y Seguridad
1. **Modelos de Codificación de Marca:**
   - Conservación obligatoria de la paleta oficial (`#120822`, `#ffd100`, `#ff2e4c`, `#00c2a8`, `#e85d9e`).
   - Requerimiento de inclusión del encabezado con destellos, la insignia de comunidad y el pie de página institucional en la web (`app-footer glass-footer`).
   - Requerimiento de renderizado del pie de página en los canvas exportados (`drawCardFooterOnCanvas`).

2. **Sistema de Nombres Reservados:**
   - La lista `PROTECTED_NAMES` (`amigosjugonesymas`, `amigosjugones`, `black`, `jessy`) está protegida mediante verificación de clave de administración (`PROTECTED_SECRET_PASS`).

3. **Garantía de Codificación UTF-8:**
   - Todos los archivos HTML, CSS y JS se encuentran estructurados bajo el estándar UTF-8 sin BOM para evitar corrupción de caracteres en GitHub y servidores de hosting.
