# Opowieść — ustalenia funkcjonalne i techniczne

## 1. Cel

`Opowieść` („Story”) będzie osobnym modułem aplikacji Coin Catalog.

Opowieść ma działać jako wiki, w którym użytkownik:

- definiuje strony,
- tworzy i edytuje zawartość stron w Markdown,
- wyświetla zawartość stron w interfejsie aplikacji,
- może osadzać monety z istniejącego katalogu pomiędzy akapitami Markdown,
- może osadzać własne obrazy/assets,
- może budować hierarchiczną strukturę stron o dowolnej liczbie poziomów.

Moduł jest przeznaczony głównie dla użytkownika aplikacji i jest jednoosobowy.

`Opowieść` ma być osobnym modułem, ale ma **maksymalnie wykorzystywać istniejącą funkcjonalność aplikacji**. Nie należy tworzyć drugich, równoległych implementacji wyszukiwania monet, wyświetlania monet, obsługi obrazów ani innych istniejących mechanizmów, jeżeli istniejąca funkcjonalność może zostać ponownie użyta.

---

## 2. Przechowywanie stron

Treść Markdown stron będzie przechowywana jako tekst w SQLite.

Nie będą powstawały osobne pliki `.md` synchronizowane z bazą danych.

Powód:

- użytkownik chce edytować strony z poziomu UI,
- aplikacja jest jednoosobowa,
- SQLite jest już źródłem danych aplikacji,
- unika się synchronizacji pomiędzy plikami Markdown i bazą danych.

Proponowany model strony:

```
story_page
    id
    parent_id
    title
    slug
    content
    sort_order
    created_at
    updated_at
```

### `parent_id`

`parent_id` wskazuje bezpośredniego rodzica strony.

Strona główna ma:

```
parent_id = NULL
```

Hierarchia może mieć dowolną liczbę poziomów.

Przykład:

```
Monety Polskie
├── Piastowie
│   ├── Mieszko I
│   ├── Bolesław Chrobry
│   └── Mieszko II
├── Jagiellonowie
└── Wazowie
    └── Jan Kazimierz
        ├── Szóstaki
        ├── Ort-y
        └── ...
```

Nie zakładamy ograniczenia do jednego poziomu rodzic → dziecko.

---

## 3. Slug

`slug` jest technicznym identyfikatorem używanym w adresie URL.

Przykład:

```
Jan Kazimierz
```

może mieć:

```
jan-kazimierz
```

Slug nie jest podstawowym polem, które użytkownik musi ręcznie wprowadzać.

Dla MVP slug powinien być generowany automatycznie na podstawie tytułu.

Docelowy adres strony może mieć postać:

```
/opowiesc/monety-polskie/jan-kazimierz
```

Przy hierarchii wielopoziomowej ścieżka URL może odzwierciedlać strukturę drzewa.

---

## 4. Kolejność stron

Użytkownik musi mieć możliwość zmiany kolejności stron w obrębie tego samego poziomu drzewa.

Do tego służy:

```
sort_order
```

Zmiana kolejności nie zmienia struktury drzewa.

Na początkowym etapie wystarczą akcje:

```
↑
↓
```

Drag & drop dla kolejności stron może zostać dodany później, jeżeli będzie potrzebny.

---

## 5. Przenoszenie gałęzi

Użytkownik musi mieć możliwość przenoszenia całych gałęzi do innych gałęzi.

Przykład:

```
Monety Polskie
└── Wazowie
    └── Jan Kazimierz
        ├── Szóstaki
        └── Ort-y
```

może zostać przeniesione tak, aby:

```
Monety Polskie
└── Jagiellonowie
    └── Jan Kazimierz
        ├── Szóstaki
        └── Ort-y
```

Przeniesienie całej gałęzi oznacza zmianę `parent_id` tylko dla najwyższego przenoszonego elementu.

Dzieci i dalsi potomkowie pozostają przy nim.

Przy przenoszeniu backend musi zweryfikować:

1. czy docelowy rodzic istnieje,
2. czy element nie jest przenoszony do samego siebie,
3. czy element nie jest przenoszony do własnego poddrzewa,
4. czy w nowym miejscu nie występuje konflikt nazwy/slug,
5. czy operacja nie tworzy cyklu.

Założenie:

> przeniesienie całej gałęzi jest możliwe, jeżeli nie występuje konflikt nazwy najwyższego przenoszonego poziomu w miejscu docelowym.

---

## 6. Markdown

Do renderowania Markdown zostanie użyty:

```
markdown-it
```

Markdown będzie przechowywany bezpośrednio w `story_page.content`.

Nie przechowujemy wygenerowanego HTML.

HTML w Markdown może być wyłączony.

Nie należy wymagać `<br>` do tworzenia pustych linii.

Standardowy Markdown:

```md
Pierwszy akapit.

Drugi akapit.
```

tworzy dwa osobne akapity.

Twarde przejście do nowej linii można uzyskać poprzez:

```md
Pierwsza linia\
Druga linia
```

albo przez dwie spacje na końcu pierwszej linii.

Raw HTML pozostaje wyłączony.

Nie należy używać `v-html` jako mechanizmu renderowania całej treści strony.

---

## 7. Osadzanie monet w Markdown

Moneta będzie referencją do istniejącego rekordu katalogu.

Markdown nie będzie zawierał kopii danych monety.

Proponowana składnia:

```
{{ coin:123 }}
```

gdzie `123` jest ID istniejącej monety.

Jedna moneta może występować na wielu stronach.

Zmiana danych monety w katalogu powinna być automatycznie widoczna we wszystkich miejscach, w których moneta została osadzona.

---

## 8. API strony i osadzone monety

Frontend powinien otrzymywać Markdown oraz dane monet potrzebnych do jego renderowania.

Aktualna odpowiedź API zawiera pola strony bezpośrednio oraz listę `embedded_coins`:

```json
{
  "id": 10,
  "title": "Jan Kazimierz",
  "slug": "jan-kazimierz",
  "parent_id": 4,
  "content": "...",
  "embedded_coins": [
    {
      "id": 123,
      "coin": {
        "id": 123,
        "images": []
      },
      "deleted": false
    }
  ]
}
```

Backend wyciąga unikalne ID z `{{ coin:id }}` w kolejności wystąpienia i pobiera potrzebne monety jednym zapytaniem. Dla brakującej albo usuniętej monety zwracane jest `coin: null` i `deleted: true`.

Nie należy umieszczać pełnych danych monet w Markdown.

Renderer ma korzystać z przekazanych danych oraz istniejących komponentów/funkcji aplikacji.

---

## 9. Usuwanie monet osadzonych w Opowieści

Monety mogą zostać trwale usunięte.

Jeżeli moneta została usunięta, jej referencja:

```
{{ coin:123 }}
```

pozostaje w Markdown.

Nie należy automatycznie modyfikować Markdown tylko dlatego, że usunięto monetę.

Renderer powinien pokazać wyraźny marker informujący, że moneta została usunięta.

Przykładowo:

```
⚠ Moneta została usunięta
ID: 123
```

W trybie edycji można zaoferować użytkownikowi akcję:

```
Usuń referencję
```

ale referencja nie powinna znikać automatycznie.

API może reprezentować usunięte odwołanie jako:

```json
{
  "coin": null,
  "deleted": true
}
```

---

## 10. Renderer Opowieści

Powinien powstać osobny renderer, np.:

```
StoryRenderer.vue
```

Jego zadaniem jest połączenie:

```
Markdown
    ↓
markdown-it
    ↓
standardowe elementy Markdown
    +
niestandardowe elementy Opowieści
```

Przykładowe niestandardowe elementy:

```
{{ coin:123 }}
{{ image:17 }}
```

Renderer monet powinien korzystać z istniejących komponentów katalogu zamiast tworzyć drugi system prezentacji monet.

W szczególności należy ponownie wykorzystać istniejący:

```
CoinImage.vue
```

oraz istniejące dane/API i elementy widoku monet.

---

## 11. Wyświetlanie osadzonej monety

Dla osadzonej monety należy wykorzystać istniejącą funkcjonalność katalogu.

Karta osadzonej monety może prezentować m.in.:

- awers,
- rewers,
- nazwę/opis,
- datę,
- kraj,
- emitenta,
- nominał,
- numer kolekcji,
- inne istniejące informacje katalogowe, które są już dostępne.

Osadzona moneta powinna zawierać przejście do istniejącego widoku szczegółów monety.

Nie należy tworzyć niezależnego modelu danych dla monet osadzonych w Opowieści.

---

## 12. Wybieranie monet do osadzenia

Picker monet w Opowieści musi mieć dwa wzajemnie wykluczające się tryby.

### Tryb 1 — Katalog

Użytkownik wyszukuje monety z wykorzystaniem istniejącego wyszukiwania/filtrowania katalogu.

Nie należy tworzyć osobnego systemu wyszukiwania tylko dla Opowieści.

Należy wykorzystać istniejący mechanizm wyszukiwania, filtrów i pobierania monet.

### Tryb 2 — Aktualne wyniki z widoku „Monety”

Użytkownik może najpierw przejść do widoku:

```
Monety
```

i użyć istniejącego wyszukiwania oraz filtrów, aby ustawić aktualny zakres wyników.

Nie musi zaznaczać pojedynczych monet ani zmieniać interfejsu widoku `Monety`.

W pickerze Opowieści powinien wtedy być dostępny tryb:

```
Aktualne wyniki z widoku Monety
```

W tym trybie picker ponownie pobiera monety z wykorzystaniem aktualnie zastosowanego zakresu wyszukiwania/filtrowania z widoku `Monety`.

To jest wybór:

```
Katalog
ALBO
Aktualne wyniki z widoku Monety
```

a nie połączenie obu źródeł.

---

## 13. Aktualny zakres z widoku „Monety”

Istniejący widok `Monety` pozostaje bez zmian wizualnych i funkcjonalnych.

Zakres przekazywany do pickera Opowieści jest definiowany przez istniejące:

- wyszukiwanie,
- filtry,
- sortowanie,
- inne istniejące kryteria katalogu.

Nie należy dodawać checkboxów, przycisków ani osobnego trybu zaznaczania monet w widoku `Monety`.

Do przekazania aktualnego zakresu pomiędzy widokiem `Monety` i pickerem Opowieści można wykorzystać frontendowy composable, np.:

```
useStoryCoinCatalogScope()
```

z tymczasowo przechowywanym zapytaniem filtrującym.

Stan jest tylko in-memory — bez zapisu w bazie, localStorage i bez umieszczania listy ID w URL.

---

## 14. Assets / obrazy w Opowieści

Użytkownik posiada:

- mapy,
- inne obrazy,
- materiały ilustracyjne,

które powinny być możliwe do wykorzystania w Opowieści.

Assets powinny być osobnym zasobem Opowieści.

Proponowana struktura:

```
data/
└── story/
    └── assets/
```

Pliki będą przechowywane w filesystemie.

Metadata assetów będą przechowywane w SQLite.

Proponowany model:

```
story_asset
    id
    filename
    original_filename
    mime_type
    file_size_bytes
    width
    height
    alt_text
    created_at
```

---

## 15. Osadzanie assetów

Asset nie będzie referencjonowany bezpośrednią ścieżką filesystemu.

Proponowana składnia Markdown:

```
{{ image:17 }}
```

gdzie `17` jest ID assetu.

Dzięki temu asset może być używany na wielu stronach.

---

## 16. Upload assetów — istniejący mechanizm drag & drop

Do dodawania i edycji assetów należy wykorzystać **istniejący mechanizm drag & drop używany w formularzu dodawania/edycji monet**.

Nie należy tworzyć drugiego, niezależnego komponentu obsługi drag & drop dla assetów.

Istniejący komponent:

```
frontend/src/components/CoinImageDropZone.vue
```

ma zostać ponownie wykorzystany lub rozszerzony w sposób pozwalający na wspólne użycie.

Obecny mechanizm obsługuje:

- drag & drop,
- wklejanie przez `Ctrl+V`,
- podgląd obrazu,
- obsługę pojedynczego pliku,
- obsługę wielu plików,
- czyszczenie obrazu,
- lokalne preview przez `URL.createObjectURL()`.

Obecna implementacja akceptuje:

```
image/jpeg
```

czyli JPG.

Jeżeli wymagania dotyczące typów assetów zostaną w przyszłości rozszerzone, należy rozszerzyć wspólny mechanizm, a nie tworzyć osobną implementację tylko dla Opowieści.

---

## 17. UI assetów

W Opowieści powinien istnieć modal/picker assetów z możliwością:

- dodania assetu,
- wyboru istniejącego assetu,
- podglądu miniaturek,
- wyświetlenia większego podglądu,
- wyświetlenia nazwy pliku,
- określenia tekstu alternatywnego,
- wstawienia assetu do Markdown.

Dodawanie nowych plików powinno wykorzystywać istniejący mechanizm:

```
CoinImageDropZone
```

zamiast tworzenia nowego komponentu dropzone.

---

## 18. Struktura UI Opowieści

Proponowana struktura modułu:

```
Opowieść
├── drzewo stron
├── widok strony
└── edytor strony
```

### Drzewo

Powinno pokazywać hierarchię stron z dowolną liczbą poziomów.

Przykładowo:

```
Monety Polskie
  Piastowie
    Mieszko I
    Bolesław Chrobry
    Mieszko II
  Jagiellonowie
  Wazowie
    Jan Kazimierz
      Szóstaki
      Ort-y
```

Drzewo powinno pozwalać na:

- przejście do strony,
- wybór strony do edycji,
- dodawanie strony,
- zmianę kolejności,
- przenoszenie gałęzi.

---

## 19. Widok czytelnika

Widok strony powinien zawierać:

- breadcrumb,
- drzewo/nawigację Opowieści,
- wyrenderowaną treść Markdown,
- osadzone monety,
- osadzone assety.

Treść powinna być renderowana przez `markdown-it` oraz mechanizm własnych embedów Opowieści.

---

## 20. Edytor strony

Edytor powinien umożliwiać:

- zmianę tytułu,
- wybór rodzica,
- zmianę zawartości Markdown,
- podgląd wyrenderowanej strony,
- dodawanie referencji do monet,
- dodawanie referencji do assetów.

Na desktopie preferowany jest widok dzielony:

```
┌───────────────────────┬───────────────────────┐
│ Markdown              │ Podgląd               │
│                       │                       │
│ tekst                 │ wyrenderowana strona  │
│ {{ coin:123 }}        │ [moneta]              │
│                       │                       │
└───────────────────────┴───────────────────────┘
```

Na urządzeniach mobilnych można zastosować zakładki:

```
[Markdown] [Podgląd]
```

---

## 21. Ponowne wykorzystanie istniejącej funkcjonalności

Najważniejsza zasada implementacyjna:

> `Opowieść` ma być osobnym modułem, ale ma wykorzystywać istniejące elementy aplikacji zamiast duplikować ich funkcjonalność.

Dotyczy to przede wszystkim:

- wyszukiwania monet,
- filtrowania monet,
- pobierania monet,
- wyświetlania monet,
- zdjęć monet,
- `CoinImage.vue`,
- `CoinImageDropZone.vue`,
- istniejącego mechanizmu formularza monet,
- istniejącego mechanizmu nawigacji do szczegółów monety.

Nie należy tworzyć odpowiedników typu:

```
StoryCoinSearch
StoryCoinGrid
StoryCoinImage
```

jeżeli ich odpowiedzialność może zostać zrealizowana przez istniejące komponenty i mechanizmy.

Nowe komponenty `Story*` powinny przede wszystkim łączyć istniejącą funkcjonalność w kontekście Opowieści.

---

## 22. Proponowany podział komponentów

Proponowane komponenty modułu:

```
frontend/src/components/
    StoryTree.vue
    StoryEditor.vue
    StoryRenderer.vue
    StoryCoinEmbed.vue
    StoryCoinPicker.vue
    StoryAssetPicker.vue
```

oraz widoki:

```
frontend/src/views/
    StoryView.vue
    StoryEditView.vue
```

Nazwy są propozycją struktury implementacyjnej; przed implementacją należy sprawdzić istniejącą strukturę repozytorium i dopasować rozwiązanie do aktualnych komponentów.

---

## 23. Proponowana struktura backendu

Backend pozostaje zgodny z istniejącą architekturą:

```
FastAPI
    ↓
SQLAlchemy
    ↓
SQLite
```

Proponowane elementy:

```
backend/src/coin_catalog/
    models.py
    schemas.py
    routes/story.py
```

Dokładny podział należy dopasować do istniejącej struktury backendu.

Logika biznesowa nie powinna być umieszczana bezpośrednio w route handlerach, jeżeli może być wydzielona zgodnie z istniejącą architekturą.

---

## 24. Model danych — Opowieść

### `story_page`

```
id
parent_id
title
slug
content
sort_order
created_at
updated_at
```

Wymagania:

- `parent_id` może być `NULL`,
- strony mogą tworzyć dowolnie głębokie drzewo,
- nie można utworzyć cyklu,
- nie można wskazać samego siebie jako rodzica,
- `sort_order` określa kolejność rodzeństwa,
- slug/nazwa nie mogą powodować konfliktu w miejscu docelowym.

### `story_asset`

```
id
filename
original_filename
mime_type
file_size_bytes
width
height
alt_text
created_at
```

Plik assetu pozostaje na filesystemie.

Metadata pozostają w SQLite.

---

## 25. Assety a filesystem

Assety powinny być przechowywane jako pliki poza bazą danych.

Baza przechowuje metadata i referencję do pliku.

Proponowana lokalizacja:

```
data/story/assets/
```

Nie należy przechowywać dużych plików graficznych jako BLOB w SQLite.

---

## 26. Testy

Dla **każdej nowej funkcjonalności trzeba napisać test** — backend/frontend, end-to-end, itp. w zależności od potrzeby.

Zakres testów należy dobrać do rodzaju zmiany.

Nowa funkcjonalność backendowa powinna otrzymać odpowiednie testy backendowe.

Nowa funkcjonalność frontendowa powinna otrzymać odpowiednie testy frontendowe.

Funkcjonalność obejmująca zachowanie całej aplikacji lub przepływ użytkownika powinna otrzymać test end-to-end.

Jeżeli funkcjonalność wymaga więcej niż jednego poziomu testów, należy dodać odpowiednie testy na wszystkich potrzebnych poziomach.

Testy są częścią implementacji nowej funkcjonalności i nie są opcjonalnym krokiem wykonywanym później.

---

## 27. Przyszłe rozszerzenia

Nie są wymagane na pierwszym etapie:

- historia wersji stron,
- autosave,
- drag & drop stron w drzewie,
- dodatkowe typy embedów,
- rozbudowane formatowanie WYSIWYG,
- wersjonowanie treści,
- zaawansowany system assetów,
- inne mechanizmy poza aktualnym zakresem Opowieści.

Brak historii wersji jest świadomym wymaganiem.

---

## 28. Kolejność implementacji

### M1 — strony i hierarchia

Implementacja:

- `story_page`,
- migracja Alembic,
- CRUD stron,
- hierarchia o dowolnej głębokości,
- zmiana kolejności,
- przenoszenie całych gałęzi,
- walidacja cykli,
- konfliktów nazw/slugów,
- drzewo stron,
- podstawowy edytor,
- odpowiednie testy dla każdej nowej funkcjonalności.

### M2 — Markdown

Implementacja:

- `markdown-it`,
- renderer Markdown,
- `StoryRenderer`,
- obsługa `{{ coin:id }}`,
- podgląd Markdown,
- odpowiednie testy dla każdej nowej funkcjonalności.

### M3 — monety

Implementacja:

- pobieranie danych osadzonych monet — **M3.1 zaimplementowane**,
- `StoryCoinEmbed` — **M3.1 zaimplementowane**,
- wykorzystanie istniejących komponentów coin/image,
- picker monet — **M3.2 zaimplementowane**,
- tryb `Katalog` — **M3.2 zaimplementowane**,
- tryb `Aktualne wyniki z widoku Monety` — **M3.2 zaimplementowane**,
- przekazywanie aktualnego zakresu wyszukiwania/filtrowania z widoku `Monety` do pickera — **M3.2 zaimplementowane**,
- wstawianie referencji `{{ coin:id }}` do Markdown — **M3.2 zaimplementowane**,
- obsługa usuniętych monet — **M3.1 zaimplementowane**,
- odpowiednie testy dla każdej nowej funkcjonalności.

### M4 — assets

Implementacja:

- `story_asset`,
- filesystem `data/story/assets/`,
- upload,
- wykorzystanie istniejącego `CoinImageDropZone.vue`,
- picker assetów,
- miniaturki/podgląd,
- metadata,
- `{{ image:id }}`,
- renderowanie assetów w `StoryRenderer`,
- odpowiednie testy dla każdej nowej funkcjonalności.

---

## 29. Ogólny model modułu

```
Opowieść
│
├── Pages
│   └── SQLite
│
├── Assets
│   ├── SQLite — metadata
│   └── filesystem — pliki
│
└── Renderer
    │
    ├── markdown-it
    │
    ├── CoinEmbed
    │   └── istniejące dane/API/componenty monet
    │
    └── ImageEmbed
        └── Story Assets
```

---

## 30. Kluczowe zasady

1. Markdown stron przechowujemy w SQLite.
2. Nie tworzymy osobnych plików `.md` synchronizowanych z bazą.
3. Hierarchia stron może mieć dowolną liczbę poziomów.
4. Kolejność rodzeństwa przechowujemy przez `sort_order`.
5. Całą gałąź można przenieść poprzez zmianę `parent_id` jej najwyższego elementu.
6. Przenoszenie musi chronić przed cyklami i konfliktami.
7. Monety w Markdown są referencjami, np. `{{ coin:123 }}`.
8. Markdown nie zawiera danych monet.
9. Jedna moneta może być użyta na wielu stronach.
10. Usunięta moneta pozostawia referencję i pokazuje marker usunięcia.
11. Do Markdown używamy `markdown-it`.
12. Raw HTML może być wyłączony.
13. Puste linie realizujemy standardowym Markdown, bez potrzeby używania `<br>`.
14. Picker monet ma dwa wzajemnie wykluczające się tryby: `Katalog` albo `Aktualne wyniki z widoku Monety`.
15. Widok `Monety` pozostaje bez checkboxów i dodatkowych akcji związanych z Opowieścią; picker korzysta z jego aktualnego zakresu wyszukiwania/filtrowania.
16. Aktualny zakres jest przekazywany tymczasowo po stronie frontendu i nie jest przechowywany w bazie.
17. Assety są osobnymi zasobami.
18. Metadata assetów są w SQLite, pliki na filesystemie.
19. Assety są referencjonowane przez ID, np. `{{ image:17 }}`.
20. Dodawanie i edycja assetów wykorzystuje istniejący mechanizm drag & drop z formularza dodawania/edycji monet.
21. Należy ponownie wykorzystać `CoinImageDropZone.vue`, zamiast tworzyć drugi niezależny mechanizm drag & drop.
22. `Opowieść` jest osobnym modułem, ale nie może niepotrzebnie duplikować istniejącej funkcjonalności katalogu.
23. Nie ma potrzeby historii wersji.
24. Pierwsza implementacja powinna być wykonana etapami M1–M4.
25. Dla każdej nowej funkcjonalności trzeba napisać test — backend/frontend, end-to-end, itp. w zależności od potrzeby.
