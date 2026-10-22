import type { Language } from '../i18n'

export const LORE_CATEGORIES = ['places', 'people', 'echoes', 'relics', 'history'] as const
export type LoreCategory = (typeof LORE_CATEGORIES)[number]

export type LoreEntry = {
  id: string
  category: LoreCategory
  title: Record<Language, string>
  body: Record<Language, string>
}

/**
 * Kronika wyspy Nomen — pełne lore gry w trzech językach.
 * Wpisy odsłaniają się wraz z eksploracją, echami i artefaktami.
 */
export const LORE_ENTRIES: LoreEntry[] = [
  {
    id: 'place-camp',
    category: 'places',
    title: { pl: 'Obóz Północny', en: 'Northern Camp', es: 'Campamento del norte' },
    body: {
      pl: 'Na północnym cyplu, osłoniętym od wiatru rudym klifem, stoi obóz założony przez Arona i Janę. Namiot, skrzynia z narzędziami, pierścień kamieni i ogień, który nie gaśnie — dopóki ktoś go pamięta. To tutaj Mira wraca z każdym echem.',
      en: 'On the northern headland, sheltered by a rust-red cliff, stands the camp that Aron and Jana built. A tent, a tools chest, a ring of stones and a fire that never dies — as long as someone remembers it. This is where Mira returns with every echo.',
      es: 'En el cabo norte, protegido por un acantilado rojizo, se alza el campamento que levantaron Aron y Jana. Una tienda, un cofre de herramientas, un círculo de piedras y un fuego que no se apaga mientras alguien lo recuerde. Aquí vuelve Mira con cada eco.',
    },
  },
  {
    id: 'place-shore',
    category: 'places',
    title: { pl: 'Brzeg Milczenia', en: 'Shore of Silence', es: 'Orilla del silencio' },
    body: {
      pl: 'Zachodni brzeg, na którym morze po raz pierwszy oddało imię. Fale nie szumią tu jak gdzie indziej — powtarzają czyjeś imię, którego nikt już nie pamięta. Dawni mieszkańcy nazywali to miejsce Brzegiem, Który Słucha.',
      en: 'The western shore where the sea first gave back a name. The waves do not sound like waves here — they repeat a name nobody remembers anymore. The old islanders called it the Shore That Listens.',
      es: 'La orilla occidental donde el mar devolvió un nombre por primera vez. Aquí las olas no suenan como olas: repiten un nombre que ya nadie recuerda. Los antiguos isleños la llamaban la Orilla que Escucha.',
    },
  },
  {
    id: 'place-oak',
    category: 'places',
    title: { pl: 'Dąb Przysiąg', en: 'The Oath Oak', es: 'El Roble de los Juramentos' },
    body: {
      pl: 'Najstarsze drzewo Nomen. Pod jego koroną składano obietnice, których nie wolno było złamać — na dobre i na złe, na pamięć i na zapomnienie. Kora do dziś nosi ślady setek dłoni.',
      en: 'The oldest tree on Nomen. Under its crown people made promises that could not be broken — for better or worse, for memory or for forgetting. The bark still carries the marks of hundreds of hands.',
      es: 'El árbol más antiguo de Nomen. Bajo su copa se hacían promesas que no podían romperse, para bien o para mal, por la memoria o por el olvido. La corteza aún conserva las marcas de cientos de manos.',
    },
  },
  {
    id: 'place-watchtower',
    category: 'places',
    title: { pl: 'Wieża Obserwacyjna', en: 'The Watchtower', es: 'La Torre de Vigía' },
    body: {
      pl: 'Kamienna wieża na zachodzie, z której Jana rysowała mapy. Zostały po niej fundamenty, studnia i skrzynia z ołówkami. Z jej szczytu widać całe Morze Bezgłosu — i to właśnie tam po raz pierwszy usłyszano Ciszę.',
      en: 'The stone tower in the west where Jana drew her maps. Foundations, a well and a chest of pencils are all that remain. From its top the whole Sea of the Unvoiced is visible — and that is where the Hush was heard for the first time.',
      es: 'La torre de piedra del oeste donde Jana dibujaba sus mapas. Solo quedan los cimientos, un pozo y un cofre de lápices. Desde arriba se ve todo el Mar de los Sin Voz, y allí se escuchó el Silencio por primera vez.',
    },
  },
  {
    id: 'place-gate',
    category: 'places',
    title: { pl: 'Stara Brama', en: 'The Old Gate', es: 'La Puerta Vieja' },
    body: {
      pl: 'Kamienna brama w klifie, prowadząca niegdyś w głąb wyspy. Dziś zawalona i porośnięta bluszczem; tędy pierwsi osadnicy weszli na Nomen. Na kamieniu wyryto słowo, którego nikt już nie potrafi odczytać.',
      en: 'A stone gate in the cliff that once led into the heart of the island. Now collapsed and overgrown; this is where the first settlers entered Nomen. A word is carved into the stone that nobody can read anymore.',
      es: 'Una puerta de piedra en el acantilado que antaño llevaba al corazón de la isla. Hoy está derrumbada y cubierta de hiedra; por aquí entraron los primeros colonos a Nomen. En la piedra hay una palabra que ya nadie sabe leer.',
    },
  },
  {
    id: 'place-lighthouse',
    category: 'places',
    title: { pl: 'Wieża Milczenia', en: 'The Tower of Silence', es: 'La Torre del Silencio' },
    body: {
      pl: 'Samotna wysepka na południowym wschodzie, na której stoi latarnia. Jej światło nie paliło oleju, lecz wspomnienia — dlatego gasło, gdy ludzie przestawali pamiętać. Od dwunastu lat stoi ciemna, a morze omija ją szerokim łukiem.',
      en: 'A lonely islet in the south-east where the lighthouse stands. Its light never burned oil but memories — that is why it went out when people stopped remembering. It has stood dark for twelve years, and the sea gives it a wide berth.',
      es: 'Un islote solitario en el sureste donde se alza el faro. Su luz no quemaba aceite sino recuerdos; por eso se apagó cuando la gente dejó de recordar. Lleva doce años a oscuras y el mar lo rodea con respeto.',
    },
  },
  {
    id: 'place-wreck',
    category: 'places',
    title: { pl: 'Wrak „Jerzyka”', en: 'The Wreck of the Swift', es: 'El pecio del Vencejo' },
    body: {
      pl: 'Łódź Arona, która rozbiła się o rafy w noc Ciszy. Kadłub wciąż wystaje z wody, a w kabinie znaleziono dziennik z jednym słowem zapisanym sto razy: „wracam”.',
      en: 'Aron’s boat, broken on the reefs on the night of the Hush. The hull still juts out of the water, and in the cabin a logbook was found with one word written a hundred times: “I am coming back.”',
      es: 'La barca de Aron, destrozada en los arrecifes la noche del Silencio. El casco aún sobresale del agua y en la cabina se halló un cuaderno con una palabra escrita cien veces: «vuelvo».',
    },
  },
  {
    id: 'place-beachfire',
    category: 'places',
    title: { pl: 'Ognisko na Plaży', en: 'The Beach Fire', es: 'La Hoguera de la Playa' },
    body: {
      pl: 'Pierwsze ognisko rozpalone na Nomen przez osadników. Wygasło dawno temu, ale piasek wokół niego jest zawsze ciepły, a węgle nie chcą ostygnąć. To tutaj zaczęła się wspólnota — i tutaj kończy się każda zima.',
      en: 'The first fire the settlers lit on Nomen. It burned out long ago, yet the sand around it is always warm and the coals refuse to cool. Here the community began — and here every winter ends.',
      es: 'La primera hoguera que encendieron los colonos en Nomen. Se apagó hace mucho, pero la arena a su alrededor siempre está tibia y las brasas se niegan a enfriarse. Aquí nació la comunidad y aquí termina cada invierno.',
    },
  },
  {
    id: 'mira',
    category: 'people',
    title: { pl: 'Mira', en: 'Mira', es: 'Mira' },
    body: {
      pl: 'Siedemnastoletnia córka Arona i Jany. Miała pięć lat, gdy zgasła latarnia, więc nie pamięta ojca — tylko głos i zapach dymu; dlatego ogień obozu jest dla niej domem. Ma słuch kartografki i upór strażnika.',
      en: 'The seventeen-year-old daughter of Aron and Jana. She was five when the lighthouse went out, so she does not remember her father — only a voice and the smell of smoke; that is why the campfire is home to her. She has a cartographer’s ear and a keeper’s stubbornness.',
      es: 'Hija de Aron y Jana, tiene diecisiete años. Tenía cinco cuando se apagó el faro, así que no recuerda a su padre, solo una voz y el olor del humo; por eso el fuego del campamento es su hogar. Tiene el oído de una cartógrafa y la terquedad de un guardián.',
    },
  },
  {
    id: 'aron',
    category: 'people',
    title: { pl: 'Aron, ostatni Strażnik', en: 'Aron, the Last Keeper', es: 'Aron, el último Guardián' },
    body: {
      pl: 'Ostatni z Zakonu Latarników. W noc Ciszy wypłynął „Jerzykiem”, by zapalić latarnię od strony morza. Nie wrócił. Wyspa pamięta jego krok na molo i światło, które na jedną sekundę rozbłysło — a potem zgasło na zawsze.',
      en: 'The last of the Lighthouse Order. On the night of the Hush he sailed the Swift out to light the lighthouse from the sea. He never returned. The island remembers his step on the pier and the light that flared for a single second — then went out forever.',
      es: 'El último de la Orden del Faro. La noche del Silencio zarpó en el Vencejo para encender el faro desde el mar. No volvió. La isla recuerda su paso por el muelle y la luz que brilló un segundo antes de apagarse para siempre.',
    },
  },
  {
    id: 'jana',
    category: 'people',
    title: { pl: 'Jana Kartografka', en: 'Jana the Cartographer', es: 'Jana la Cartógrafa' },
    body: {
      pl: 'Matka Miry, która narysowała mapę Nomen. Zostawiła córce mosiężny kompas i notatkę: „Mapa to obietnica, że wrócimy”. Wypłynęła szukać Arona rok po Ciszy; morze oddało tylko jej szkicownik.',
      en: 'Mira’s mother, who drew the map of Nomen. She left her daughter a brass compass and a note: “A map is a promise that we will come back.” She sailed to look for Aron a year after the Hush; the sea returned only her sketchbook.',
      es: 'La madre de Mira, que dibujó el mapa de Nomen. Dejó a su hija una brújula de latón y una nota: «Un mapa es la promesa de que volveremos». Zarpó a buscar a Aron un año después del Silencio; el mar solo devolvió su cuaderno de bocetos.',
    },
  },
  {
    id: 'keepers',
    category: 'people',
    title: { pl: 'Zakon Latarników', en: 'The Lighthouse Order', es: 'La Orden del Faro' },
    body: {
      pl: 'Strażnicy Pamięci, którzy przez pokolenia spisywali dzieje wyspy w Kronice i utrzymywali światło. Nie mieli świątyń — tylko latarnię, ogień i księgę. Ich jedyna reguła brzmiała: „Pamiętaj, albo zabiorą ci imię”.',
      en: 'The Keepers of Memory, who for generations wrote the island’s history into the Chronicle and kept the light alive. They had no temples — only the lighthouse, the fire and the book. Their single rule: “Remember, or they will take your name.”',
      es: 'Los Guardianes de la Memoria, que durante generaciones escribieron la historia de la isla en la Crónica y mantuvieron la luz. No tenían templos, solo el faro, el fuego y el libro. Su única regla: «Recuerda, o te quitarán el nombre».',
    },
  },
  {
    id: 'echo-shore',
    category: 'echoes',
    title: { pl: 'Echo Brzegu', en: 'Echo of the Shore', es: 'Eco de la Orilla' },
    body: {
      pl: 'Głos pierwszej kobiety, która stanęła na plaży Nomen i powiedziała: „To będzie dom”. Echo powtarza to zdanie w języku, którego już nikt nie używa. Kiedy wraca do ognia, wyspa przypomina sobie, że została wybrana, a nie znaleziona.',
      en: 'The voice of the first woman to stand on the shore of Nomen, saying: “This will be home.” The echo repeats the sentence in a language nobody speaks anymore. When it returns to the fire, the island remembers that it was chosen, not found.',
      es: 'La voz de la primera mujer que pisó la orilla de Nomen y dijo: «Este será nuestro hogar». El eco repite la frase en una lengua que ya nadie habla. Cuando vuelve al fuego, la isla recuerda que fue elegida, no encontrada.',
    },
  },
  {
    id: 'echo-oak',
    category: 'echoes',
    title: { pl: 'Echo Dębu', en: 'Echo of the Oak', es: 'Eco del Roble' },
    body: {
      pl: 'Odgłos setek dłoni na korze i szept przysięgi: „Póki drzewo pamięta, nikt nie odejdzie na zawsze”. To echo mówi głosem Arona — tym samym, którym obiecywał Mirze, że wróci przed pierwszym śniegiem.',
      en: 'The sound of hundreds of hands on bark and the whisper of an oath: “As long as the tree remembers, no one leaves forever.” This echo speaks in Aron’s voice — the one that promised Mira he would return before the first snow.',
      es: 'El sonido de cientos de manos en la corteza y el susurro de un juramento: «Mientras el árbol recuerde, nadie se marcha para siempre». Este eco habla con la voz de Aron, la misma que prometió a Mira volver antes de la primera nieve.',
    },
  },
  {
    id: 'echo-flame',
    category: 'echoes',
    title: { pl: 'Echo Ognia', en: 'Echo of the Flame', es: 'Eco de la Llama' },
    body: {
      pl: 'Iskra pierwszego ognia, który mieszkańcy rozpalili, by przetrwać noc. W tym echu słychać śmiech, kłótnie i kogoś, kto dokłada drewno. To najważniejsze z ech: bez niego latarnia nie ma czym świecić.',
      en: 'The spark of the first fire the islanders lit to survive the night. Inside this echo there is laughter, arguing and someone adding wood. It is the most important of the echoes: without it the lighthouse has nothing to burn.',
      es: 'La chispa del primer fuego que encendieron los isleños para pasar la noche. En este eco se oyen risas, discusiones y alguien que echa leña. Es el más importante de los ecos: sin él, el faro no tiene con qué brillar.',
    },
  },
  {
    id: 'relic-sea-glass',
    category: 'relics',
    title: { pl: 'Szkło Pamięci', en: 'Memory Glass', es: 'Vidrio de la Memoria' },
    body: {
      pl: 'Zielony odłamek szkła z latarni, noszony przez Arona w skórzanej sakiewce. Kto trzyma go w dłoni, słyszy jedno wspomnienie właściciela — zawsze to samo: „wracam”. Sakiewkę znaleziono w ruinie wieży obserwacyjnej.',
      en: 'A green shard of lighthouse glass that Aron carried in a leather pouch. Whoever holds it hears one memory of its owner — always the same one: “I am coming back.” The pouch was found in the ruin of the watchtower.',
      es: 'Un fragmento verde del vidrio del faro que Aron llevaba en una bolsa de cuero. Quien lo sostiene escucha un recuerdo de su dueño, siempre el mismo: «vuelvo». La bolsa se encontró en las ruinas de la torre de vigía.',
    },
  },
  {
    id: 'relic-compass',
    category: 'relics',
    title: { pl: 'Kompas Jany', en: 'Jana’s Compass', es: 'La Brújula de Jana' },
    body: {
      pl: 'Mosiężny kompas, który Jana dała Mirze przed ostatnim rejsem. Igła nie wskazuje północy — wskazuje miejsce, do którego chce wrócić właściciel. Odkąd Mira zbiera echa, igła drży w stronę latarni.',
      en: 'The brass compass Jana gave Mira before her last voyage. Its needle does not point north — it points to the place its owner wants to return to. Since Mira began gathering echoes, the needle trembles toward the lighthouse.',
      es: 'La brújula de latón que Jana entregó a Mira antes de su último viaje. Su aguja no señala el norte, sino el lugar al que su dueña quiere volver. Desde que Mira reúne ecos, la aguja tiembla hacia el faro.',
    },
  },
  {
    id: 'history-hush',
    category: 'history',
    title: { pl: 'Cisza', en: 'The Hush', es: 'El Silencio' },
    body: {
      pl: 'Nie bóg i nie potwór, lecz życzenie, które mieszkańcy wypowiedzieli zbyt głośno: „chcemy zapomnieć”. Zrodzona z bólu Cisza zaczęła zjadać imiona — najpierw miejsc, potem ludzi. Nie da się jej zabić; można ją tylko przegadać pamięcią.',
      en: 'Not a god and not a monster, but a wish the islanders spoke too loudly: “we want to forget.” Born out of grief, the Hush began eating names — first of places, then of people. It cannot be killed; it can only be talked down with memory.',
      es: 'No es un dios ni un monstruo, sino un deseo que los isleños pronunciaron demasiado alto: «queremos olvidar». Nacido del dolor, el Silencio empezó a devorar nombres: primero de lugares, luego de personas. No se le puede matar, solo se le puede vencer con memoria.',
    },
  },
  {
    id: 'history-fall',
    category: 'history',
    title: { pl: 'Noc, w której zgasło światło', en: 'The Night the Light Went Out', es: 'La noche en que se apagó la luz' },
    body: {
      pl: 'Dwanaście lat temu sztorm zerwał liny latarni w chwili, gdy Aron próbował ją zapalić. Światło buchnęło na jedną sekundę — wystarczająco, by „Jerzyk” wypłynął z portu — i zgasło. Od tej nocy Nomen zaczęło zapominać.',
      en: 'Twelve years ago a storm tore the lighthouse cables the moment Aron tried to light it. The light flared for one second — long enough for the Swift to leave the harbour — and went out. From that night on, Nomen began to forget.',
      es: 'Hace doce años una tormenta rompió los cables del faro justo cuando Aron intentaba encenderlo. La luz estalló un segundo, lo suficiente para que el Vencejo saliera del puerto, y se apagó. Desde esa noche, Nomen empezó a olvidar.',
    },
  },
  {
    id: 'history-sea',
    category: 'history',
    title: { pl: 'Morze Bezgłosu', en: 'The Sea of the Unvoiced', es: 'El Mar de los Sin Voz' },
    body: {
      pl: 'Morze, które nie ma fal dźwiękowych — tylko cudze imiona. Kto wypływa na nie bez swojego imienia, wraca bez niego. Dlatego strażnicy nigdy nie wypływali w Ciszy, a latarnia musiała świecić także w dzień.',
      en: 'A sea without sounding waves — only other people’s names. Whoever sails out without their own name comes back without it. That is why the keepers never sailed during the Hush, and why the lighthouse had to burn even by day.',
      es: 'Un mar sin olas sonoras, solo nombres ajenos. Quien navega sin su propio nombre vuelve sin él. Por eso los guardianes nunca zarparon durante el Silencio y el faro debía arder incluso de día.',
    },
  },
  {
    id: 'history-name',
    category: 'history',
    title: { pl: 'Imię Wyspy', en: 'The Name of the Island', es: 'El Nombre de la Isla' },
    body: {
      pl: 'Wyspa nazywała się Nomen — „imię”. Gdy zapomniała własnego imienia, zniknęła z map. Trzy echa przywracają jej prawdziwe imię: Dom. Nie dlatego, że ktoś je wymyślił, ale dlatego, że ktoś je pamiętał.',
      en: 'The island was called Nomen — “name”. When it forgot its own name, it vanished from the maps. The three echoes restore its true name: Home. Not because someone invented it, but because someone remembered it.',
      es: 'La isla se llamaba Nomen, «nombre». Cuando olvidó su propio nombre, desapareció de los mapas. Los tres ecos le devuelven su verdadero nombre: Hogar. No porque alguien lo inventara, sino porque alguien lo recordó.',
    },
  },
  {
    id: 'history-epilogue',
    category: 'history',
    title: { pl: 'Epilog: światło, które pamięta', en: 'Epilogue: the Light That Remembers', es: 'Epílogo: la luz que recuerda' },
    body: {
      pl: 'Gdy trzy echa wracają do ognia, latarnia rozbłyska ciepłym złotem, a Cisza cofa się w morze. Mira zostaje na cyplu do świtu. Jeśli znalazła szkło Arona, słyszy w szumie fali jego głos — i po raz pierwszy mu odpowiada.',
      en: 'When the three echoes return to the fire, the lighthouse blooms with warm gold and the Hush retreats into the sea. Mira stays on the headland until dawn. If she found Aron’s glass, she hears his voice in the waves — and answers him for the first time.',
      es: 'Cuando los tres ecos vuelven al fuego, el faro florece en oro cálido y el Silencio retrocede hacia el mar. Mira se queda en el cabo hasta el amanecer. Si encontró el vidrio de Aron, oye su voz en las olas y le responde por primera vez.',
    },
  },
]

export const LORE_ENTRY_IDS = LORE_ENTRIES.map((entry) => entry.id)

export const findLoreEntry = (id: string): LoreEntry | undefined => LORE_ENTRIES.find((entry) => entry.id === id)

export const entriesByCategory = (category: LoreCategory): LoreEntry[] =>
  LORE_ENTRIES.filter((entry) => entry.category === category)
