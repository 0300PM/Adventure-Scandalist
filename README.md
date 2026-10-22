# Adventure Scandalist

Autorska, krótka gra przygodowa typu top-down zbudowana wokół assetów znajdujących się w katalogu `Public`. Gra opowiada o Mirze, która szuka trzech wspomnień zaginionych na wyspie i musi zanieść je z powrotem do obozu, aby ponownie zapalić latarnię.

# Projekt zamrożony!
## W niedalekiej przyszłości zostanie ona przeniesiona na autorski silnik. 

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
