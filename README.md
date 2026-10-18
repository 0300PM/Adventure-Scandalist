# Latarnia pamięci / The Memory Lighthouse / El faro de la memoria

Autorska, krótka gra przygodowa typu top-down zbudowana wokół assetów znajdujących się w katalogu `Public`. Gra opowiada o Mirze, która szuka trzech wspomnień zaginionych na wyspie i musi zanieść je z powrotem do obozu, aby ponownie zapalić latarnię.

## Polski

### Uruchomienie

Wymagania: Node.js 20 lub nowszy oraz npm.

```bash
npm install
npm run dev
```

Vite wyświetli adres serwera lokalnego. Testy logiki uruchom poleceniem `npm test`. Kompilację produkcyjną sprawdzisz przez `npm run build`, a katalog `dist` uruchomisz przez `npm run preview`.

### Rozgrywka

- Poruszanie: `W`, `A`, `S`, `D` albo strzałki.
- Zebranie przedmiotu / interakcja: `E` lub `Spacja` w pobliżu obiektu.
- Plecak: `I` albo przycisk w prawym górnym rogu; kliknij slot, aby go zaznaczyć. `Esc` zamyka plecak.
- Pauza: `Esc` albo przycisk w prawym górnym rogu mapy. `X` otwiera wybór slotu sesji w menu głównym i wznawia grę z pauzy.
- Na ekranach dotykowych służy do ruchu pad kierunkowy; przycisk `E` pojawia się obok postaci, gdy interakcja jest dostępna.
- Zbierz trzy echa pamięci, a następnie wróć do ogniska przy obozie.
- Menu główne udostępnia nową grę, kontynuację, ustawienia i wyjście. Nowe gry można przypisać do jednego z trzech slotów sesji; postęp, pozycja i plecak zapisują się automatycznie w bazie SQLite przechowywanej w IndexedDB. W ustawieniach można wyeksportować lub zaimportować kopię JSON. Przeglądarka nie zapisuje automatycznie pliku na dysku bez zgody użytkownika.
- Z pauzy można wrócić do menu głównego. Po zakończeniu rozdziału przycisk powrotu otwiera menu.

Interfejs jest dostępny po polsku, angielsku i hiszpańsku. Język można zmienić w menu głównym lub przyciskiem w nagłówku gry. Mapa w trakcie gry wypełnia cały ekran, a dziennik wyprawy, postęp i interakcje są nakładkami wewnątrz świata, bez zewnętrznego panelu. Ustawienia pozwalają zmienić język i włączyć pełny ekran. Przycisk wyjścia próbuje zamknąć kartę; jeśli przeglądarka to zablokuje, wyświetla instrukcję ręcznego zamknięcia.

### Fabuła

Gdy latarnia zgasła, morze zapomniało drogi do domu. Mira słyszy wśród drzew trzy echa — ostatnie wspomnienia wyspy: głos pierwszego brzegu, ślad pod starym dębem oraz płomień obozowiska. Odnalezione echa należy zanieść do ognia. Zakończenie ujawnia, że wyspa odzyskuje swoje imię: Dom.

### Architektura i decyzje techniczne

- **Vue 3** zarządza interfejsem in-game podzielonym na komponenty, plecakiem, lokalizacją, pauzą i komunikatami.
- **Phaser 3** tworzy scenę gry, animacje postaci i ładuje mapę oraz animowane elementy z dołączonych grafik.
- **PixiJS 8** tworzy przezroczystą warstwę atmosferyczną, wykorzystując wyłącznie istniejący arkusz animacji obozowiska.
- **GSAP** obsługuje przejścia interfejsu, komunikaty, postęp i subtelne migotanie płomienia.
- **Tailwind CSS 4** dostarcza narzędzia układu, a Vue/CSS umieszcza elementy interfejsu bezpośrednio nad mapą. Menu główne i tła paneli korzystają z `Public/gui/paperUISystem/Sprites/Book Desk`; ramki, sloty, przyciski, ikony przedmiotów, kompas i paski postępu pochodzą z `Public/gui/pocket_inv`.
- Ruch i kolizje są zaimplementowane w kodzie gry, bez silnika fizycznego. Prędkość wynosi 118 pikseli na sekundę; kierunki diagonalne są normalizowane. Prostokątny hitbox o promieniu 8 pikseli sprawdza obrys wyspy zdefiniowany wielokątem i ręcznie dobrane przeszkody AABB. Ruch po osiach jest rozdzielony, co pozwala ślizgać się wzdłuż przeszkód. Cztery widoczne głazy mają własne hitboxy: przy kontakcie ich opacity płynnie spada do 0,38, a po odsunięciu wraca do 1.
- Trzy echa są instancjami ogólnego systemu podnoszenia: każde trafia jako stosowalny przedmiot do 12-slotowego plecaka. Kolekcjoner wybiera najbliższy obiekt w zasięgu 43 pikseli i nie usuwa go, gdy ekwipunek nie ma miejsca. `Inventory` obsługuje stosy, przedmioty niestosowalne, dodawanie, usuwanie i reset, więc można rozszerzyć katalog o narzędzia i zużywalne itemy. Interakcja z obozem działa w promieniu 48 pikseli. Świat ma 800 × 640 pikseli.
- Używane obrazy: `Public/Tiled/Tiled_map.png`, `Public/Tiled/Tiled_animation_32px.png`, `Public/Characters/Character_1/Idle.png` i `Public/Characters/Character_1/Walk.png`, skały kolizyjne `Public/png_assets/{cave_rocks/cave_rock5,middle_lane_rocks1/middle_lane_rock1_5,snowy_rocks1/snowy_rock5,canyon_rocks/canyon_rock5}.png` oraz tła menu i paneli z `Public/gui/paperUISystem/Sprites/Book Desk` i elementy UI z `Public/gui/pocket_inv/Sprites/Content` (Power Hub, Holders, Items, UI Buttons, Compass i Progress Bars). Nie powstaje nowa grafika gry; interfejs w HTML/CSS korzysta z dostarczonych skórek i ikon.
- Kompilacja kopiuje do `dist/Public` tylko 23 używane pliki graficzne. PSD-y, pliki źródłowe Tiled, macOS sidecary i nieużywane zasoby nie zwiększają paczki produkcyjnej.

### Struktura

```text
Public/                 dostarczone assety
src/App.vue             składanie widoków i koordynacja stanu gry
src/components/         komponenty menu, HUD-u i modalów
src/composables/        inicjalizacja i zwalnianie runtime
src/i18n.ts             teksty interfejsu PL/EN/ES
src/game/saveStore.ts   SQLite w IndexedDB, migracja i kopie JSON
src/game/adventure.ts   scena Phaser, sterowanie, kolizje i cele
src/game/core.ts        kolizje i ruch niezależne od silnika
src/game/inventory.ts   stosowalny ekwipunek o konfigurowalnej pojemności
src/game/collectibles.ts uniwersalne podnoszenie przedmiotów
src/game/sessions.ts    walidacja slotów i formatu kopii JSON
src/game/atmosphere.ts  warstwa PixiJS i animacja ogniska
src/style.css           styl aplikacji i układ responsywny
vite.config.ts          konfiguracja Vite i selektywne kopiowanie assetów
```

### Dostosowywanie

Punkty ech, pole obozu, prędkość, wielokąt granicy wyspy i przeszkody znajdują się na początku `src/game/adventure.ts`. Teksty wszystkich trzech wersji językowych są zebrane w `src/i18n.ts`. Zapis lokalny działa w SQLite przez `sql.js`, a baza jest utrwalana w IndexedDB; menu ustawień udostępnia eksport i import plików JSON. Testy `npm test` sprawdzają wektory ruchu, kolizje, zbieranie, stosy, pojemność ekwipunku i obsługę slotów sesji. Dodając grafikę, należy umieścić ją w `Public`, dodać ją do listy `selectedAssets` w `vite.config.ts`, a następnie załadować w odpowiednim module gry.

## English

### Getting started

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL. Run logic tests with `npm test`, verify a production build with `npm run build`, and serve the generated `dist` directory with `npm run preview`.

### Gameplay

- Move with `W`, `A`, `S`, `D`, or the arrow keys.
- Collect an item / interact with `E` or `Space` while near an object.
- Open the inventory with `I` or the in-game button; click a slot to select it. `Esc` closes the inventory.
- The separate main menu presents the story, language choice, and new journey action. `X` opens the session-slot chooser from the main menu; from pause it resumes the game.
- On touch screens, use the directional pad. An `E` button appears beside the character when an interaction is available.
- Recover all three memory echoes, then return to the campfire.
- The main menu offers new game, continue, settings, and exit. Three session slots automatically save progress, position, collected items, and inventory in a SQLite database persisted in IndexedDB. Settings provide JSON backup export and import. Browsers cannot silently write a file to disk without user permission.
- The pause screen can return to the main menu; after the ending, the return button opens it again.

The interface is available in Polish, English, and Spanish. Change languages in the main menu or with the in-game header button. The gameplay map fills the screen; the journal, progress, and interactions are overlays inside the game world, with no surrounding app panels. Settings include language and fullscreen controls. Exit attempts to close the tab; if the browser blocks it, the game explains how to close it manually.

### Story

When the lighthouse went dark, the sea forgot the way home. Mira hears three echoes among the trees — the island’s last memories: the voice of the first shore, a trace beneath the old oak, and the campfire’s last flame. Carry the recovered echoes back to the fire. The ending reveals the island’s restored name: Home.

### Architecture and technical choices

- **Vue 3** manages the in-game interface, inventory, localization, pause state, and narrative messages.
- **Phaser 3** creates the game scene and character animations, and loads the included map and animated art.
- **PixiJS 8** provides a transparent atmospheric layer using only the supplied animated campfire sheet.
- **GSAP** powers interface transitions, notifications, progress feedback, and subtle fire flicker.
- **Tailwind CSS 4** provides layout utilities; Vue and CSS place overlays directly over the map. The main menu and dialog panels use backgrounds from `Public/gui/paperUISystem/Sprites/Book Desk`; frames, slots, buttons, item icons, compass, and progress bars use `Public/gui/pocket_inv`.
- Movement and collision are implemented in the game code without a physics engine. Speed is 118 pixels per second and diagonal input is normalized. An 8-pixel-radius rectangular hitbox checks the island polygon and hand-authored AABB blockers. Separate axis resolution lets the character slide along obstacles. Four visible boulders have individual hitboxes: on contact their opacity smoothly drops to 0.38 and returns to 1 when the character moves away.
- Three echoes use a reusable pickup system and enter a 12-slot inventory as a stackable item. The collector chooses the nearest pickup within 43 pixels and leaves it in the world if the inventory cannot fit it. `Inventory` supports stacking, non-stackable items, adding, removing, and reset, ready for tool and consumable item definitions. Camp interaction has a 48-pixel radius. The world is 800 × 640 pixels.
- Loaded images: `Public/Tiled/Tiled_map.png`, `Public/Tiled/Tiled_animation_32px.png`, `Public/Characters/Character_1/Idle.png`, and `Public/Characters/Character_1/Walk.png`, collidable rocks `Public/png_assets/{cave_rocks/cave_rock5,middle_lane_rocks1/middle_lane_rock1_5,snowy_rocks1/snowy_rock5,canyon_rocks/canyon_rock5}.png`, menu and panel backgrounds from `Public/gui/paperUISystem/Sprites/Book Desk`, and UI components from `Public/gui/pocket_inv/Sprites/Content` (Power Hub, Holders, Items, UI Buttons, Compass, and Progress Bars). No new game artwork is generated; the HTML/CSS interface is skinned with the supplied UI sprites.
- The production build copies only the 23 required image files into `dist/Public`. PSDs, Tiled source files, macOS sidecars, and unused assets are excluded from the production bundle.

### Project structure

```text
Public/                 supplied game assets
src/App.vue             view composition and game-state coordination
src/components/         menu, HUD, and modal components
src/composables/        game-runtime initialization and cleanup
src/i18n.ts             Polish, English, and Spanish interface copy
src/game/saveStore.ts   SQLite in IndexedDB, migration, and JSON backups
src/game/adventure.ts   Phaser scene, controls, collisions, and objectives
src/game/core.ts        engine-independent movement and collision
src/game/inventory.ts   stackable inventory with configurable capacity
src/game/collectibles.ts reusable item pickup logic
src/game/sessions.ts    save-slot validation and JSON backup format
src/game/atmosphere.ts  PixiJS layer and campfire animation
src/style.css           application styling and responsive layout
vite.config.ts          Vite setup and selective asset copying
```

### Customization

Echo locations, the camp interaction area, movement speed, island polygon, and blockers are defined near the top of `src/game/adventure.ts`. All Polish, English, and Spanish copy is grouped in `src/i18n.ts`. Local saves use SQLite via `sql.js`, persisted in IndexedDB; the settings menu exports and imports JSON backup files. The Vitest suite covers movement vectors, collision resolution, item pickup, stacking, inventory capacity, and session slot storage. To add an image, place it in `Public`, add it to `selectedAssets` in `vite.config.ts`, and load it in the relevant game module.

## Español

### Inicio

Requisitos: Node.js 20 o posterior y npm.

```bash
npm install
npm run dev
```

Vite muestra la dirección local. Ejecuta las pruebas de lógica con `npm test`, comprueba la compilación con `npm run build` y sirve `dist` mediante `npm run preview`.

### Juego

- Muévete con `W`, `A`, `S`, `D` o las flechas.
- Recoge un objeto / interactúa con `E` o `Espacio` cuando estés cerca.
- Abre la mochila con `I` o con el botón integrado; pulsa un espacio para seleccionarlo. `Esc` cierra la mochila.
- El menú principal independiente presenta la historia, el idioma y el inicio de una nueva aventura. `X` abre la selección de ranura desde el menú principal y reanuda la partida durante la pausa.
- En pantallas táctiles, utiliza el pad direccional. El botón `E` aparece junto al personaje cuando hay una interacción disponible.
- Recupera los tres ecos de memoria y vuelve a la hoguera del campamento.
- El menú ofrece nueva partida, continuar, ajustes y salir. Tres ranuras guardan automáticamente la posición, los objetos recogidos y la mochila en una base SQLite almacenada en IndexedDB. Los ajustes permiten exportar e importar copias JSON. El navegador no puede guardar archivos automáticamente en el disco sin permiso del usuario.
- Desde la pausa se puede volver al menú; al terminar el capítulo, el botón de regreso lo abre de nuevo.

La interfaz está disponible en polaco, inglés y español. Cambia el idioma desde el menú principal o el botón integrado en el juego. El mapa durante la partida ocupa toda la pantalla; el diario, el progreso y las interacciones son capas dentro del mundo, sin paneles exteriores. Los ajustes permiten cambiar el idioma y activar la pantalla completa. La opción de salida intenta cerrar la pestaña; si el navegador lo bloquea, indica cómo cerrarla manualmente.

### Historia

Cuando el faro se apagó, el mar olvidó el camino a casa. Mira oye tres ecos entre los árboles — los últimos recuerdos de la isla: la voz de la primera orilla, un rastro bajo el viejo roble y la última llama del campamento. Lleva los ecos recuperados de vuelta al fuego. El final revela que la isla recupera su nombre: Hogar.

### Arquitectura y decisiones técnicas

- **Vue 3** gestiona una interfaz de juego basada en componentes, la mochila, la localización, la pausa y los mensajes narrativos.
- **Phaser 3** crea la escena y las animaciones del personaje, y carga el mapa y los recursos gráficos incluidos.
- **PixiJS 8** crea una capa atmosférica transparente con la hoja de animación de la hoguera suministrada.
- **GSAP** anima las transiciones de interfaz, las notificaciones, el progreso y el sutil parpadeo del fuego.
- **Tailwind CSS 4** aporta utilidades de diseño; Vue y CSS colocan las capas sobre el mapa. El menú y los paneles utilizan fondos de `Public/gui/paperUISystem/Sprites/Book Desk`; los marcos, espacios, botones, iconos, brújula y barras de progreso usan recursos de `Public/gui/pocket_inv`.
- El movimiento y las colisiones se implementan en el código del juego sin motor de física. La velocidad es de 118 píxeles por segundo y las diagonales se normalizan. Una caja de colisión con radio de 8 píxeles comprueba el polígono de la isla y los obstáculos AABB definidos manualmente. La resolución independiente por eje permite deslizarse junto a los obstáculos. Cuatro rocas visibles tienen hitboxes propios: al tocarlas, su opacidad baja suavemente a 0,38 y vuelve a 1 cuando el personaje se aleja.
- Los tres ecos usan un sistema de recogida reutilizable y se guardan como objeto apilable en una mochila de 12 espacios. Se recoge el elemento más cercano dentro de 43 píxeles y permanece en el mundo si no hay espacio. `Inventory` admite pilas, herramientas no apilables, añadir, retirar y reiniciar, preparado para nuevos objetos. El campamento interactúa en un radio de 48 píxeles. El mundo mide 800 × 640 píxeles.
- Imágenes utilizadas: `Public/Tiled/Tiled_map.png`, `Public/Tiled/Tiled_animation_32px.png`, `Public/Characters/Character_1/Idle.png` y `Public/Characters/Character_1/Walk.png`, rocas con colisión `Public/png_assets/{cave_rocks/cave_rock5,middle_lane_rocks1/middle_lane_rock1_5,snowy_rocks1/snowy_rock5,canyon_rocks/canyon_rock5}.png`, fondos del menú y los paneles en `Public/gui/paperUISystem/Sprites/Book Desk` y elementos de interfaz en `Public/gui/pocket_inv/Sprites/Content` (Power Hub, Holders, Items, UI Buttons, Compass y Progress Bars). No se genera arte nuevo para el juego; la interfaz HTML/CSS utiliza los sprites de UI incluidos.
- La compilación de producción copia solo los 23 archivos gráficos necesarios a `dist/Public`. Los PSD, archivos fuente de Tiled, metadatos de macOS y recursos no utilizados quedan fuera del paquete de producción.

### Estructura del proyecto

```text
Public/                 recursos gráficos incluidos
src/App.vue             composición de vistas y coordinación del estado
src/components/         componentes del menú, HUD y modales
src/composables/        inicialización y limpieza del runtime
src/i18n.ts             textos en polaco, inglés y español
src/game/saveStore.ts   SQLite en IndexedDB y copias JSON
src/game/adventure.ts   escena Phaser, controles, colisiones y objetivos
src/game/core.ts        movimiento y colisiones independientes del motor
src/game/inventory.ts   inventario apilable de capacidad configurable
src/game/collectibles.ts recogida reutilizable de objetos
src/game/sessions.ts    validación de partidas y formato JSON
src/game/atmosphere.ts  capa PixiJS y animación de la hoguera
src/style.css           estilos y diseño adaptable
vite.config.ts          configuración de Vite y copia selectiva de recursos
```

### Personalización

Las posiciones de los ecos, el área del campamento, la velocidad, el polígono de la isla y los obstáculos se encuentran al principio de `src/game/adventure.ts`. Los textos en polaco, inglés y español están agrupados en `src/i18n.ts`. Los guardados utilizan SQLite con `sql.js`, persistida en IndexedDB; el menú de ajustes permite exportar e importar copias JSON. Las pruebas de Vitest cubren vectores de movimiento, colisiones, recogida, acumulación, capacidad del inventario y ranuras de guardado. Para añadir una imagen, colócala en `Public`, inclúyela en `selectedAssets` dentro de `vite.config.ts` y cárgala desde el módulo de juego correspondiente.
