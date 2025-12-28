# UX Research: Bottom Navigation Bar para XCrapper

## Contexto del Proyecto

**App**: XCrapper - Gestor de tweets con scraping automatizado
**Secciones actuales**: Inbox, Cola, Publicados, Config
**Controles de sistema**: Scraping on/off, Auto-publish timer
**Flujo principal**: Inbox -> Cola -> Publicados

---

## 1. Numero Optimo de Items en Bottom Nav

### Hallazgos de la Investigacion

| Fuente | Recomendacion |
|--------|---------------|
| Material Design 3 | 3-5 destinos de importancia similar |
| Apple HIG | 3-5 tabs como maximo |
| UX Best Practices | 3-5 items es el "sweet spot" |

**Por que 3-5 items:**
- Mas de 5 items: los targets tactiles quedan demasiado cerca entre si
- Menos de 3 items: no justifica usar bottom nav (mejor usar tabs simples)
- 4-5 items: mostrar labels solo en el item activo
- 3 items: mostrar labels siempre

### Recomendacion para XCrapper

**Opcion A: Mantener 4 items (Recomendado)**
```
[Inbox] [Cola] [Publicados] [Config]
```
- Razon: 4 items esta dentro del rango optimo
- Config ES una seccion principal, aunque menos frecuente
- El flujo Inbox->Cola->Publicados se mantiene visualmente conectado
- Material Design permite 4 items con labels siempre visibles

**Opcion B: 3 items + Config en header**
```
[Inbox] [Cola] [Publicados]     [gear icon en top bar]
```
- Config seria accesible desde un icono de engranaje en el header
- Pros: Enfoca la nav en el flujo principal
- Contras: Oculta Config, puede confundir usuarios que buscan settings

**Mi recomendacion: Opcion A con 4 items**
- Apps similares como Buffer mantienen Settings en la navegacion principal
- Config no es tan secundaria en XCrapper (AI models, scraping config son criticos)

---

## 2. Jerarquia Visual: Contadores/Badges

### Best Practices de Badges

**Posicionamiento:**
- Esquina superior derecha del icono (estandar universal)
- 16px de altura de contenedor es el tamano estandar
- Forma pill (bordes redondeados) es la mas comun

**Contenido:**
- Numeros cortos: "5", "12", "99+"
- Para conteos grandes: usar "1k+" en lugar de "1000"
- Dot badges (sin numero) para alertas simples

**Comportamiento:**
- Limpiar el badge cuando el usuario visita la seccion
- Solo usar badges para informacion importante/accionable

### Aplicacion a XCrapper

```
Bottom Nav Visual:

   [5]         [3]
[Inbox]  [Cola]  [Publicados]  [Config]
   *
```

**Donde mostrar badges:**
| Seccion | Badge | Justificacion |
|---------|-------|---------------|
| Inbox | Si - Contador | Tweets pendientes de revisar (accionable) |
| Cola | Si - Contador | Tweets listos para publicar |
| Publicados | No | Informativo, no accionable |
| Config | No | Sin notificaciones |

**Diseno del badge:**
```css
.badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--accent); /* Cyan de la app */
  color: var(--bg-root);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
}

/* Para numeros grandes */
.badge-large {
  /* Cuando es 100+, mostrar "99+" */
}
```

---

## 3. Controles de Sistema: Scraping y Auto-Publish

### Hallazgos sobre Toggle Placement

**Principio clave de Material Design:**
> "Settings should be below all other items in navigation"

**Toggle switches deben:**
- Tener efecto inmediato (sin boton "guardar")
- Estar agrupados con controles relacionados
- Estar en Settings, NO en navegacion principal

### Recomendacion para XCrapper

**NO poner controles de sistema en bottom nav porque:**
1. Bottom nav es para NAVEGACION, no para acciones
2. Toggles necesitan espacio para labels descriptivos
3. Mezclar navegacion con acciones confunde al usuario
4. Gestures accidentales podrian activar/desactivar scraping

**Donde colocar los controles:**

**Opcion 1: Header Bar contextual (Recomendado)**
```
+------------------------------------------+
| XCrapper    [Scraping: ON] [Auto: 2:45]  |
+------------------------------------------+
|                                          |
|           Contenido principal            |
|                                          |
+------------------------------------------+
| [Inbox] [Cola] [Publicados] [Config]     |
+------------------------------------------+
```
- Controles siempre visibles pero fuera de la navegacion
- Pueden ser interactivos (tap para toggle)
- Muestran estado en tiempo real

**Opcion 2: Status Bar minimalista**
```
+------------------------------------------+
| [*] Scraping activo | Proximo: 2:45      |
+------------------------------------------+
```
- Solo indicadores, no interactivos
- Para cambiar estado: ir a Config

**Opcion 3: Floating Action Button (FAB)**
- Un FAB que muestre estado de scraping
- Tap para ver/controlar ambos sistemas
- Patron usado por apps como Keep, Tasks

**Mi recomendacion: Opcion 1 (Header contextual)**
- Los usuarios necesitan ver y controlar estos estados frecuentemente
- Un header compacto mantiene la informacion accesible
- No interfiere con la navegacion principal

---

## 4. Patrones de Apps Similares

### Twitter/X Mobile
- Bottom nav: Home, Search, Spaces, Notifications, Messages (5 items)
- NO tiene toggles en bottom nav
- Badges numericos en Notifications
- Settings accesible desde perfil (hamburger menu)

### Buffer Mobile
- Navegacion minimalista
- Enfocado en el flujo: crear -> programar -> publicar
- Settings en menu lateral/hamburger
- Interfaz "clean" sin muchos indicadores

### Hootsuite Mobile
- Mas complejo, usa tabs + bottom nav
- Streams-based interface
- Para usuarios avanzados

### Analisis para XCrapper
XCrapper esta mas cerca de Buffer en simplicidad:
- Flujo lineal claro (Inbox -> Cola -> Publicados)
- Usuarios tecnicos pero que valoran simplicidad
- Configuracion importante pero no diaria

---

## 5. Estados Activo vs Inactivo

### Indicadores Visuales Recomendados

**Item Activo:**
- Color de icono: `var(--accent)` (cyan)
- Color de label: `var(--accent)`
- Background: `var(--accent-dim)` (sutil)
- Posible: indicador de linea/punto debajo

**Item Inactivo:**
- Color de icono: `var(--text-muted)`
- Color de label: `var(--text-secondary)`
- Background: transparente

### Ejemplo de CSS

```css
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  gap: 4px;
  position: relative;
}

.nav-item--active {
  color: var(--accent);
}

.nav-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: var(--accent);
  border-radius: 3px 3px 0 0;
}

.nav-item--inactive {
  color: var(--text-muted);
}

.nav-item--inactive:active {
  background: var(--bg-tertiary);
}
```

### Transiciones

```css
.nav-item {
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-icon {
  transition: transform 0.1s ease;
}

.nav-item:active .nav-icon {
  transform: scale(0.95);
}
```

---

## 6. Safe Area Considerations (iOS/Android)

### El Problema
- iPhone X+ tiene "home indicator" en la parte inferior
- Algunos Android tienen gesture bars
- Sin padding, la bottom nav queda parcialmente oculta

### Solucion CSS

**1. Meta tag en HTML (REQUERIDO)**
```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

**2. CSS para Safe Areas**
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;

  /* Altura base + safe area */
  height: calc(56px + env(safe-area-inset-bottom, 0px));

  /* Padding interno respeta safe area */
  padding-bottom: env(safe-area-inset-bottom, 0px);

  /* Fallback para navegadores sin soporte */
  padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0-11.1 */
  padding-bottom: env(safe-area-inset-bottom); /* iOS 11.2+ */

  background: var(--bg-primary);
  border-top: 1px solid var(--border);
}

/* Contenedor de items (56px fijos) */
.bottom-nav__items {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 56px;
}
```

**3. Tailwind CSS Extension (si usas Tailwind)**
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      padding: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      height: {
        'nav-safe': 'calc(56px + env(safe-area-inset-bottom))',
      },
    },
  },
}
```

**4. Ajustar el contenido principal**
```css
.main-content {
  /* Evitar que contenido quede detras de la bottom nav */
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
}
```

---

## 7. Especificaciones Tecnicas Finales

### Dimensiones

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| Altura de barra | 56px | Material Design standard |
| + Safe area | env(safe-area-inset-bottom) | Variable segun dispositivo |
| Touch target minimo | 48x48px | Android minimum |
| Ancho por item | 25% (4 items) | Distribucion equitativa |
| Tamano de icono | 24px | Material Design |
| Tamano de label | 12px | Legible pero compacto |
| Gap icon-label | 4px | Espacio visual |

### Estructura del Componente

```tsx
// BottomNav.tsx
<nav className="bottom-nav">
  <div className="bottom-nav__items">
    <NavItem
      icon={Inbox}
      label="Inbox"
      badge={pendingCount}
      active={currentView === 'inbox'}
    />
    <NavItem
      icon={ListOrdered}
      label="Cola"
      badge={queueCount}
      active={currentView === 'queue'}
    />
    <NavItem
      icon={CheckCircle}
      label="Publicados"
      active={currentView === 'published'}
    />
    <NavItem
      icon={Settings}
      label="Config"
      active={currentView === 'config'}
    />
  </div>
</nav>
```

---

## 8. Resumen de Recomendaciones

| Aspecto | Recomendacion |
|---------|---------------|
| Numero de items | 4 (Inbox, Cola, Publicados, Config) |
| Badges | Solo en Inbox y Cola (contadores) |
| Controles de sistema | Header bar, NO en bottom nav |
| Estado activo | Color accent + indicador visual inferior |
| Safe areas | env(safe-area-inset-bottom) obligatorio |
| Altura | 56px + safe area |
| Labels | Siempre visibles (4 items lo permite) |

### Proximos Pasos

1. Crear componente `BottomNav.tsx`
2. Ajustar `viewport` meta tag con `viewport-fit=cover`
3. Crear `Header.tsx` para controles de sistema (scraping, auto-publish)
4. Adaptar layout para mostrar sidebar en desktop, bottom nav en mobile
5. Testear en dispositivos iOS y Android reales

---

## Fuentes

- [Material Design 3 - Navigation Bar](https://m3.material.io/components/navigation-bar/guidelines)
- [Material Design - Bottom Navigation](https://m1.material.io/components/bottom-navigation.html)
- [Smashing Magazine - Golden Rules of Bottom Navigation](https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/)
- [WebKit - Designing for iPhone X Safe Areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Material Design 3 - Badge Guidelines](https://m3.material.io/components/badges/guidelines)
- [Android Developers - Settings Patterns](https://developer.android.com/design/ui/mobile/guides/patterns/settings)
- [NN/G - Toggle Switch Guidelines](https://www.nngroup.com/articles/toggle-switch-guidelines/)
- [UXDWorld - Bottom Tab Bar Best Practices](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/)
